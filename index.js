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
    var lsw = []
    lsw[0] = buffer.readUInt8(pos)
    pos++
    lsw[1] = buffer.readUInt8(pos) << 8
    pos++
    gif.logical_screen_width = lsw[1] + lsw[0]

    // Logical screen height, 2 bits unsigned ints
    var lsh = []
    lsh[0] = buffer.readUInt8(pos)
    pos++
    lsh[1] = buffer.readUInt8(pos) << 8
    pos++
    gif.logical_screen_height = lsh[1] + lsh[0]

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
    }, 0)
    gif.sort_flag = a.shift()
    gif.gct_size = a.splice(0,3).reduce(function(s, n) {
      return s * 2 + n
    }, 0)
    pos++

    // TODO make use of gct flag to know whether to expect gct now or not



    cb(gif)
  })
}

module.exports = parseGif
