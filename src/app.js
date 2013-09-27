
function build_middleware($digger, modulename, middleware_config){
 /*
        
  	build the middleware
  	
  */
  return $digger.build(modulename, {
    config:middleware_config
  }, true);
}

function makemodule($digger, middleware_settings){

  var fs = require('fs');

  if(typeof(middleware_settings)==='string'){
    middleware_settings = {
      module:middleware_settings
    }
  }

  var middleware_config = middleware_settings.config || {};
  
  var module = middleware_settings.module;

  if(!module){
    console.error('the middleware must define a module');
    process.exit();
  }

  var app_path = $digger.filepath(module);

  try{
    var stat = fs.statSync(app_path);
  } catch (e){
    stat = null;
  }

  if(!stat){
    return build_middleware($digger, 'middleware/' + module, middleware_config);
  }
  else if(stat.isDirectory()){
    var handlers = {};

    var files = fs.readdirSync(app_path);

    files.forEach(function(file){

      if(file.match(/\.js$/)){
        var name = file.replace(/\.js/, '');
        handlers[name] = build_middleware($digger, app_path + '/' + file, middleware_config);  
      }

      
    })

    return {
      type:'folder',
      handlers:handlers
    }
  }
  else{
    return build_middleware($digger, app_path, middleware_config);
  }
}

function get_middleware_array($digger, middleware){
  var utils = require('digger-utils');
  var stack = [];

  for(var route in middleware){   
    var fn = makemodule($digger, middleware[route]);

    // we have a collection of middleware indexed by filename
    if(fn.type=='folder'){
      var handlers = fn.handlers;
      stack.push({
        route:route,
        fn:function(req, res, next){
          var file = req.url.replace(/^\//, '');
          var handler = handlers[file];
          if(!handler){
            next();
          }
          else{
            handler(req, res, next);
          }
        }
      })
    }
    else{
      stack.push({
        route:route,
        fn:fn
      })
    }
    
  }

  return stack;
}

module.exports = function($digger, id){

  var Serve = require('digger-serve');
  var utils = require('digger-utils');
  var less = require('connect-less');

  var diggerserver = Serve();	
  var diggerapp = diggerserver.app;

  $digger.digger_express = function(){
    return diggerserver.digger_express.apply(diggerserver, utils.toArray(arguments));
  }

	/*
	
		sort out what apps to boot
		
	*/
	var appconfigs = $digger.stack_config.apps || {};

  // the array of apps we will run
  var app_array = [];

  for(var appid in appconfigs){
    var useapp = false;

    if(!id || appid==id){
      useapp = true;
    }
    if(useapp){
      var appconfig = appconfigs[appid];
      appconfig.id = appid;
      app_array.push(appconfig);    
    }
  }

  /*
  
    if they name a specific app but get the name wrong
    
  */
  if(app_array.length<=0){
    console.error('there are no apps by that id: ' + id);
    process.exit();
  }

	/*
	
		mount the websites
		
	*/
	app_array.forEach(function(app_config){

    var domains = app_config.domains || [];
    var middleware = get_middleware_array($digger, app_config.middleware);

    if(typeof(domains)==='string'){
      domains = [domains];
    }

    var document_root = app_config.document_root ? 
      $digger.filepath(app_config.document_root) :
      $digger.filepath(__dirname + '/../assets/www')

    var app = diggerserver.digger_application(domains);

    // gzip output
    app.use(diggerserver.express.compress());
    // less compiler
    app.use(less({
      src:document_root
    }))
    
    console.log('   document_root: ' + document_root);
    // we serve the website files first to avoid there being a redis session for every png
    app.use(diggerserver.express.static(document_root));

    var views = app_config.views;

    if(views){
      var view_root = $digger.filepath(app_config.views);

      var engine = require('ejs-locals');

      app.engine('ejs', engine);
      app.set('view engine', 'ejs');
      app.set('views', view_root);
    }

    var routes = app_config.routes;

    if(routes){

      var routesfn = makemodule($digger, routes);

      // a folder of routes to loop over
      if(routesfn.type=='folder'){
        for(var file in routesfn.handlers){
          var handler = routesfn.handlers[file];
          handler(diggerapp);
        }
      }
      // a single fn to run
      else{
        routesfn(diggerapp);
      }
    }

    // mount middleware
    middleware.forEach(function(warez){
      app.use(warez.route, warez.fn);
    })

    app.use(app.router);
	})

	diggerserver.listen($digger.runtime.http_port, function(){
		console.log('server listening: ' + $digger.runtime.http_port);
	})

  // proxy the web server digger requests onto the overal reception pipeline
  diggerserver.on('digger:request', function(req, reply){
    $digger.emit('digger:request', req, reply);
  })

  return diggerserver;

}
