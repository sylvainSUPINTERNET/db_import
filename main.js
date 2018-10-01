'use strict';

const log = console.log;

//SHELL COLOR
const colorizedWith = require('chalk');
/*
const inquirer = require('inquirer');
inquirer.prompt([]).then(answers => {
    // Use user feedback for... whatever!!
});
*/
// SHELL ASCII ART
const draw = require('figlet');

// ASCII
const imageToAscii = require("image-to-ascii");


draw(('MPEC - DB - IMPORT'), function(err, asciiArt) {
    if (err) {
        log(colorizedWith.red('Something went wrong...'));
        log(err);
        return 0;
    }
    log(asciiArt);
    // Passing options
    imageToAscii("./asset/logo.png", {
        colored: true,
        size: {
            height: 20,
        },
    }, (err, converted) => {
        if(err){
            log(err)
        } else {
            log("\n")
            log("\n")
            log(converted)
            log("\n")
            log("\n")

            //MENU display
            const menu = require('./ui');
        }
    });


});






