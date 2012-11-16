var mhl = require('../')
var assert = require('assert')

describe('mhl', function() {
  it("should return wave data", function() {
    var data = mhl.parseImage('fixtures/syddir-1.gif')

    assert(data.direction, 'direction present')
    assert(data.size_max, 'max size present')
    assert(data.size_sig, 'signal size present')
    assert(data.period_max, 'max size present')
    assert(data.period_sig, 'signal size present')
  })
})
