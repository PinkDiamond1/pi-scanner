#!/usr/bin/env node

/*
 * Pi Scanner CLI
 *
 */

'use strict'

var fs = require('fs');
var piIndexScan = require('./lib/indexScanner.js');
var piIndexBuilder = require('./lib/indexBuilder.js');

var defaults, command, query, digitsDir, digitsFile, indexDir;

var tasks = {
  print_help: function() {
    var exec_path = process.argv[1].split('/');
    var exec_name = exec_path[exec_path.length-1];
    console.log(
      "\n  USAGE:" +
      "\n    " + exec_name + " scan <digit string to search for> <optional: digit index directory> <optional: digits file>" +
      "\n   OR:" +
      "\n    " + exec_name + " index <optional: directory of digits text files> <optional: digit index directory> <optional: digits file>" +
      "\n" +
      "\n   * <directory of digits text files> defaults to ./digits/" +
      "\n   * <directory of digits indexes> defaults to ./index/" +
      "\n   * <digits file> defaults to ./pi-digits" +
      "\n   * appropriately formatted digits text files can be downloaded from http://piworld.calico.jp/estart.html" +
      "\n"
    );
  },

  scan_indexes: function(query, digitsFile, indexDir) {
    var t0 = new Date().getTime()
    piIndexScan.searchPiFor(query, indexDir, digitsFile, function(result) {
      console.log("Scanning indexes for sequence " + query);
      var td = (new Date().getTime() - t0) / 1000;
      if (result > -1) {
        console.log('Found sequence "' + query + '" in pi, starting after ' + String(result) + ' decimal places, in ' + String(td) + ' seconds.' );
      } else {
        var numIndexedDigits = fs.statSync(digitsFile).size * 2;
        console.log('Sequence "' + query + '" does not occur within the first ' + String(numIndexedDigits) + ' decimal places of pi. Querytime ' + String(td) + ' seconds.' );
      }
    });
  },

  build_indexes: function(digitsDir, digitsFile, indexDir) {
    piIndexBuilder.buildDigitIndexes(digitsDir, indexDir);
    piIndexBuilder.buildDigitsFile(digitsDir, digitsFile);
  }
}

defaults = {
  indexDir: "./index/",
  digitsFile: "./pi-digits",
  digitsDir: "./digits"
}

command = process.argv[2];

switch (command) {
  case 'scan':
    query = process.argv[3];
    indexDir = (process.argv[4] || defaults.indexDir);
    indexDir = (indexDir[indexDir.length-1] === '/' ? indexDir : indexDir + '/');
    digitsFile = (process.argv[5] || defaults.digitsFile);

    if (!query) {
      tasks.print_help();
      break;
    }
    if (!fs.existsSync(indexDir + "0")) {
      console.log('Error: Provided index directory appears invalid');
      break;
    }
    if (!fs.existsSync(digitsFile)) {
      console.log('Error: Provided digits file doesn\'t exist');
      break;
    }

    tasks.scan_indexes(query, digitsFile, indexDir);
    break;

  case 'index':
    digitsDir = (process.argv[3] || defaults.digitsDir);
    digitsDir = (digitsDir[digitsDir.length-1] === '/' ? digitsDir : digitsDir + '/');
    indexDir = (process.argv[4] || defaults.indexDir);
    indexDir = (indexDir[indexDir.length-1] === '/' ? indexDir : indexDir + '/');
    digitsFile = (process.argv[5] || defaults.digitsFile);

    // delete digitsFile if it exists
    if (fs.existsSync(digitsFile)) {
      fs.unlinkSync(digitsFile);
    }

    // delete existing index files
    for (var i = 0; i < 10; i++) {
      if (fs.existsSync(indexDir + String(i))) {
        fs.unlinkSync(indexDir + String(i));
      }
    }

    if (!fs.existsSync(digitsDir + "pi-0001.txt")) {
      console.log('Error: Provided digits directory appears invalid');
      break;
    }

    tasks.build_indexes(digitsDir, digitsFile, indexDir);
    break;

  default:
    tasks.print_help();
}
