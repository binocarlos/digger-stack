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
      config.name.should.equal('my test network');
      config.warehouses['/mongo'].should.equal('./mongo.js');
      done();
    })
  })

  it('should emit events based on the contents of the digger file', function(done) {
    var stack = Stack(__dirname + '/teststack');

    var warehouses = {};
    var router = null;

    stack.on('warehouse', function(path, value){
      warehouses[path] = value;
    })

    stack.on('router', function(value){
      router = value;
    })

    stack.load(function(error, config){
      warehouses['/mongo'].should.equal('./mongo.js');
      router.should.equal('./router.js');
      done();
    })
  })

})
