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

    var lsw = []
    lsw[0] = buffer.readUInt8(pos)
    pos++
    lsw[1] = buffer.readUInt8(pos) << 8
    pos++
    gif.logical_screen_width = lsw[1] + lsw[0]

    var lsh = []
    lsh[0] = buffer.readUInt8(pos)
    pos++
    lsh[1] = buffer.readUInt8(pos) << 8
    pos++
    gif.logical_screen_height = lsh[1] + lsh[0]

    cb(gif)
  })
}

module.exports = parseGif
