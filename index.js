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
  return parseFloat((((percent/100) * (max-min)) + min).toFixed(1), 10)
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

// Given an axis' line, scan for segments (the lines off the axis denoting a value step)
var getAxisSegments = function(gif, x, bottomY, topY, colour) {
  var segments = [], 
      y
  for (y = bottomY; y >= topY; y--) {
    scanForSeg(gif, x, y, colour, function(coords) {
      segments.push(coords)
    })
  }
  return segments
}

// For each graph, we want to have the coordinates to the most recent point of the lines
// Scan backwards from the right-hand axis to find the 1st instances of lines
var getLatestData = function(gif, fromX, bottomY, topY, colours) {
  var data = [],
      y
  while(!data.length) {
    for(y = bottomY; y > topY; y--) {
      scanForData(gif, fromX, y, colours, function(point) {
        data.push(point)
      })
    }
    fromX--
  }
  return data
}

// Used for scanning axes
var seekUpToNoColour = function(gif, x, y, colour) {
  var px
  do {
    px = getPixel(gif, x, y--)
  } while (px === colour && y)
  return [x, y+1]
}

// Go to x and y and scan up for line of colour
// If no line, go left 1 until a line is found
// Return the x,y of where the line was located
var getAxisFromRight = function(gif, x, y, colour) {
  var axis
  do {
    // Seek up from point, reduce x by 1 for next iteration if it occurs
    axis = seekUpForLineOfColour(gif, x--, y, colour)
  } while(!axis && x)
  return axis
}

// Like above function, but in reverse
var getAxisFromLeft = function(gif, x, y, colour) {
  var axis
  do {
    // Seek up from point, increment x for next iteration if it occurs
    axis = seekUpForLineOfColour(gif, x++, y, colour)
  } while(!axis && x < gif.logical_screen_width)
  return axis
}

// Scan downwards from point for a line to the right
var getXAxisFromAbove = function(gif, x, y, colour) {
  var axis
  do {
    // Seek across from point for a line
    axis = seekAcrossForLineOfColour(gif, x, y++, colour)
  } while(!axis && y < gif.logical_screen_height)
  return axis
}

var pointPercent = function(y, offsetY, total) {
  return ((total-(y-offsetY))/total)*100
}

var uniqueByColour = function(data) {
  return _.uniq(data, false, function(pt) { return pt.colour })
}

// Find 1st matching point in supplied array of points
var getPointFromData = function(data, colour) {
  return _.find(data, function(p) { return p.colour === colour })
}

// Seek upwards from point looking for a solid line of colour that's atleast 50px
var seekUpForLineOfColour = function(gif, x, y, colour) {
  var lengthOfColour = 0,
      firstSawColour
  do {
    if (getPixel(gif, x, y) === colour) {
      lengthOfColour++
      if (!firstSawColour)
        firstSawColour = [x, y]
    } else {
      if (lengthOfColour) {
        lengthOfColour = 0
        firstSawColour = null
      }
    }
    y--
  } while (lengthOfColour < 50 && y)
  return firstSawColour
}

// TODO this function and the one above could be DRYd
// Seek across from point looking for a solid line of colour that's atleast 50px
var seekAcrossForLineOfColour = function(gif, x, y, colour) {
  var lengthOfColour = 0,
      firstSawColour
  do {
    if (getPixel(gif, x, y) === colour) {
      lengthOfColour++
      if (!firstSawColour)
        firstSawColour = [x, y]
    } else {
      if (lengthOfColour) {
        lengthOfColour = 0
        firstSawColour = null
      }
    }
    x++
  } while (lengthOfColour < 50 && x < gif.logical_screen_width)
  return firstSawColour
}

// Parse requested graph...
var parseMHLGraph = function(path, cb) {
  parseGif(path, function(err, gif) {

    // If we got an error from the parseGif call, exit now
    if (err) {
      cb(err)
      return
    }
    
    var conditions = {},
        colours = {},
        metreSegments = [],
        secondSegments = [],
        directionSegments = [],
        directionAxis, metreAxis, secondAxis,
        strGct, topData, bottomData, err

    try {
      // NOTE assumption - checking colours manually, expecting no changes
      // Look in GCT for the indices of the colours we're after (r,g,b)
      strGct = gif.gct.map(function(rgb) { return rgb.join('') }) // Converting to strings for index of
      colours.blue  = _.indexOf(strGct, [0,0,230].join(''))
      colours.red   = _.indexOf(strGct, [230,0,0].join(''))
      colours.green = _.indexOf(strGct, [0,200,0].join(''))
      colours.black = _.indexOf(strGct, [0,0,0].join(''))

      // We need these colours present
      if (!_.all(_.keys(colours), function(c) { return colours[c] > 0 })) {
        throw new Error('Colours are missing')
      }

      // Image size and axis locations:
      //  I appears that when the image gets to a certain height, it squishes inwards
      //  I've got an image in test/fixtures that's over 900px high with the X of metre and seconds axis on 45px rather than 50px, also the degrees axis is in a different place
      //  We need to locate the y and x axes dynamically rather than with a hard-coded value
      //  This is handled below

      // Build details on the axes
      // From 544,314 to 544,67
      // NOTE unlike the LHS y-axes, this shouldn't change
      directionAxis = {
        min: 0, 
        max: 360
      }
      // Find direction y axis by going to right of image, 250 down and scanning left for a vertical line 
      directionAxis.x = getAxisFromRight(gif, gif.logical_screen_width - 30, 250, colours.blue)[0]
      // Also need to locate the X axis, which is shared with metre
      // Go in to what could be the center of the top graph and scan down for the line
      directionAxis.bottomY = getXAxisFromAbove(gif, directionAxis.x - 80, 250, colours.black)[1]
      // Best get the topY too as it could change
      // Notice I'm -- the bottomY. Because the x axis has a black pixel there
      directionAxis.topY = seekUpToNoColour(gif, directionAxis.x, directionAxis.bottomY - 1, colours.blue)[1] + 1 // Add 1 as it returns the 1st non-blue cell
      directionAxis.length = directionAxis.bottomY-directionAxis.topY
      directionAxis.segments = getAxisSegments(gif, directionAxis.x+1, directionAxis.bottomY, directionAxis.topY, colours.blue)

      // NOTE Assumption alert
      //      Unlike seconds beneath, all examples of the metres axis begin at 0.
      //      Also, despite sometimes only showing up to 4 or 6, sometimes the axis reads
      //      up to 8 metres. When 8 is shown, it's equal to 360. So, for now I'm going to
      //      parse it like the direction value and work out a value as a percentage of 8.
      // TODO don't rely on this. If it goes up to 10 metres, then it's probably going to 
      //      add a row above 360. We need a way of determining values by
      //      reading segment counts and possibly looking at layout.
      //      Build up fixtures for testing, especially when the surf is huge and tiny

      metreAxis = { 
        min: 0
      }        
      // TODO max should be calculated like seconds' max below
      // Find metre y axis by going 250 down and scanning right for a vertical line
      metreAxis.x = getAxisFromLeft(gif, 25, 250, colours.black)[0]
      // Shared with direction
      metreAxis.bottomY = directionAxis.bottomY
      // Go to x of y axis and scan upwards from 315y to see when the solid black line
      // finishes and use that y position as the topY
      metreAxis.topY  = seekUpToNoColour(gif, metreAxis.x, metreAxis.bottomY, colours.black)[1] + 1 // Add 1 as it returns the 1st non-black cell
      metreAxis.length = metreAxis.bottomY-metreAxis.topY
      metreAxis.segments = getAxisSegments(gif, metreAxis.x-1, metreAxis.bottomY, metreAxis.topY, colours.black)
      metreAxis.max = metreAxis.segments.length + metreAxis.min - 1

      // Work out seconds axis
      secondAxis = {
        min: 4
      }        
      // Second's is in line with metre
      secondAxis.x = metreAxis.x
      // The second axis is tricky... it changes the height of the image, changes min and max and so on
      // We need to calculate the bottom of the axis and top
      // First of all, let's go to the bottom of the image and x inwards
      secondAxis.bottomY = seekUpForLineOfColour(gif, secondAxis.x, gif.logical_screen_height, colours.black)[1]
      // NOTE hard-coded assumption here. Reducing 8px of overhang beneath
      secondAxis.bottomY -= 8
      secondAxis.topY = seekUpToNoColour(gif, secondAxis.x, secondAxis.bottomY, colours.black)[1] + 1 // Add one to get last coloured cell
      // Now we can calculate the correct length and fetch segments
      secondAxis.length = secondAxis.bottomY-secondAxis.topY
      secondAxis.segments = getAxisSegments(gif, secondAxis.x-1, secondAxis.bottomY, secondAxis.topY, colours.black)
      // NOTE Assumption alert
      //      We're leaving the min period as 4. I haven't seen that change yet. Appears they only add rows when the period grows
      secondAxis.max = secondAxis.segments.length + secondAxis.min - 1

      // Let's find the latest data
      topData    = uniqueByColour(getLatestData(gif, directionAxis.x-1, directionAxis.bottomY, directionAxis.topY, [colours.blue, colours.red, colours.green]))
      bottomData = uniqueByColour(getLatestData(gif, directionAxis.x-1, secondAxis.bottomY, secondAxis.topY, [colours.red, colours.green]))

      // Let's give the data points a % value relating to their y-axis scale
      // Top graph
      topData = topData.map(function(point) {
        // Switch on colours. If red or green it's left axis, otherwise right
        if (_.contains([colours.green, colours.red], point.colour)) {
          point.percent = pointPercent(point.coords[1], metreAxis.topY, metreAxis.length)
        } else {
          point.percent = pointPercent(point.coords[1], directionAxis.topY, directionAxis.length)
        }
        return point
      })
      // Now bottom graph
      bottomData = bottomData.map(function(point) {
        point.percent = pointPercent(point.coords[1], secondAxis.topY, secondAxis.length)
        return point
      })

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

    } catch (error) {
      err = [error]
      conditions = undefined
    }

    // All done! Pass conditions to callback
    cb(err, conditions)
  })
}


module.exports = parseMHLGraph
