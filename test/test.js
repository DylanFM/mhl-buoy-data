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
      assert.equal(gif.gct_flag, '')
      assert.equal(gif.color_res, '')
      assert.equal(gif.sort_flag, '')
      assert.equal(gif.gct_size, '')
      assert.equal(gif.bg_index, '')
      assert.equal(gif.pixel_aspect_ratio, '')

      done()
    })
  })
})
