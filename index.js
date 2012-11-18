var fs = require('fs')

var getImageData = function(path, cb) {
  fs.readFile(path, function(err, data) {
    if (err) {
      return console.log(err)
    }
    return cb(data)
  })
}

var parseGif = function(path, cb) {
  getImageData(path, function(buffer) {
    var gif = {},
        pos = 0

    gif.signature = buffer.toString('utf8', 0, 3)
    gif.version = buffer.toString('utf8', 3, 6)

    pos = 6

    // Logical screen width, 2 bits unsigned ints
    gif.logical_screen_width = buffer.readUInt8(pos) + (buffer.readUInt8(pos+1) << 8)
    pos++
    pos++

    // Logical screen height, 2 bits unsigned ints
    gif.logical_screen_height = buffer.readUInt8(pos) + (buffer.readUInt8(pos+1) << 8)
    pos++
    pos++

    // Following fields are packed
    //  Global color table flag 1 bit
    //  Color resolution 3 bits
    //  Sort flag 1 bit
    //  Size of GCT 3 bits
    var packed = buffer[pos]
    var a = []
    for (var i = 7; i >= 0; i--) {
      a.push(!!(packed & (1 << i)))
    }
    // Global color table flag:
    //  true:   No Global Color Table follows, the Background
    //          Color Index field is meaningless.
    //  false:  A Global Color Table will immediately follow, the
    //          Background Color Index field is meaningful.
    gif.gct_flag = a.shift()
    gif.color_res = a.splice(0,3).reduce(function(s, n) {
      return s * 2 + n
    }, 0) // Number of bits per primary color available to the original image (minus 1)
    gif.color_res++ // Add 1 to get correct value
    gif.sort_flag = a.shift()
    gif.gct_size = a.splice(0,3).reduce(function(s, n) {
      return s * 2 + n
    }, 0)
    // "To determine that actual size of the color table, raise 2 to [the value of the field + 1]"
    gif.gct_size = Math.pow(2, gif.gct_size + 1) // "the number of bytes contained in the Global Color Table"
    pos++

    gif.bg_index = buffer[pos]
    pos++
    gif.pixel_aspect_ratio = buffer[pos]
    pos++

    if (gif.gct_flag === true) {
      // Global color table present, parse it
      gif.gct = []

      var getGCTEntry = function() {
        var rgb = []
        rgb.push(buffer[pos++])
        rgb.push(buffer[pos++])
        rgb.push(buffer[pos++])
        return rgb
      }

      // In groups of 3 bytes (R G B), read gct_size bytes as the GCT
      for (var i=gif.gct_size;i > 0;i--) {
        gif.gct.push(getGCTEntry())
      }
    }

    cb(gif)
  })
}

module.exports = parseGif
