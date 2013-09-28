module.exports = function(program){

  var utils = require('digger-utils');
	var Client = require('digger-client');
  var Radio = require('digger-radio');
	var Build = require('./buildmodule');
	var Runtime = require('./runtime');
	var runtime = Runtime(program);
	var stack_config = runtime.stack_config;

	// make a digger that flags requests as internal
	// it then speaks to reception front door
	var $digger = Client(function(req, reply){
    req.internal = true;
    $digger.emit('digger:request', req, reply);
  });

	$digger.program = program;
	$digger.runtime = runtime;
	$digger.stack_config = stack_config;
  $digger.application_root = runtime.application_root;
  $digger.filepath = runtime.filepath;
  $digger.build = function(){
    var args = utils.toArray(arguments);
    args.unshift(this);
    return Build.apply(null, args);
  }

  /*
  
    give each container it's own radio by wrapping the main one

  */
  $digger.radio = Radio();

  Client.Container.augment_prototype({
    // return a wrapped radio based on the container
    radio:function(){
      return Radio.container_wrapper($digger.radio, this);
    }
  })

  return $digger;
}
