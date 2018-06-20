'use strict';

const log = console.log;

//SHELL COLOR
const colorizedWith = require('chalk');
// SHELL UI
const inquirer = require('inquirer');
inquirer.prompt([/* Pass your questions in here */]).then(answers => {
    // Use user feedback for... whatever!!
});
// SHELL ASCII ART
const draw = require('figlet');




// ASCII
draw(('MPEC - DB - IMPORT'), function(err, asciiArt) {
    if (err) {
        log(colorizedWith.red('Something went wrong...'));
        log(err);
        return 0;
    }
    log(asciiArt)


    //MENU display
    const menu = require('./ui');
});






