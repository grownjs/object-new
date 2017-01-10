$new = require('..')

describe 'Object.new()', ->
  it 'should be a function', ->
    expect(typeof $new).toEqual 'function'

  it 'should return another function', ->
    expect(typeof $new()).toEqual 'function'

  it 'should return an object when calling', ->
    expect(typeof $new('example')).toEqual 'object'

  it 'should allow multiple calls for nesting', ->
    x = $new('m')
    y = $new('m.n')
    z = $new('m.n.o')

    expect(x.name).toEqual 'm'
    expect(y.name).toEqual 'n'
    expect(z.name).toEqual 'o'
