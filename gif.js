var fs = require('fs')
var http = require('http')

var getImageData = function(path, cb) {
  // Check if we're requesting a local file or a URL
  // Crude... but functional
  if (/^http:\/\//.test(path)) {
    // Fetch the image...
    http.get(path, function(res) {
      // Track buffers
      var buffers = []
      res.on('data', function(chunk) {
        // Continue with the buffers...
        buffers.push(chunk)
      })
      res.on('end', function() {
        // Response has finished, let's move on
        cb(Buffer.concat(buffers))
      })
    }).on('error', function(e) {
      console.log("Got error: " + e.message)
    })
  } else {
    fs.readFile(path, function(err, data) {
      if (err) {
        return console.log(err)
      }
      return cb(data)
    })
  }
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
      //var str = buffer.toString('utf8', pos-1, (pos-1+n))
      //pos += n
      return str 
    }

    var readSubBlocks = function() {
      var blocks = [], 
          size = buffer[pos++]
      while (size !== 0) {
        blocks.push(readBytes(size))
        size = buffer[pos++]
      }
      return blocks
    }

    var readSubBlocksAsStr = function() {
      var str = '', 
          size = buffer[pos++],
          d
      while (size !== 0) {
        d = read(size)
        str += d
        size = buffer[pos++]
      } 
      return str
    }

    var parseCT = function(size) {
      var ct = []
      var getCTEntry = function() {
        var rgb = []
        rgb.push(buffer[pos++])
        rgb.push(buffer[pos++])
        rgb.push(buffer[pos++])
        return rgb
      }
      // In groups of 3 bytes (R G B), read size bytes
      for (var i=size;i > 0;i--) {
        ct.push(getCTEntry())
      }
      return ct
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
    var packed = getPacked(buffer[pos++])
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

    gif.bg_index = buffer[pos++]
    gif.pixel_aspect_ratio = buffer[pos++]
    if (gif.pixel_aspect_ratio > 0) {
      // Compute based on formula in gif spec 89a
      gif.pixel_aspect_ratio = (gif.pixel_aspect_ratio + 15) / 16
    }

    if (gif.gct_flag === true) {
      // "To determine that actual size of the color table, raise 2 to [the value of the field + 1]"
      gif.gct_size = Math.pow(2, gif.gct_size + 1) // "the number of bytes contained in the Global Color Table"
      // Global color table present, parse it
      gif.gct = parseCT(gif.gct_size)
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

  // Copied from https://github.com/shachaf/jsgif/
  var lzwDecode = function(minCodeSize, data) {
    // TODO: Now that the GIF parser is a bit different, maybe this should get an array of bytes instead of a String?
    var p = 0; // Maybe this streaming thing should be merged with the Stream?
    var readCode = function(size) {
        var code = 0;
        for (var i = 0; i < size; i++) {
          if (data.charCodeAt(p >> 3) & (1 << (p & 7))) {
            code |= 1 << i;
          }
          p++;
        }
        return code;
      };

    var output = [];

    var clearCode = 1 << minCodeSize;
    var eoiCode = clearCode + 1;

    var codeSize = minCodeSize + 1;

    var dict = [];

    var clear = function() {
        dict = [];
        codeSize = minCodeSize + 1;
        for (var i = 0; i < clearCode; i++) {
          dict[i] = [i];
        }
        dict[clearCode] = [];
        dict[eoiCode] = null;

      };

    var code;
    var last;

    while (true) {
      last = code;
      code = readCode(codeSize);

      if (code === clearCode) {
        clear();
        continue;
      }
      if (code === eoiCode) break;

      if (code < dict.length) {
        if (last !== clearCode) {
          dict.push(dict[last].concat(dict[code][0]));
        }
      } else {
        if (code !== dict.length) throw new Error('Invalid LZW code.');
        dict.push(dict[last].concat(dict[last][0]));
      }
      output.push.apply(output, dict[code]);

      if (dict.length === (1 << codeSize) && codeSize < 12) {
        // If we're at the last code and codeSize is 12, the next code will be a clearCode, and it'll be 12 bits long.
        codeSize++;
      }
    }

    // I don't know if this is technically an error, but some GIFs do it.
    //if (Math.ceil(p / 8) !== data.length) throw new Error('Extraneous LZW bytes.');
    return output;
  };

    var parseImage = function(complete) {
      var img = {}

      // Time to parse image 
      img.left_pos = buffer.readUInt8(pos) + (buffer.readUInt8(pos+1) << 8)
      pos++
      pos++
      img.top_pos = buffer.readUInt8(pos) + (buffer.readUInt8(pos+1) << 8)
      pos++
      pos++
      img.width = buffer.readUInt8(pos) + (buffer.readUInt8(pos+1) << 8)
      pos++
      pos++
      img.height = buffer.readUInt8(pos) + (buffer.readUInt8(pos+1) << 8)
      pos++
      pos++
      var packed = getPacked(buffer[pos++])
      // Packed bits:
      //  - Local Color Table Flag        1 Bit
      //  - Interlace Flag                1 Bit
      //  - Sort Flag                     1 Bit
      //  - Reserved                      2 Bits
      //  - Size of Local Color Table     3 Bits
      img.lct_flag = packed.shift()
      img.interlace_flag = packed.shift()
      img.sort_flag = packed.shift()
      img.reserved = packed.splice(0, 2)
      img.lct_size = packed.splice(0, 3).reduce(function(s, n) {
        return s * 2 + n
      }, 0)
      if (img.lct_flag === true) {
        // "To determine that actual size of the color table, raise 2 to [the value of the field + 1]"
        img.lct_size = Math.pow(2, img.lct_size + 1) // "the number of bytes contained in the Global Color Table"
        // Global color table present, parse it
        img.lct = parseCT(img.lct_size)
      }

      // Now we get LZW data
      img.lzw_min_code_size = buffer[pos++]
      img.data = lzwDecode(img.lzw_min_code_size, readSubBlocksAsStr())
      complete(img)
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
          ext.disposal_method = packed.splice(0, 3).reduce(function(s, n) {
            return s * 2 + n
          }, 0)
          ext.user_input = packed.shift()
          ext.transparency_given = packed.shift()
          ext.delay_time = buffer.readUInt8(pos) + (buffer.readUInt8(pos+1) << 8) // No. 1/100s to wait
          pos++
          pos++
          ext.transparency_index = buffer[pos++]
          pos++ // terminator
          break
        case 0xFE:
          // Comment extension
          ext.type = 'comment'
          ext.comment = readSubBlocksAsStr()
          break
        case 0x01:
          // Plain text extension
          ext.type = 'plaintext'
          ext.header = read(12)
          ext.data = readSubBlocksAsStr()
          break
        case 0xFF:
          // App extension
          ext.type = 'application'
          ext.block_size = buffer[pos++]
          ext.identifier = read(8)
          ext.authentication_code = read(3)
          ext.data = readSubBlocksAsStr()
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
        case 0x3B: // End of file
          eof(gif)
          break
        default:
          console.log('Unknown block: ' + id + ' (' + String.fromCharCode(id) + ')')
          eof(gif)
      }
    }

    parseBlocks(cb)
  })
}

module.exports = parseGif
