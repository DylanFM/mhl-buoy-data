var parseGif = require('./gif')
var _ = require('underscore')

// Hmax RED
// Maximum wave height in a recorded burst of raw data.
// Hsig GREEN
// Significant wave height = average height of the waves which comprise the highest 33% of waves in a given sample period (typically 20 to 30 minutes).
// Direction BLUE
// The direction from which ocean waves approach a location. Generally, the principal wave direction is represented by the direction which corresponds to the peak period of the energy spectrum (TP1).
// Tsig GREEN
// Significant period = average period of the waves used to define Hsig
// Tp1 RED
// Period of the peak of the energy spectrum.

// Return the value for the pixel
var getPixel = function(gif, x, y) {
  // Gif data isn't split into rows and columns
  // To get to X col and Y row, what index?
  var img = gif.images[0],
      i = (img.width * y) + x
  return img.data[i]

}

var parseMHLGraph = function(path, cb) {
  parseGif(path, function(gif) {
    var conditions = {},
        colours = {},
        strGct
        
    // NOTE assumption - checking colours manually, expecting no changes
    // Look in GCT for the indices of the colours we're after (r,g,b)
    strGct = gif.gct.map(function(rgb) { return rgb.join('') }) // Converting to strings for index of
    colours.blue  = _.indexOf(strGct, [0,0,230].join(''))
    colours.red   = _.indexOf(strGct, [230,0,0].join(''))
    colours.green = _.indexOf(strGct, [0,200,0].join(''))

    console.log(colours)

    
    for(var x=280;x<300;x++) {
      for(var y=265;y<285;y++) {
        var px = getPixel(gif,x,y)
        if (px !== 0)
          console.log('at x: ',x,' y: ',y,' index: ',px)
      }
    }


    // Testing 292,235 should be blue
    //         292,246 red
    //         292,274 green
    console.log("should be blue", getPixel(gif,292,234))
    console.log("should be red", getPixel(gif,292,246))
    console.log("should be green", getPixel(gif,292,274))
    
    // We want to be able to have pixel coordinates and get an associated value
    // Find the scale for the metres y-axis
    // Find the scale for the direction y-axis
    // Find the scale for the seconds y-axis

    cb(conditions)
  })
}


module.exports = parseMHLGraph
