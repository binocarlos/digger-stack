
function build_handler($digger, modulename, handler_config){
 /*
        
  	build the middleware
  	
  */
  return $digger.build(modulename, {
    config:handler_config
  }, true);
}

function makemodule($digger, handler_settings){

  var fs = require('fs');

  if(typeof(handler_settings)==='string'){
    handler_settings = {
      module:handler_settings
    }
  }

  var handler_config = handler_settings.config || {};
  
  var module = handler_settings.module;

  if(module.indexOf('.')==0){
    module = $digger.filepath(module);
  }

  if(!module){
    console.error('the middleware must define a module');
    process.exit();
  }

  if(module=='digger'){
    return $digger.digger_middleware(handler_settings);
  }
  
  try{
    var stat = fs.statSync(module);
  } catch (e){
    stat = null;
  }

  

  if(stat.isDirectory()){

    // a single node module
    if(fs.existsSync(module + '/package.json')){
      return build_handler($digger, module, handler_config);
    }
    // a folder of files
    else{
      var handlers = {};

      var files = fs.readdirSync(module);

      files.forEach(function(file){

        if(file.match(/\.js$/)){
          var name = file.replace(/\.js/, '');
          handlers[name] = build_handler($digger, module + '/' + file, handler_config);  
        }

        
      })

      return {
        type:'folder',
        handlers:handlers
      }
    }
    
  }
  else{
    return build_handler($digger, module, handler_config);
  }
}

function get_handler_array($digger, handlers){
  var utils = require('digger-utils');
  var stack = [];

  for(var route in handlers){

    var fn = makemodule($digger, handlers[route]);

    // we have a collection of middleware indexed by filename
    if(fn.type=='folder'){
      var folderhandlers = fn.handlers;
      stack.push({
        route:route,
        fn:function(req, res, next){
          var file = req.url.replace(/^\//, '');
          var handler = folderhandlers[file];
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

  $digger.digger_middleware = function(){
    return diggerserver.digger_middleware.apply(diggerserver, utils.toArray(arguments));
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

  console.log('');
  console.log('   mounting websites');
  console.log('');

	/*
	
		mount the websites
		
	*/
	app_array.forEach(function(app_config){

    var domains = app_config.domains || [];
    var handlers = get_handler_array($digger, app_config.handlers);

    if(typeof(domains)==='string'){
      domains = [domains];
    }

    var document_root = app_config.document_root ? 
      $digger.filepath(app_config.document_root) :
      $digger.filepath(__dirname + '/../assets/www')

    var views = app_config.views;

    /*
    
      create the user app
      
    */
    var app = diggerserver.app_server(domains, function(userapp){
      
      var view_root = $digger.filepath(app_config.views);

      if(views){
        var engine = require('ejs-locals');

        userapp.set('views', view_root);
        userapp.engine('html', engine);
        userapp.set('view engine', 'html');
      }
      
      // gzip output
      userapp.use(diggerserver.express.compress());
      // less compiler
      userapp.use(less({
        src:document_root
      }))
    });

    var domainst = domains.map(function(d){
      return '        ' + d;
    }).join("\n");
    
    console.log('');
    console.log('     document_root: ' + document_root);
    console.log('');
    console.log(domainst);
    console.log('');

    // do we have custom js routes?
    var routes = app_config.routes;

    if(routes){

      console.log('     routes: ' + routes);

      var routesfn = makemodule($digger, routes);

      // a folder of routes to loop over
      if(routesfn.type=='folder'){
        for(var file in routesfn.handlers){
          var handler = routesfn.handlers[file];

          handler(app);
        }
      }
      // a single fn to run
      else{
        routesfn(app);
      }
    }


    // mount digger.yaml middleware
    handlers.forEach(function(handler){

      // this lets middleware look after their own mounting
      // this is for the auth module because it uses it's mount path internally
      // to derive the oauth callbacks
      if(handler.fn._diggermount){
        handler.fn._diggermount(app, handler.fn, handler.route);
      }
      // this means we are mounting the middleware based on the route in the digger.yaml
      else{
        app.use(handler.route, handler.fn);
      }

      console.log('     handler: ' + handler.route);
    })

    app.use(app.router);
    app.use(diggerserver.express.static(document_root));

    app.post_setup();
	})

  console.log('');

	diggerserver.listen($digger.runtime.http_port, function(){
		console.log('server listening: ' + $digger.runtime.http_port);
	})

  // proxy the web server digger requests onto the overal reception pipeline
  diggerserver.on('digger:request', function(req, reply){
    $digger.emit('digger:request', req, reply);
  })

  diggerserver.on('digger:radio', function(action, channel, body){
    $digger.emit('digger:radio', action, channel, body);
  })

  return diggerserver;

}
