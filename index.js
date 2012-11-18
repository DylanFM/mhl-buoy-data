var parseGif = require('./gif')


var parseMHLGraph = function(path, cb) {
  parseGif(path, function(gif) {
    var conditions = {}

    cb(conditions)
  })
}


module.exports = parseMHLGraph
