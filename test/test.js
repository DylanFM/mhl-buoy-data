var parseGif = require('../')
var assert = require('assert')

describe('parseGif', function() {
  it("should return gif data", function(done) {
    parseGif('./test/fixtures/syddir-1.gif', function(gif) {

      assert.equal(gif.signature, 'GIF')
      assert.equal(gif.version, '87a')

      console.log(gif)

      assert.equal(gif.logical_screen_width, 603)
      assert.equal(gif.logical_screen_height, 751)

      done()
    })
  })
})
