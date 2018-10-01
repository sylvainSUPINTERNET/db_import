'use strict';



const fs = require('fs');
const join = require('path').join;

let dumpSelected = process.argv[2];



fs.writeFile(join(__dirname, "history", "update_history.txt"), dumpSelected + " : " + new Date().toString() , (err) => {
    if(err){
        console.log(" Error : " + err)
    } else {
        // success case, the file was saved
        console.log(' History > Updated !');
    }

});