/*

  the server side digger build used by server scripts and modules
  
*/

module.exports = function(program){

  var utils = require('digger-utils');
	var Client = require('digger-client');
  var Radio = require('digger-radio');
	var Build = require('./buildmodule');
	var Runtime = require('./runtime');
	var runtime = Runtime(program);
	var stack_config = runtime.stack_config;
  var Redis = require('redis');

  var cache = Redis.createClient({
      host:process.env.DIGGER_REDIS_HOST || '127.0.0.1',
      port:process.env.DIGGER_REDIS_PORT || 6379,
      pass:process.env.DIGGER_REDIS_PASSWORD || null,
      prefix:'digger:cache'
  })

	// make a digger that flags requests as internal
	// it then speaks to reception front door
	var $digger = Client(function(req, reply){
    req.internal = true;
    $digger.emit('digger:request', req, reply);
  });

  $digger.cache = cache;
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
