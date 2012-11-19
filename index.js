var parseGif = require('./gif')
var _ = require('underscore')

// From the MHL's glossary
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
// NOTE pull into gif library when that's extracted
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
        metreSegments = [],
        secondSegments = [],
        directionSegments = [],
        strGct
        
    // NOTE assumption - checking colours manually, expecting no changes
    // Look in GCT for the indices of the colours we're after (r,g,b)
    strGct = gif.gct.map(function(rgb) { return rgb.join('') }) // Converting to strings for index of
    colours.blue  = _.indexOf(strGct, [0,0,230].join(''))
    colours.red   = _.indexOf(strGct, [230,0,0].join(''))
    colours.green = _.indexOf(strGct, [0,200,0].join(''))
    colours.black = _.indexOf(strGct, [0,0,0].join(''))

    console.log(colours)

    // We want to be able to have pixel coordinates and get an associated value

    var scanForSeg = function(x, y, colour, cb) {
      var px = getPixel(gif, x, y)
      if (px === colour)
        cb([x,y])
    }

    var scanForData = function(x, y, colours, cb) {
      var px = getPixel(gif, x, y)
      if (_.contains(colours, px))
        cb({ coords: [x,y], colour: px })
    }

    // Find the scale for the metres y-axis
    // Top y-axis runs from 50,314 up to 50,129
    // Scan along there, but just to the left and log any segments
    for (var y=315;y>128;y--) {
      scanForSeg(49, y, colours.black, function(coords) {
        metreSegments.push(coords)
      })
    }
    var metreLength = 315-128
    console.log('m segs: ', metreSegments)
    // Find the scale for the direction y-axis
    // From 544,314 to 544,67
    for (var y=315;y>66;y--) {
      scanForSeg(545, y, colours.blue, function(coords) {
        directionSegments.push(coords)
      })
    }
    var directionLength = 315-66
    console.log('dir segs: ', directionSegments)
    // Find the scale for the seconds y-axis
    // From 50,701 to 50,391
    for (var y=702;y>390;y--) {
      scanForSeg(49, y, colours.black, function(coords) {
        secondSegments.push(coords)
      })
    }
    var secondLength = 702-390
    console.log('s segs: ', secondSegments)

    // Let's find the latest data
    // For each graph, we want to have the coordinates to the most recent point of the lines
    // 1st of all, the top graph
    // Scan backwards from the right-hand axis to find the 1st instances of lines
    var topData = []
    var x = 543
    while(!topData.length) {
      for(var y=313;y>66;y--) {
        scanForData(x, y, [colours.blue, colours.red, colours.green], function(point) {
          topData.push(point)
        })
      }
      x--
    }
    console.log('top data: ', topData)
    // And now the bottom graph
    var bottomData = []
    var x = 543
    while(!bottomData.length) {
      for(var y=700;y>390;y--) {
        scanForData(x, y, [colours.red, colours.green], function(point) {
          bottomData.push(point)
        })
      }
      x--
    }
    console.log('bottom data: ', bottomData)

    // Let's give the data points a % value relating to their y-axis scale
    // Top graph
    topData = topData.map(function(point) {
      switch (point.colour) {
        case colours.green:
          // Hsig, left y-axis
          point.percent = Math.floor(((314-point.coords[1])/metreLength)*100)
        break
        case colours.red:
          // Hmax, left y-axis
          point.percent = Math.floor(((314-point.coords[1])/metreLength)*100)
        break
        case colours.blue:
          // Direction, right y-axis
          point.percent = Math.floor(((314-point.coords[1])/directionLength)*100)
        break
      }
      return point
    })
    // Now bottom graph
    bottomData = bottomData.map(function(point) {
      switch (point.colour) {
        case colours.green:
          // Tsig, left y-axis
          point.percent = Math.floor(((701-point.coords[1])/secondLength)*100)
        break
        case colours.red:
          // Tp1, left y-axis
          point.percent = Math.floor(((701-point.coords[1])/secondLength)*100)
        break
      }
      return point
    })

    console.log('topData: ', topData)
    console.log('bottomData: ', bottomData)

    // We want to store the values of the different data points in the conditions object
    // We need to know the top and bottom values from each y-axis
    // The metre and second axises change according to the graph's content, but the direction doesn't
    // Let's begin with the direction value
    var directionsPoint = _.find(topData, function(p) { return p.colour === colours.blue })
    if (directionsPoint) {
      // So we know top is 360, bottom is 0. Percentage in point means its value is % of 360
      conditions.direction = (directionsPoint.percent/100)*360
    } 

    cb(conditions)
  })
}


module.exports = parseMHLGraph
