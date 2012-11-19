var parseGif = require('../gif')
var parseMHLGraph = require('../')
var assert = require('assert')

describe('parseMHLGraph', function() {
  it("parses the 1st sydney data graph", function(done) {
    parseMHLGraph('./test/fixtures/syddir-1.gif', function(conditions) {
      assert.equal(conditions.direction, 137) // Degrees true north
      assert.equal(conditions.hmax, 1.72) // Metres
      assert.equal(conditions.hsig, 0.94) // Metres
      assert.equal(conditions.tp1, 5.06) // Seconds
      assert.equal(conditions.tsig, 5.9) // Seconds

      done()
    })
  })

  it("parses the 2nd sydney data graph", function(done) {
    parseMHLGraph('./test/fixtures/syddir-2.gif', function(conditions) {
      assert.equal(conditions.direction, 182.19) // Degrees true north
      assert.equal(conditions.hmax, 3.17) // Metres
      assert.equal(conditions.hsig, 1.81) // Metres
      assert.equal(conditions.tp1, 5.85) // Seconds
      assert.equal(conditions.tsig, 5.8) // Seconds

      done()
    })
  })
})

describe('parseGif', function() {
  it("should return pretty gif data", function(done) {
    parseGif('./test/fixtures/pretty.gif', function(gif) {

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

      assert.equal(gif.extensions.length, 2)

      // One frame that fills the logical screen
      assert.equal(gif.images.length, 1)

      var img = gif.images[0]
      assert.equal(img.left_pos, 0)
      assert.equal(img.top_pos, 0)
      assert.equal(img.width, 3)
      assert.equal(img.height, 3)
      assert.equal(img.lct_flag, false)
      assert.equal(img.interlace_flag, false)
      assert.equal(img.sort_flag, false)
      assert.equal(img.lct_size, 0)
      assert.equal(img.lzw_min_code_size, 3)
      // 3 rows of 3 columns with indexes relating to the colour they are
      assert.deepEqual(gif.images[0].data, [3,4,1,4,2,5,0,5,4])
      assert.equal(img.data.length, (img.width * img.height))

      done()
    })
  })

  it("should return wikipedia gif data", function(done) {
    parseGif('./test/fixtures/rainbow.gif', function(gif) {

      assert.equal(gif.signature, 'GIF')
      assert.equal(gif.version, '89a')

      assert.equal(gif.logical_screen_width, 40)
      assert.equal(gif.logical_screen_height, 22)

      // NOTE I don't actually know what these values should be...
      assert.equal(gif.gct_flag, true)
      assert.equal(gif.color_res, 6) // Unsure of this value 
      assert.equal(gif.sort_flag, false)
      assert.equal(gif.gct_size, 64) // Size of global color table
      assert.equal(gif.bg_index, 44) // 5th in color table
      assert.equal(gif.pixel_aspect_ratio, 0)

      assert.equal(gif.gct.length, gif.gct_size) // The actual size of GCT should match what the header says

      assert.equal(gif.extensions.length, 1)

      // One frame that fills the logical screen
      assert.equal(gif.images.length, 1)

      var img = gif.images[0]
      assert.equal(img.left_pos, 0)
      assert.equal(img.top_pos, 0)
      assert.equal(img.width, 40)
      assert.equal(img.height, 22)
      assert.equal(img.lct_flag, false)
      assert.equal(img.interlace_flag, false)
      assert.equal(img.sort_flag, false)
      assert.equal(img.lct_size, 0)
      assert.equal(img.lzw_min_code_size, 6)
      // 3 rows of 3 columns with indexes relating to the colour they are
      // So much data... I don't want to deep equal some arrays here
      assert.equal(img.data.length, (img.width * img.height))

      done()
    })
  })
})
