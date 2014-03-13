'use strict'

var fs = require('fs');


/*
 * The IndexInterface class abstracts around the digit indexes,
 *  these index files each index every position of a particular digit,
 *  digit positions are encoded as a series of 8-bit integers such that the nth
 *  occurence of a given digit ('0' for instance) is encoded as the sum of the
 *  first n-1 8-bit integer values in the index file for that digit.
 */
var IndexInterface = (function() {
  // constructor
  function IndexInterface(indexFile, bufferSize) {
    var me = this;
    this.indexFile = indexFile;
    this.bufferSize = bufferSize !== 'undefined' && bufferSize > 1000000 ? bufferSize : 1000000;
    this.stream = fs.createReadStream(this.indexFile);
    this.buffer = new Buffer(0);

    this.cursor = 0;    // for tracking position along the current buffer contents
    this.distance = 0;  // for tracking position along the index
    this.tally = 0;     // sum of all values so far, i.e. that actual current value
    this.exhausted = false;

    this.stream.on('end', function () {
      me.exhausted = true;
    });
  }

  // fires the callback when there is data ready for use
  IndexInterface.prototype.onReady = function(cb, final_cb) {
    var waitLoop, me;
    if (this.cursor < this.buffer.length) {
      // doesn't seem to be neccessary to rebuffer just now
      setTimeout(function(){ cb(final_cb) });
    } else if (this.exhausted) {
      console.log('Index stream exhausted');
      final_cb(-1);
    } else {
      me = this;
      waitLoop = setInterval(function(){
        var new_data;
        if (new_data = me.stream.read(me.bufferSize)) {
          clearInterval(waitLoop);
          me.buffer = new_data;
          me.cursor = 0;
          cb(final_cb);
        }
      });
    }
  };

  // steps one byte along the index, returns the result
  IndexInterface.prototype.step = function() {
    // assumes the buffer is ready for reading
    var value = this.buffer[this.cursor];
    this.cursor += 1;
    this.distance += 1;
    return this.tally += value;
  };

  return IndexInterface;
})();


/*
 * The halfByteInterface class provides an abstraction for dealing streaming and
 * scanning the digits file which is encoded packing two decimal digits into
 * each byte.
 */
var halfByteInterface = (function() {
  function halfByteInterface(path, bufferSize) {
    var me = this;
    this.path = path;
    this.bufferSize = bufferSize !== 'undefined' && bufferSize > 1000000 ? bufferSize : 1000000;
    this.stream = fs.createReadStream(this.path);
    this.buffer = new Buffer(0);
    this.bufferPosition = 0; // poisition of buffer in file
    this.exhausted = false;

    this.stream.on('end', function() {
      me.exhausted = true;
    });
  };

  halfByteInterface.prototype.matchingBytes = function(position, query, oddLength) {
    // returns the number of bytes from the query that match the stream at this
    //  position. The position is given in digits, rather than bytes.
    // The caller must tailor the query to account for halfbyte issues,
    //  given the first halfbyte value is known.
    var start_position = (position / 2) - this.bufferPosition,
        i = 0;

    while(this.buffer[start_position + i] === query[i] && query[i] !== undefined) {
      i++;
    }

    if (i === query.length - 1 && oddLength) {
      // if oddLength and matched all but the last byte then compare only the first four bits of the last byte
      if (this.buffer[start_position + i] >> 4 === query[i] >> 4) {
        i++;
      }
    }

    return i;
  };

  halfByteInterface.prototype.onReadyAt = function(position, len, cb, final_cb) {
    // assumes position will always be forward of this.bufferPosition
    var me, waitLoop;
    if ((position / 2) + len < this.bufferPosition + this.buffer.length) {
      // buffer already seems to be ready!
      setTimeout(function(){ cb(final_cb) });
    } else {
      // need to rebuffer
      me = this;
      waitLoop = setInterval(function(){
        var new_data, cutLength;
        if (!me.exhausted) {
          if (new_data = me.stream.read(me.bufferSize)) {
            cutLength = me.buffer.length - 500;
            me.buffer = Buffer.concat([me.buffer.slice(cutLength), new_data]);
            me.bufferPosition += Math.max(0, cutLength);
            clearInterval(waitLoop);
            cb(final_cb);
          }
        } else {
          console.log('Digit stream exhausted!');
          clearInterval(waitLoop);
          final_cb(-1);
        }
      });
    }
  };

  return halfByteInterface;
})();


/*
 * The scanPiFor function is the API for the scanning process
 */
exports.scanPiFor = function(query, indexDir, digitsFile, cb) {
  var firstDigitIndex, digitsInterface, i, startPosition, evenQuery, oddQuery,
    evenQueryOddLen, oddQueryOddLen;

  var asyncScan = function(cb) {
    var current_digit_buffer_end = digitsInterface.bufferPosition + digitsInterface.buffer.length;

    if (firstDigitIndex.cursor < firstDigitIndex.buffer.length) {

      // This while condition is a terse but significantly optimised way of
      //  both setting up the startPosition variable for the next attempted
      //  match and checking that digitsInterface has enough buffered digits
      //  left to perform this test.
      while ( ( (startPosition = (startPosition || firstDigitIndex.step())) / 2 + evenQuery.length ) <= current_digit_buffer_end ) {

        if (startPosition & 1) {
          if (digitsInterface.matchingBytes(startPosition + 1, oddQuery, oddQueryOddLen) === oddQuery.length) {
            cb(startPosition);
            return;
          }
        } else {
          if (digitsInterface.matchingBytes(startPosition, evenQuery, evenQueryOddLen) === evenQuery.length) {
            cb(startPosition);
            return;
          }
        }
        startPosition = null; // to trigger reassignment

        if (firstDigitIndex.cursor >= firstDigitIndex.buffer.length) {
          // if it happens that we just used up the firstDigitIndex buffer then
          // let it rebuffer before starting again from the same position

          return firstDigitIndex.onReady(asyncScan, cb);
        }
      }

      // reaching here implies that digitsInterface needs rebuffering
      return digitsInterface.onReadyAt(startPosition, evenQuery.length, asyncScan, cb);
    }

    // reaching here implies that firstDigitIndex needs rebuffering
    return firstDigitIndex.onReady(asyncScan, cb);
  };


  // prepare the query and the index interfaces
  query = String(query);
  firstDigitIndex = new IndexInterface(indexDir + query[0]);
  digitsInterface = new halfByteInterface(digitsFile);

  // Prepare two optimised queries as buffers, one for comparing from the start
  //  of a byte, and one for comparing from halfway through a byte.
  evenQuery = new Buffer(Math.ceil(query.length / 2));
  oddQuery = new Buffer(query.length >> 1);

  // Determine whether each query is odd lengthed,
  //  i.e. the last digit will leave half a byte empty
  evenQueryOddLen = !!(query.length & 1);
  oddQueryOddLen = !(query.length & 1);

  for (i = 0; i < (query.length >> 1); i++) {
    evenQuery[i] = (parseInt(query[i*2]) << 4) + parseInt(query[i*2+1]);
  }

  for (i = 1; i <= ((query.length - 1) >> 1); i++) {
    oddQuery[i-1] = (parseInt(query[i*2-1]) << 4) + parseInt(query[i*2]);
  }

  if (evenQueryOddLen) {
    // 15 is code for glob because its not a valid digit and its easily detected
    //  like ((byte & 15) === 15)
    evenQuery[evenQuery.length-1] = (parseInt(query[query.length-1]) << 4) + 15;
  } else if (oddQueryOddLen) {
    oddQuery[oddQuery.length-1] = (parseInt(query[query.length-1]) << 4) + 15;
  }

  // Pass asyncScan as a callback for when digitsInterface is buffered
  return digitsInterface.onReadyAt(null, evenQuery.length, asyncScan, cb);
};


/*
 * The digitsAt function simply returns the string digits within the supplied
 * range from the digitsFile.
 */
exports.digitRange = function(startPosition, endPosition, digitsFile, cb) {
  var result = '',
      sliceStart = startPosition % 2,
      sliceEnd = sliceStart + endPosition - startPosition;

  var stream = fs.createReadStream(digitsFile, {
    start: Math.floor(startPosition / 2),
    end: Math.ceil(endPosition / 2)-1
  });

  stream.on('readable', function(){
    var b = stream.read();
    if (b) {
      result += b.toString('hex');
    }
  });

  stream.on('close', function(){
    cb(result.slice(sliceStart, sliceEnd));
  });
}