'use strict'

var fs = require('fs'),
    readline = require('readline');


/*
 * This function is called by build_digit_indexes to read digits texts file one
 *  at a time off of state.inputPaths and append the 10 index files accordingly
 */
var append_digits_to_indexes = function(config, state, cb) {
  var rd = readline.createInterface({
      input: fs.createReadStream(state.inputPaths[0]),
      output: process.stdout,
      terminal: false
  });

  // read in digits of pi one line of 100 at a time
  rd.on('line', function(line) {
    var offset, i, digit;
    line = line.split(':')[0].replace(/\s/g, '');
    for(i = 0; i < 100; i++) {
      digit = line[i];
      offset = state.globalOffset - state.digitOffsets[digit];
      state.digitOffsets[digit] = state.globalOffset;
      state.digitBuffers[digit].push(offset);

      // write the digitBuffers out to the index files when they get full
      if (state.digitBuffers[digit].length >= config.bufferSize) {
        fs.appendFileSync(config.indexDir + digit, new Buffer(state.digitBuffers[digit]));
        state.digitBuffers[digit] = [];
      }
      state.globalOffset += 1;
    }
  });

  // when an input file is exhausted, recurse with the next one,
  //  until inputPaths is empty
  rd.on('close', function(){
    var i, digit;
    if (state.inputPaths.length > 1) {
      state.inputPaths = state.inputPaths.slice(1);
      append_digits_to_indexes(config, state, cb);
    } else {
      // write out remainder of each buffer
      for (i = 0; i < 10; i++) {
        digit = String(i);
        if (state.digitBuffers[digit].length) {
          fs.appendFileSync(config.indexDir + digit, new Buffer(state.digitBuffers[digit]));
        }
      }
      if (cb) {
        cb();
      }
    }
  });
};


/*
 * The build_digit_indexes reads the digit text files in order from the input
 *  directory and builds up the 10 index files (for for each digit), in the
 *  index directory.
 */
var build_digit_indexes = function(inputDir, indexDir) {

  // format inputDir path
  inputDir = (inputDir[inputDir.length-1] === '/' ? inputDir : inputDir + '/');

  // ensure indexDir exists
  if(!fs.existsSync(indexDir)) {
    fs.mkdirSync(indexDir);
  }

  // global state tracking for all indexes
  var config = {
    indexDir: indexDir,
    bufferSize: 1000000
  };
  var state = {
    globalOffset: 0,
    digitOffsets: {},
    digitBuffers: {},
    inputPaths: []
  };

  var i, padding, nextInputPath, digit;
  // compose array of input files and prepare other state tracking objects
  for (i = 1; i <= 9999; i++) {
    padding = '';
    while (padding.length < 4 - String(i).length) { padding += '0'; }
    nextInputPath = inputDir + "pi-" + padding + String(i) + ".txt";
    if (fs.existsSync(nextInputPath)) {
      state.inputPaths.push(nextInputPath);
      state.digitOffsets[String(i-1)] = 0;
      state.digitBuffers[String(i-1)] = [];
    } else {
      break;
    }
  }

  for (i = 1; i <= 10; i++) {
    digit = String(i-1);
    state.digitOffsets[digit] = 0;
    state.digitBuffers[digit] = [];
  }

  config.num_input_files = state.inputPaths.length;

  var t0 = new Date().getTime();
  append_digits_to_indexes(config, state, function() {
    var td = (new Date().getTime() - t0) / 1000;
    console.log('Indexed ' + String(config.num_input_files) + ' input files in ' + td + ' seconds.');
  });
};


/*
 *
 */
var build_digits_file = function(inputDir, outputFile) {

  // format inputDir path
  inputDir = (inputDir[inputDir.length-1] === '/' ? inputDir : inputDir + '/');

  // global state tracking
  var bufferSize = 1000000,
      outputBuffer = [],
      inputPaths = [],
      num_input_files,
      padding, nextInputPath;


  // compose array of input files
  for (var i = 1; i <= 9999; i++) {
    padding = '';
    while (padding.length < 4 - String(i).length) { padding += '0'; }
    nextInputPath = inputDir + "pi-" + padding + String(i) + ".txt";
    if (fs.existsSync(nextInputPath)) {
      inputPaths.push(nextInputPath);
    } else {
      break;
    }
  }

  num_input_files = inputPaths.length

  var process_next_input_file = function(cb) {
    var rd = readline.createInterface({
        input: fs.createReadStream(inputPaths.shift()),
        output: process.stdout,
        terminal: false
    });

    // read in digits of pi one line of 100 at a time
    rd.on('line', function(line) {
      var i;
      line = line.split(':')[0].replace(/\s/g, '');

      for(i = 0; i < line.length/2; i++) {
        outputBuffer.push((parseInt(line[i*2]) << 4) + parseInt(line[i*2+1]));
      }

      if (outputBuffer.length >= bufferSize) {
        fs.appendFileSync(outputFile, new Buffer(outputBuffer));
        outputBuffer = [];
      }

    });

    rd.on('close', function() {
      var i, digit;

      if (inputPaths.length) {
        process_next_input_file(cb);
      } else {
        // write out remainder of the buffer
        if (outputBuffer.length) {
          fs.appendFileSync(outputFile, new Buffer(outputBuffer));
        }
        if (cb) {
          cb();
        }
      }
    });
  };

  var t0 = new Date().getTime();
  process_next_input_file(function(){
    var td = (new Date().getTime() - t0) / 1000;
    console.log('Wrote out ' + String(num_input_files * 100000000) + ' digits in ' + td + ' seconds.');
  });
};


exports.buildDigitIndexes = build_digit_indexes;
exports.buildDigitsFile = build_digits_file;
