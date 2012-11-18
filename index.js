var fs = require('fs')

var getImageData = function(path, cb) {
  fs.readFile(path, function(err, data) {
    if (err) {
      return console.log(err)
    }
    return cb(data)
  })
}

var getPacked = function(bits) {
  var a = []
  for (var i = 7; i >= 0; i--) {
    a.push(!!(bits & (1 << i)))
  }
  return a
}

var parseGif = function(path, cb) {
  getImageData(path, function(buffer) {
    var gif = {},
        pos = 0

    var readBytes = function(n) {
      var bytes = []
      for (var i = 0;i < n;i++) {
        bytes.push(buffer[pos++])
      }
      return bytes 
    }

    var read = function(n) {
      var str = ''
      for (var i = 0;i < n;i++) {
        str += String.fromCharCode(buffer[pos++])
      }
      return str 
    }

    var readSubBlocks = function() {
      var str = 0,
          size
      do {
        size = buffer[pos++]
        str += read(size)
      } while (size !== 0)
      return str
    }

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
    var packed = getPacked(buffer[pos])
    // Global color table flag:
    //  true:   No Global Color Table follows, the Background
    //          Color Index field is meaningless.
    //  false:  A Global Color Table will immediately follow, the
    //          Background Color Index field is meaningful.
    gif.gct_flag = packed.shift()
    gif.color_res = packed.splice(0,3).reduce(function(s, n) {
      return s * 2 + n
    }, 0) // Number of bits per primary color available to the original image (minus 1)
    gif.color_res++ // Add 1 to get correct value
    gif.sort_flag = packed.shift()
    gif.gct_size = packed.splice(0,3).reduce(function(s, n) {
      return s * 2 + n
    }, 0)
    // "To determine that actual size of the color table, raise 2 to [the value of the field + 1]"
    gif.gct_size = Math.pow(2, gif.gct_size + 1) // "the number of bytes contained in the Global Color Table"
    pos++

    gif.bg_index = buffer[pos]
    pos++
    gif.pixel_aspect_ratio = buffer[pos]
    if (gif.pixel_aspect_ratio > 0) {
      // Compute based on formula in gif spec 89a
      gif.pixel_aspect_ratio = (gif.pixel_aspect_ratio + 15) / 16
    }
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

    // Now we're up to the image descriptor(s)
    // At least 1 image descriptor is required. There can be an unlimited number.
    // Coords are in pixels and refer to coords within the logical screen (see above).
    // Each image in this data stream is composed of:
    //  - Image descriptor
    //    This is a graphic-rendering block, optionally preceded by 1 or more control blocks
    //    An example of a control block is a graphic control extension
    //  - Local color table (optional)
    //  - Image data
    
    gif.images = []
    gif.extensions = []

    var parseImage = function(complete) {
      gif.images.push('image')
      complete()
    }

    var parseExtension = function(complete) {
      var ext = {},
          id = buffer[pos++]
      // Thanks schachaf, I've used your code a lot for reference and here's one such spot
      switch (id) {
        case 0xF9:
          // Graphic control extension
          ext.type = 'gce'
          ext.block_size = buffer[pos++]
          var packed = getPacked(buffer[pos++]) 
          // Packed bits:
          //  - Reserved                      3 Bits
          //  - Disposal Method               3 Bits
          //  - User Input Flag               1 Bit
          //  - Transparent Color Flag        1 Bit
          ext.reserved = packed.splice(0, 3)
          ext.disposal_method = packed.splice(0,3).reduce(function(s, n) {
            return s * 2 + n
          }, 0)
          ext.user_input = packed.shift()
          ext.transparency_given = packed.shift()
          ext.delay_time = buffer.readUInt8(pos) + (buffer.readUInt8(pos+1) << 8)
          pos++
          ext.transparency_index = buffer[pos++]
          ext.terminator = buffer[pos++]
          break
        case 0xFE:
          // Comment extension
          ext.type = 'comment'
          ext.comment = readSubBlocks()
          break
        case 0x01:
          // Plain text extension
          ext.type = 'plaintext'
          ext.header = read(12)
          ext.data = readSubBlocks()
          break
        case 0xFF:
          // App extension
          ext.type = 'application'
          ext.block_size = buffer[pos++]
          ext.identifier = read(8)
          ext.authentication_code = read(3)
          ext.data = readSubBlocks()
          break
        default:
          console.log('Unknown extension: ' + id)
      }
      // Call complete callback
      complete(ext)
    }

    // Continue parsing the file
    // When we identify a block (image, gce...), parse it into something manageable
    // When that identified block finishes, repeat the function
    // When there isn't an identified block, call the callback
    var parseBlocks = function(eof) {
      var id = buffer[pos++]
      switch(id) {
        case 0x21: // Extension
          parseExtension(function(ext) {
            // Add extension to gif object
            gif.extensions.push(ext)
            // Continue
            parseBlocks(eof)
          })
          break
        case 0x2C: // Image
          parseImage(function(img) {
            // Add extension to gif object
            gif.images.push(img)
            // Continue
            parseBlocks(eof)
          })
          break
        // case ';': // End of file
        //   eof(gif)
        //   break
        default:
          console.log('Unknown block: ' + id + ' (' + String.fromCharCode(id) + ')')
          eof(gif)
      }
    }

    parseBlocks(cb)
  })
}

module.exports = parseGif
