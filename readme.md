# PiScanner

A nodejs app for finding arbitrary sequences of decimal digits in Pi.


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

## Under the hood

Searching for sequences in Pi is a difficult problem because it's essentially an
endless string of random numbers, allowing for very few optimising assumptions.
However you go about it, the result is basically an enhanced linear search,
where extra efficiency requires ever larger indexes.

The present approach was to create an index for each distinct digit
('0' through '9'), in the form of a binary file of 8 bit integers. The first
number in each index indicates the decimal place of the first occurrence of that
digit. The second number indicates the number of decimal places further along of
the next occurrence of that digit, and so on. Thus location of the nth a given
digit can be found by summing the first n values in the corresponding index
file.

These ten indexes could be enough to allow for sequences to be found by walking
each index in parallel until a match is found. However for the sake of speed and
simplicity a digits file is also used, which consists the entire string of
digits, packed with 4 bits per digit. Thus the digit index files are used to
quickly locate potential matches based on the first digit of the query, and an
attempt is then made to match the rest of the query with the corresponding
digits from the digits file.

## Typical performance

Indexing one billion digits takes just under 5 minutes with an SSD,
whereas the resulting index takes about 7 seconds to scan entirely.
