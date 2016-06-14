def = require('..')

describe 'def()', ->
  it 'should be a function', ->
    expect(typeof def).toEqual 'function'

  it 'can define local modules', ->
    scope = {}
    def 'local_module', scope
    expect(scope.local_module).not.toBeUndefined()
    expect(typeof local_module).toEqual 'undefined'

  it 'can define global modules', ->
    def 'global_module'
    expect(global_module).not.toBeUndefined()
