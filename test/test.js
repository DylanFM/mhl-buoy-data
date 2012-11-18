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
      assert.equal(gif.color_res, 3) // Unsure of this value 
      assert.equal(gif.sort_flag, false)
      assert.equal(gif.gct_size, 8) // Size of global color table
      assert.equal(gif.bg_index, 5) // 5th in color table
      assert.equal(gif.pixel_aspect_ratio, 0)

      assert.equal(gif.gct.length, gif.gct_size) // The actual size of GCT should match what the header says

      // One frame that fills the logical screen
      assert.equal(gif.images.length, 1)
      assert.equal(gif.images[0].left_pos, 0)
      assert.equal(gif.images[0].top_pos, 0)
      assert.equal(gif.images[0].width, 3)
      assert.equal(gif.images[0].height, 3)

      assert.equal(gif.extensions.length, 2)

      done()
    })
  })
})
