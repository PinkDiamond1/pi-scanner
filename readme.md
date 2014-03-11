# PiScanner

A nodejs app for finding the first occurance of arbitrary sequences of decimal
digits in Pi.


## Why?

For the sake of building something with nodejs, and um... π is cool?

## Installation requirements

- nodejs
- some digits of pi as available from http://piworld.calico.jp/estart.html

## Usage

To build an index, download as many digits as you want from the above link.
Digits are available in zipped text files of 100 million each. Place a set of
consecutive files (starting form *pi-0001.txt*) in within a subdirectory within
of the project directory. Invoke the command line interface with no arguments to
get, or like so to build the indexes in a default setup from within the project
directory:

    $ ./cli.js index

Querying the indexes with the CLI to locate a given sequence within pi:

    $ ./cli.js scan 1999
    Scanning indexes for sequence 1999
    Found sequence "1999" in pi, starting after 11195 decimal places, in 0.033 seconds.


Querying the indexes with the CLI to retrieve a range of digits from pi:

    $ ./cli.js range 11190:11200
    1290019992

Launching the web service:

    $ ./app.js
