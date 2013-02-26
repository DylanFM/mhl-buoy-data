var parseGif = require('../gif')
var parseMHLGraph = require('../')
var assert = require('assert')

describe('parseMHLGraph', function() {
  //it("parses the 1st sydney data graph by URL", function(done) {
  //  parseMHLGraph('http://dl.dropbox.com/u/1614309/MHL%20repo/syddir-1.gif', function(err, conditions) {
  //    assert.equal(conditions.direction, 138.5) // Degrees true north
  //    assert.equal(conditions.hmax, 1.8) // Metres
  //    assert.equal(conditions.hsig, 1.0) // Metres
  //    assert.equal(conditions.tp1, 5.1) // Seconds
  //    assert.equal(conditions.tsig, 5.9) // Seconds

  //    done()
  //  })
  //})

  it("parses the 1st sydney data graph", function(done) {
    parseMHLGraph('./test/fixtures/syddir-1.gif', function(err, conditions) {
      assert.equal(conditions.direction, 138.5) // Degrees true north
      assert.equal(conditions.hmax, 1.8) // Metres
      assert.equal(conditions.hsig, 1.0) // Metres
      assert.equal(conditions.tp1, 5.1) // Seconds
      assert.equal(conditions.tsig, 5.9) // Seconds

      done()
    })
  })

  it("parses the 2nd sydney data graph", function(done) {
    parseMHLGraph('./test/fixtures/syddir-2.gif', function(err, conditions) {
      assert.equal(conditions.direction, 185.1)
      assert.equal(conditions.hmax, 3.2)
      assert.equal(conditions.hsig, 1.9)
      assert.equal(conditions.tp1, 5.8)
      assert.equal(conditions.tsig, 5.6)

      done()
    })
  })

  it("parses the kembla data graph", function(done) {
    parseMHLGraph('./test/fixtures/kembla-1.gif', function(err, conditions) {
      assert.equal(conditions.direction, 168.4)
      assert.equal(conditions.hmax, 2.7)
      assert.equal(conditions.hsig, 1.5)
      assert.equal(conditions.tp1, 8.2)
      assert.equal(conditions.tsig, 7.3)

      done()
    })
  })

  it("parses the bateman data graph", function(done) {
    parseMHLGraph('./test/fixtures/batman-1.gif', function(err, conditions) {
      assert.equal(conditions.direction, 182.9)
      assert.equal(conditions.hmax, 4.3)
      assert.equal(conditions.hsig, 2.2)
      assert.equal(conditions.tp1, 7.8)
      assert.equal(conditions.tsig, 7.1)

      done()
    })
  })

  it("parses the byron data graph", function(done) {
    parseMHLGraph('./test/fixtures/byron-1.gif', function(err, conditions) {
      assert.equal(conditions.direction, 103.1)
      assert.equal(conditions.hmax, 1.8)
      assert.equal(conditions.hsig, 1.1)
      assert.equal(conditions.tp1, 6.6)
      assert.equal(conditions.tsig, 7.2)

      done()
    })
  })

  it("parses the coffs data graph", function(done) {
    parseMHLGraph('./test/fixtures/coffs-1.gif', function(err, conditions) {
      assert.equal(conditions.direction, 161.1)
      assert.equal(conditions.hmax, 3.5)
      assert.equal(conditions.hsig, 1.9)
      assert.equal(conditions.tp1, 8.5)
      assert.equal(conditions.tsig, 6.8)

      done()
    })
  })

  it("parses the eden data graph", function(done) {
    parseMHLGraph('./test/fixtures/eden-1.gif', function(err, conditions) {
      assert.equal(conditions.direction, 133.5)
      assert.equal(conditions.hmax, 5.2)
      assert.equal(conditions.hsig, 2.9)
      assert.equal(conditions.tp1, 8.5)
      assert.equal(conditions.tsig, 8.0)

      done()
    })
  })

  it("parses the gnarly eden data graph", function(done) {
    parseMHLGraph('./test/fixtures/eden-2.gif', function(err, conditions) {
      assert.equal(conditions.direction, 229.2)
      assert.equal(conditions.hmax, 2.5)
      assert.equal(conditions.hsig, 1.5)
      assert.equal(conditions.tp1, 4.9)
      assert.equal(conditions.tsig, 6.8)

      done()
    })
  })

  it("returns an error for the empty Eden gif", function(done) {
    parseMHLGraph('./test/fixtures/eden-3.gif', function(err, conditions) {

      assert(err)
      assert(!conditions)
      
      done()
    })
  })

  // Test failure
  it("it doesn't parse the pretty gif", function(done) {
    parseMHLGraph('./test/fixtures/pretty.gif', function(err, conditions) {

      assert(err)
      assert(!conditions)

      done()
    })
  })
})

describe('parseGif', function() {
  it("doesn't like bad files", function(done) {
    parseGif('./test/test.js', function(err, gif) {

      assert(err)
      assert(!gif)

      done()
    })
  })

  it("should return pretty gif data", function(done) {
    parseGif('./test/fixtures/pretty.gif', function(err, gif) {

      assert(!err)

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
    parseGif('./test/fixtures/rainbow.gif', function(err, gif) {

      assert(!err)

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
