'use strict';

const emoji = require('node-emoji')
const log = console.log;

//TAR - FS
const fs = require('fs');
const join = require('path').join;

//CRYPT
const shell = require('shelljs');
const config_decrypt = require('./config/decrypt_config');


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
const yesno = require('yesno');


//ARGS / OPTIONS
let arg = process.argv[2];
let option = process.argv[3];




//get Frist key of dump in bucket
function getFirstKey(dumpsList){
    let firstKeyDump = dumpsList[3];
    return firstKeyDump;
}



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

        //SORT item from bucket by modified value
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
        choices.push("My last update ?");


        if(arg === "--update" || arg === "--lastest"){

            let firstKeyInDumpsList = choices[3];// 0 -> separator 1-> exit 2->separator 3->first dumps IF err -> no dumps
            try {
                if(!getFirstKey(choices)){
                    throw getFirstKey(choices)
                }
            }
            catch(error) {
                log( colorizedWith.red(" Error: Aucun dumps trouvés, checker votre bucket"))
                shell.exit(1);
            }

            // SHORTCUT
            log(colorizedWith.green(" > Last dump uploaded : " + firstKeyInDumpsList))
            let params = {Bucket: aws_config.bucket, Key: firstKeyInDumpsList};
            let file = fs.createWriteStream(join(__dirname,'dumps', "compress",firstKeyInDumpsList)); //encrypt file

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

                    log(colorizedWith.green("Decrypt archive > Please waiting . . . "));


                    //TODO: remove hardcoding encrypt / decrypt / path for extract in the exec by variables above
                    //TODO: use password from container ENV var instead pass from this config
                    //TODO: nom de la table est static, mais elle devra etre aussi dynamique (par defaut pour le test -> mpec), au moment du run sur le script db_import.sh

                    let archiveEncrypt = firstKeyInDumpsList;
                    let archiveDecrypted = firstKeyInDumpsList.replace('.enc', '');
                    let folder = archiveDecrypted.replace('.tar.bz2', '');
                    let pass = config_decrypt.decrypt_pass;


                    if(shell.exec(`openssl aes-256-cbc -d -a -in ./dumps/compress/mpec_mpec-mdb2-01.maplaceencreche.com_2018-06-11_11H34.tar.bz2.enc -out ./dumps/compress/mpec_mpec-mdb2-01.maplaceencreche.com_2018-06-11_11H34.tar.bz2 -pass pass:${pass}`).code !==0 ){
                        shell.echo(colorizedWith.red(" Error: openssl, something wrong happend with the decrypt for your archive"));
                        shell.exit(1);
                    } else {

                        shell.echo(colorizedWith.yellow(' Archive decrypted with succes ') + emoji.get('white_check_mark'));
                        shell.echo(colorizedWith.green(' > Uncompress archive . . .'));
                        if(shell.exec('tar -xjvf ./dumps/compress/mpec_mpec-mdb2-01.maplaceencreche.com_2018-06-11_11H34.tar.bz2 -C ./dumps/uncompress').code !== 0){
                            shell.echo(colorizedWith.red(" Error: extract archive failed."));
                            shell.exit(1);
                        } else {
                            shell.echo(colorizedWith.yellow(" Archive extracted with success ! ")  + emoji.get('white_check_mark'));
                            shell.echo(colorizedWith.green(" > Import the database . . ."));


                            if(option === "--drop"){
                                //DELETE CURRENT mpec DB
                                if(shell.exec(`mongo mpec --eval "printjson(db.dropDatabase())"`).code !== 0){
                                    shell.echo(colorizedWith.red(" Error: Drop current db failed."));
                                    shell.exit(1)
                                } else {
                                    shell.echo(colorizedWith.bgRed(" > Delete DB mod activated, current db will be erased"));
                                    if(shell.exec('sh db_import.sh ./dumps/uncompress/mpec_mpec-mdb2-01.maplaceencreche.com_2018-06-11_11H34/mpec').code !== 0){
                                        shell.echo(colorizedWith.red(" Error: Import db failed."));
                                        shell.exit(1)
                                    } else {
                                        shell.echo(colorizedWith.yellow("DB imported with success ! "  + emoji.get('white_check_mark') ));

                                        //UPDATE HISTORY FILE
                                        if(shell.exec(`node historyWriter.js ${firstKeyInDumpsList.replace('.enc', '')}`).code !== 0){
                                            shell.exit(1)
                                        }
                                    }
                                }
                            } else {
                                shell.echo(colorizedWith.bgRed(" > keep the current DB, if you want to delete and start from new, please enter option --drop"))
                                if(shell.exec('sh db_import.sh ./dumps/uncompress/mpec_mpec-mdb2-01.maplaceencreche.com_2018-06-11_11H34/mpec').code !== 0){
                                    shell.echo(colorizedWith.red(" Error: Import db failed."));
                                    shell.exit(1)
                                } else {
                                    shell.echo(colorizedWith.yellow("DB imported with success ! "  + emoji.get('white_check_mark') ));

                                    //UPDATE HISTORY FILE
                                    if(shell.exec(`node historyWriter.js ${firstKeyInDumpsList.replace('.enc', '')}`).code !== 0){
                                        shell.exit(1)
                                    }
                                }
                            }


                        }
                    }


                })
                .send();

        }else if(arg){
            if(arg !== "--update" || arg !== "--lastest" || arg !== "--drop"){
                log(colorizedWith.red("Error: Unknown args / options given."));
                shell.echo(" \n");
                shell.echo(" $ node main.js [ARG] [OPTIONS] \n");
                shell.echo(" NO ARG / OPTION > By default, manually choose delete/remove mod and display list of dump from S3\n");
                shell.echo(" > ARG :\n");
                shell.echo("    --update / --lastest : update your current database with the lastest dump \n");
                shell.echo(" > OPTIONS :\n");
                shell.echo("    --drop : drop database before import, if this option is not given, by default the db is updated only with the dump \n");
                shell.exit(1);
            }
        } else {
            yesno.ask(colorizedWith.cyan(`Do you want actived delete DB mod ? 
                \n\n ${emoji.get('white_check_mark')} yes -> db will removed automaticly and regenerated 
                \n\n ${emoji.get('x')} no -> db will be updated only  \n\n[y/n]`), true, function(responseDeleteMod) { //responseDeleteMod -> yes will delete

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
                        } else if(item.select === "My last update ?"){
                            fs.readFile(join(__dirname, "history", "update_history.txt" ), 'utf8', function (err,historyInfos) {
                                if (err) {
                                    log(colorizedWith.red( "Error " + err))
                                    shell.exit(1);
                                } else {
                                    log(colorizedWith.cyan( ` Last dump donwloaded => ${historyInfos}`));
                                    shell.exit(1);
                                }
                            });

                        } else {


                            log(colorizedWith.cyan(" Download tar.gz >>> " + item.select + " [ENCRYPTED] . . ."));
                            let params = {Bucket: aws_config.bucket, Key: item.select};
                            let file = fs.createWriteStream(join(__dirname,'dumps', "compress",item.select)); //encrypt file

                            // DONWLOAD enc + decrypt + EXTRACT

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

                                    log(colorizedWith.green("Decrypt archive > Please waiting . . . "));


                                    //TODO: remove hardcoding encrypt / decrypt / path for extract in the exec by variables above
                                    //TODO: use password from container ENV var instead pass from this config
                                    //TODO: nom de la table est static, mais elle devra etre aussi dynamique (par defaut pour le test -> mpec), au moment du run sur le script db_import.sh
                                    let archiveEncrypt = item.select;
                                    let archiveDecrypted = item.select.replace('.enc', '');
                                    let folder = archiveDecrypted.replace('.tar.bz2', '');
                                    let pass = config_decrypt.decrypt_pass;

                                    if(shell.exec(`openssl aes-256-cbc -d -a -in ./dumps/compress/mpec_mpec-mdb2-01.maplaceencreche.com_2018-06-11_11H34.tar.bz2.enc -out ./dumps/compress/mpec_mpec-mdb2-01.maplaceencreche.com_2018-06-11_11H34.tar.bz2 -pass pass:${pass}`).code !==0 ){
                                        shell.echo(colorizedWith.red(" Error: openssl, something wrong happend with the decrypt for your archive"));
                                        shell.exit(1);
                                    } else {

                                        shell.echo(colorizedWith.yellow(' Archive decrypted with succes ') + emoji.get('white_check_mark'));



                                        shell.echo(colorizedWith.green(' > Uncompress archive . . .'));
                                        if(shell.exec('tar -xjvf ./dumps/compress/mpec_mpec-mdb2-01.maplaceencreche.com_2018-06-11_11H34.tar.bz2 -C ./dumps/uncompress').code !== 0){
                                            shell.echo(colorizedWith.red(" Error: extract archive failed."));
                                            shell.exit(1);
                                        } else {
                                            shell.echo(colorizedWith.yellow(" Archive extracted with success ! ")  + emoji.get('white_check_mark'));
                                            shell.echo(colorizedWith.green(" > Import the database . . ."));


                                            if(responseDeleteMod){
                                                shell.echo(colorizedWith.bgRed(" > Run as remove DB mod, the current DB will deleted"))
                                                if(shell.exec(`mongo mpec --eval "printjson(db.dropDatabase())"`).code !== 0){
                                                    shell.echo(colorizedWith.red(" Error: Drop current db failed."));
                                                    shell.exit(1)
                                                }else{
                                                    if(shell.exec('sh db_import.sh ./dumps/uncompress/mpec_mpec-mdb2-01.maplaceencreche.com_2018-06-11_11H34/mpec').code !== 0){
                                                        shell.echo(colorizedWith.red(" Error: Import db failed."));
                                                        shell.exit(1)
                                                    } else {
                                                        shell.echo(colorizedWith.yellow("DB imported with success ! "  + emoji.get('white_check_mark') ));

                                                        //UPDATE HISTORY FILE
                                                        if(shell.exec(`node historyWriter.js ${item.select.replace('.enc', '')}`).code !== 0){
                                                            shell.exit(1)
                                                        }
                                                    }
                                                }

                                            } else {
                                                shell.echo(colorizedWith.bgRed(" > Run as NON remove DB mod, the current DB will only updated"))
                                                if(shell.exec('sh db_import.sh ./dumps/uncompress/mpec_mpec-mdb2-01.maplaceencreche.com_2018-06-11_11H34/mpec').code !== 0){
                                                    shell.echo(colorizedWith.red(" Error: Import db failed."));
                                                    shell.exit(1)
                                                } else {
                                                    shell.echo(colorizedWith.yellow("DB imported with success ! "  + emoji.get('white_check_mark') ));

                                                    //UPDATE HISTORY FILE
                                                    if(shell.exec(`node historyWriter.js ${item.select.replace('.enc', '')}`).code !== 0){
                                                        shell.exit(1)
                                                    }
                                                }
                                            }


                                        }
                                    }


                                })
                                .send();
                        }
                    })
                    .catch(err =>
                        log(colorizedWith.red(err)));

            });

        }

    }

});







