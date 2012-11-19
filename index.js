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

// Given a % value and details on the axis, what's the value?
var getAxisValue = function(percent, max, min) {
  return (parseFloat(((percent/100)*(max-min)).toFixed(2), 10)+min)
}

// Scan vertically checking for segments and noting them
var scanForSeg = function(gif, x, y, colour, cb) {
  var px = getPixel(gif, x, y)
  if (px === colour)
    cb([x,y])
}

// Callback executed if coordinate matches colours we're asking for
var scanForData = function(gif, x, y, colours, cb) {
  var px = getPixel(gif, x, y)
  if (_.contains(colours, px))
    cb({ coords: [x,y], colour: px })
}

// Parse requested graph...
var parseMHLGraph = function(path, cb) {
  parseGif(path, function(gif) {
    var conditions = {},
        colours = {},
        metreSegments = [],
        secondSegments = [],
        directionSegments = [],
        directionAxis,
        metreAxis,
        secondAxis,
        strGct
        
    // NOTE assumption - checking colours manually, expecting no changes
    // Look in GCT for the indices of the colours we're after (r,g,b)
    strGct = gif.gct.map(function(rgb) { return rgb.join('') }) // Converting to strings for index of
    colours.blue  = _.indexOf(strGct, [0,0,230].join(''))
    colours.red   = _.indexOf(strGct, [230,0,0].join(''))
    colours.green = _.indexOf(strGct, [0,200,0].join(''))
    colours.black = _.indexOf(strGct, [0,0,0].join(''))

    // Build details on the axes
    var directionAxis = {
      min: 0, 
      max: 360,
      bottomY: 0,
      topY: 0 
    }
    // NOTE Assumption alert
    //      Unlike seconds beneath, all examples of the metres axis begin at 0.
    //      Also, despite sometimes only showing up to 4 or 6, sometimes the axis reads
    //      up to 8 metres. When 8 is shown, it's equal to 360. So, for now I'm going to
    //      parse it like the direction value and work out a value as a percentage of 8.
    // TODO don't rely on this. If it goes up to 10 metres, then it's probably going to 
    //      add a row above 360's on the right. We need a way of determining values by
    //      reading segment counts and possibly looking at layout.
    //      Build up fixtures for testing, especially when the surf is huge and tiny
    var metreAxis = { 
      min: 0, 
      max: 8, 
      bottomY: 0,
      topY: 0 
    }        
    // NOTE Assumption alert
    //      I'm just going to say that this is going from 4 seconds to 14 seconds
    //      This certainly isn't always the case, but for now it will work
    //      until I make things a bit more complex here
    var secondAxis = {
      min: 4, 
      max: 14, 
      bottomY: 0,
      topY: 0 
    }        

    // We want to be able to have pixel coordinates and get an associated value


    // Find the scale for the metres y-axis
    // Top y-axis runs from 50,314 up to 50,129
    // Scan along there, but just to the left and log any segments
    // NOTE 129 may not be right. Sometimes the axis is shorter/longer
    //      We should actually go to 50x and scan upwards from 315y to see when the solid black line
    //      finishes, then we know where to scan to for the segments and how to form the %
    for (var y=315;y>128;y--) {
      scanForSeg(gif, 49, y, colours.black, function(coords) {
        metreSegments.push(coords)
      })
    }
    var metreLength = 315-66 // Swapped to direction scale, as we're using that at the moment
    // Find the scale for the direction y-axis
    // From 544,314 to 544,67
    // NOTE unlike the LHS y-axes, this shouldn't change
    for (var y=315;y>66;y--) {
      scanForSeg(gif, 545, y, colours.blue, function(coords) {
        directionSegments.push(coords)
      })
    }
    var directionLength = 315-66
    // Find the scale for the seconds y-axis
    // From 50,701 to 50,391
    // NOTE like the metre y-axis, this needs to be refactored to allow for different lengths
    for (var y=702;y>390;y--) {
      scanForSeg(gif, 49, y, colours.black, function(coords) {
        secondSegments.push(coords)
      })
    }
    var secondLength = 702-390

    // Let's find the latest data
    // For each graph, we want to have the coordinates to the most recent point of the lines
    // 1st of all, the top graph
    // Scan backwards from the right-hand axis to find the 1st instances of lines
    var topData = []
    var x = 543
    while(!topData.length) {
      for(var y=313;y>66;y--) {
        scanForData(gif, x, y, [colours.blue, colours.red, colours.green], function(point) {
          topData.push(point)
        })
      }
      x--
    }
    // And now the bottom graph
    var bottomData = []
    var x = 543
    while(!bottomData.length) {
      for(var y=700;y>390;y--) {
        scanForData(gif, x, y, [colours.red, colours.green], function(point) {
          bottomData.push(point)
        })
      }
      x--
    }

    // Let's give the data points a % value relating to their y-axis scale
    // Top graph
    topData = topData.map(function(point) {
      switch (point.colour) {
        case colours.green:
          // Hsig, left y-axis
          point.percent = (1.0-((point.coords[1]-66)/directionLength))*100
        break
        case colours.red:
          // Hmax, left y-axis
          point.percent = (1.0-((point.coords[1]-66)/directionLength))*100
        break
        case colours.blue:
          // Direction, right y-axis
          point.percent = (1.0-((point.coords[1]-66)/directionLength))*100
        break
      }
      return point
    })
    // Now bottom graph
    bottomData = bottomData.map(function(point) {
      switch (point.colour) {
        case colours.green:
          // Tsig, left y-axis
          point.percent = (1.0-((point.coords[1]-390)/secondLength))*100
        break
        case colours.red:
          // Tp1, left y-axis
          point.percent = (1.0-((point.coords[1]-390)/secondLength))*100
        break
      }
      return point
    })

    // Find 1st matching point in supplied array of points
    var getPointFromData = function(data, colour) {
      return _.find(data, function(p) { return p.colour === colour })
    }

    // Fetch the point for each line we're seeking
    var directionsPoint  =  getPointFromData(topData, colours.blue),
        hsigPoint        =  getPointFromData(topData, colours.green),
        hmaxPoint        =  getPointFromData(topData, colours.red),
        tsigPoint        =  getPointFromData(bottomData, colours.green),
        tp1Point         =  getPointFromData(bottomData, colours.red)

    // We want to store the values of the different data points in the conditions object
    if (directionsPoint)
      conditions.direction = getAxisValue(directionsPoint.percent, directionAxis.max, directionAxis.min)

    if (hsigPoint)
      conditions.hsig = getAxisValue(hsigPoint.percent, metreAxis.max, metreAxis.min)

    if (hmaxPoint)
      conditions.hmax = getAxisValue(hmaxPoint.percent, metreAxis.max, metreAxis.min)

    if (tsigPoint)
      conditions.tsig = getAxisValue(tsigPoint.percent, secondAxis.max, secondAxis.min)

    if (tp1Point)
      conditions.tp1 = getAxisValue(tp1Point.percent, secondAxis.max, secondAxis.min)

    // All done! Pass conditions to callback
    cb(conditions)
  })
}


module.exports = parseMHLGraph
