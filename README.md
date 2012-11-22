# MHL Buoy Data

[![build status](https://secure.travis-ci.org/DylanFM/mhl-buoy-data.png)](http://travis-ci.org/DylanFM/mhl-buoy-data)

[MHL](http://mhl.nsw.gov.au/) buoys track swell conditions off the coast of NSW Australia. This will parse their GIF graphs so the data can be used in other ways.

Learn more about these graphs here: http://new.mhl.nsw.gov.au/data/realtime/wave/

## Turns this

![Sydney buoy](https://dl.dropbox.com/u/1614309/MHL%20repo/syddir-1.gif)

## Into this

```javascript
{ 
  direction: 138.46, 
  hsig: 0.97, 
  hmax: 1.75, 
  tsig: 5.94, 
  tp1: 5.1 
}
```

I'm only interested in the latest readings, that's what this object outlines.

## Installation

```
npm install mhl-buoy-data
```

## Usage

mhl-buoy-data exports a function that takes 2 parameters: a path to the gif and a callback. The callback will be called once the gif has been parsed. The callback will receive an argument that is an object representing the current conditions for the buoy.

Here's a little bit from the tests showing how it's used.

```javascript
var parseMHLGraph = require('mhl-buoy-data')
var assert        = require('assert')

// You can pass a path to a local gif, or a URL
parseMHLGraph('./test/fixtures/syddir-1.gif', function(err, conditions) {
  assert.equal(conditions.direction, 138.46) // Degrees true north
  assert.equal(conditions.hmax, 1.75)        // Metres
  assert.equal(conditions.hsig, 0.97)        // Metres
  assert.equal(conditions.tp1, 5.1)          // Seconds
  assert.equal(conditions.tsig, 5.94)        // Seconds
})
```

## Glossary

From the [MHL's glossary](http://www.mhl.nsw.gov.au/www/wave_glossary.htmlx):

### Hmax
Maximum wave height in a recorded burst of raw data.

### Hsig
Significant wave height = average height of the waves which comprise the highest 33% of waves in a given sample period (typically 20 to 30 minutes).

### Direction
The direction from which ocean waves approach a location. Generally, the principal wave direction is represented by the direction which corresponds to the peak period of the energy spectrum (TP1).

### Tsig
Significant period = average period of the waves used to define Hsig

### Tp1
Period of the peak of the energy spectrum.

## Also...

* This is certainly a work in progress and there's a good chance that values are slightly off. Things will be ironed out over time.
* There's a little GIF decoder in here too. It was hastily hacked and the code is a horror, but that'll improve when I extract it. Big thanks to the GIF spec and https://github.com/shachaf/jsgif. JS Gif in particular was handy, and I pulled across some things like the LZW decoder.

## License

MHL Buoy Data is released under the MIT license.
