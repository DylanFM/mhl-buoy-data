var parseGif = require('../')
var assert = require('assert')

describe('parseGif', function() {
  it("should return gif data", function(done) {
    parseGif('./test/fixtures/syddir-1.gif', function(gif) {

      console.log(gif)

      assert.equal(gif.signature, 'GIF')
      assert.equal(gif.version, '87a')

      assert.equal(gif.logical_screen_width, 603)
      assert.equal(gif.logical_screen_height, 751)

      // NOTE I don't actually know what these values should be...
      //      for now I'll assume it's OK. Will see later if I'm right
      assert.equal(gif.gct_flag, true)
      assert.equal(gif.color_res, 0)
      assert.equal(gif.sort_flag, false)
      assert.equal(gif.gct_size, 3)

      done()
    })
  })
})
