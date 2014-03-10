#!/usr/bin/env node

'use strict'

var http = require('http');
var piIndexSearch = require('./lib/indexScanner.js');

var portNumber = 31415;

var indexDir = (process.argv[2] || "./index/");
indexDir = (indexDir[indexDir.length-1] === '/' ? indexDir : indexDir + '/');
var digitsFile = (process.argv[3] || "./pi-digits");

var log = function('message') {
  console.log((new Date()).toGMTString() + ' : ' + message)
};

http.createServer(function (req, res) {
  var path = req.url.split('/');
  var query = parseInt(path[3], 10);

  if (req.method === 'GET' &&
      path.length > 3 &&
      path[1] === 'pi' &&
      path[2] === 'search' &&
      query > -1) {

    log('Recieved request ' + req.url);
    res.writeHead(200, {'Content-Type': 'application/json'});

    var t0 = new Date().getTime();
    piIndexSearch.searchPiFor(query, indexDir, digitsFile, function(result) {
      var td = (new Date().getTime() - t0) / 1000;
      if (result + 1) {
        res.end(JSON.stringify({
          status: 'success',
          query: query,
          result: result,
          time: td
        }));
      } else {
        res.end(JSON.stringify({
          status: 'not found',
          query: query,
          result: result,
          time: td
        }));
      }
      log('Fulfilled request ' + query + ' => ' + result);
    });

  } else {
    // invalid request
    res.writeHead(400, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      'status': 'error',
      'message': 'invalid request'
    }));
    log('Rejected request ' + req.method + ' : ' + req.url);
  }
}).listen(portNumber);

console.log('Started web server on port ' + portNumber + ', on ' + (new Date()).toGMTString());
console.log('Accepting requests like http://127.0.0.1:' + portNumber + '/pi/search/1415');
