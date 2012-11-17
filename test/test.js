var parseGif = require('../')
var assert = require('assert')

describe('parseGif', function() {
  it("should return gif data", function(done) {
    parseGif('./test/fixtures/pretty.gif', function(gif) {

      console.log(gif)

      assert.equal(gif.signature, 'GIF')
      assert.equal(gif.version, '89a')

      assert.equal(gif.logical_screen_width, 3)
      assert.equal(gif.logical_screen_height, 3)

      // NOTE I don't actually know what these values should be...
      assert.equal(gif.gct_flag, true)
      assert.equal(gif.color_res, '') // ? in spec but not in wikipedia explanation
      assert.equal(gif.sort_flag, false)
      assert.equal(gif.gct_size, 6)
      assert.equal(gif.bg_index, 0) // 1st in color table, black
      assert.equal(gif.pixel_aspect_ratio, 0)

      assert.equal(gif.gct.length, 6)

      done()
    })
  })
})
