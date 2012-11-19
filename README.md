# MHL Buoy Data

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

## Usage

Here's a little bit from the tests showing how it's used.

```javascript
var parseMHLGraph = require('../')
var assert        = require('assert')

parseMHLGraph('./test/fixtures/syddir-1.gif', function(conditions) {
  assert.equal(conditions.direction, 138.46) // Degrees true north
  assert.equal(conditions.hmax, 1.75)        // Metres
  assert.equal(conditions.hsig, 0.97)        // Metres
  assert.equal(conditions.tp1, 5.1)          // Seconds
  assert.equal(conditions.tsig, 5.94)        // Seconds
})
```

## Also...

* This is certainly a work in progress and there's a good chance that values are slightly off. Things will be ironed out over time.
* There's a little GIF decoder in here too. It was hastily hacked and the code is a bit of a horror, but that'll improve when I extract it. Big thanks to the GIF spec and https://github.com/shachaf/jsgif. JS Gif in particular was handy, and I pulled across some things like the LZW decoder.

## License

MHL Buoy Data is released under the MIT license.
