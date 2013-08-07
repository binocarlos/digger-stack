var Stack = require('../src');

describe('stack', function(){

  it('should emit events', function(done) {

    var stack = Stack();

    stack.on('test', done);
    stack.emit('test');
  })

  it('should load a digger yaml file', function(done) {
    var stack = Stack(__dirname + '/teststack');

    stack.load(function(error, config){
      config.name.should.equal('test');
      done();
    })
  })

})
