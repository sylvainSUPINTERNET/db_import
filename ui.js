'use strict';

const emoji = require('node-emoji')
const log = console.log;
const sleep = require('sleep');


//ZIP - FS
const fs = require('fs');
const join = require('path').join;

//shell script
const exec = require('child_process').exec;
const extract = require('extract-zip');

/* AWS */
const AWS = require('aws-sdk');
const aws_config = require('./config/AWS');
AWS.config.update({
    accessKeyId: aws_config.credentials.accessKeyId,
    secretAccessKey: aws_config.credentials.secretAccessKey
});
let s3 = new AWS.S3();
let bucketConfig = {
    Bucket: aws_config.bucket,
    MaxKeys: aws_config.maxKeyPerRequest,
};

//SHELL COLOR
const colorizedWith = require('chalk');
// SHELL UI
const inquirer = require('inquirer');
let prompt = inquirer.createPromptModule();



// Build  menu
s3.listObjects(bucketConfig, function(err, dumps) {

        if(err){
            log(err);
            log(err.stack);
            return 0;
        } else {

            // MENU items
            let choices = [];

            //EXIT choice
            choices.push(new inquirer.Separator(),"Exit",new inquirer.Separator());

            dumps.Contents.sort(function(a,b) {
                return (b.LastModified > a.LastModified) ? 1 :
                    ((a.LastModified > b.LastModified) ? -1 : 0);
            });

            // S3 dumps items
            let dumpsKeys = dumps.Contents.map(dump => dump.Key);
            for(let key in dumpsKeys){
                choices.push(dumpsKeys[key]);
            }

            // END list of choice
            choices.push(new inquirer.Separator())


            // MENU + select items
            prompt({
                type:'list',
                message:'Action :',
                name:"select",
                choices:choices
            })
                .then(function(item){
                    if(item.select === "Exit"){
                        log(colorizedWith.cyan(" Bye !"));
                        return 0;
                    } else {
                        log(colorizedWith.cyan(" Download zip >>> " + item.select + " . . ."));
                        let params = {Bucket: aws_config.bucket, Key: item.select};
                        let file = fs.createWriteStream(join(__dirname,'dumps', "zip",item.select));

                        // DONWLOAD + EXTRACT
                        s3.getObject(params)
                            .on('error', function(err) {
                                log(colorizedWith.red(err, err.stack))
                            })
                            .on('httpData', function(chunk) {
                                log(chunk.toString('hex'));
                                log(colorizedWith.green(" > collecting data from bucket" + aws_config.bucket));
                                file.write(chunk);
                             })
                            .on('httpDone', function() {
                                file.end();
                                log(colorizedWith.yellow(" Donwload completed " + emoji.get('white_check_mark')));

                                // EXTRACT
                                log(colorizedWith.green("Extracting > Please wait 5 seconds before start extracting "));
                                sleep.sleep(5); //break waiting synchro of zip
                                log(colorizedWith.green(`Extracting > ${join(__dirname,'dumps', "zip",item.select)}`));


                                extract(join(__dirname, "dumps","zip",item.select), {dir: join(__dirname, "dumps","unzip")}, function (err) {
                                    if(err){
                                        log(colorizedWith.red("ERROR EXTRACT", err, err.stack));
                                    } else {
                                        log(colorizedWith.green("Extracting > completed with success " + emoji.get('white_check_mark')))

                                        // RUN my_S3_db_import
                                        log(colorizedWith.yellow(" import db ..."));
                                        let dumpToImport = item.select.substr(0, item.select.lastIndexOf('.'));
                                        log(colorizedWith.magenta(" dump target > " + dumpToImport));
                                        log(colorizedWith.magenta(" it will take few minutes, please waiting ... " ) + emoji.get('coffee'));


                                        let dbImportScript = exec(`sh db_import.sh ${join(__dirname, "dumps", "unzip",dumpToImport,"mpec" )}`,
                                            (error, stdout, stderr) => {
                                                console.log(`${stdout}`);
                                                console.log(`${stderr}`);
                                                if (error !== null) {
                                                    console.log(`exec error: ${error}`);
                                                }
                                            });
                                    }
                                })

                            })
                            .send();
                    }
                })
                .catch(err =>
                    log(colorizedWith.red(err)));
        }

    });







