module.exports = function(program){
	var fs = require('fs');
	var path = require('path');
	var tools = require('./tools');
	var Config = require('./config');
	var wrench = require('wrench');
	var utils = require('digger-utils');

	var application_root = tools.application_root();
  var build_root = application_root + '/.quarry';

  var is_digger = fs.existsSync(application_root + '/digger.yaml');

  wrench.mkdirSyncRecursive(build_root, 0777);

  var name = application_root.split('/').pop();

  // the things we should only have to boot once
  if(!fs.existsSync(build_root + '/services')){
    wrench.mkdirSyncRecursive(build_root + '/services', 0777);
  }

  // stack wide environment variables written one value per named file
  /*
  if(!fs.existsSync(build_root + '/env')){
    wrench.mkdirSyncRecursive(build_root + '/env', 0777);
  }
  */

  if(!fs.existsSync(build_root + '/nodes')){
    wrench.mkdirSyncRecursive(build_root + '/nodes', 0777);
  }

  /*
  
    we are building a digger application
    
  */
  function build_digger(){
    var stack_config = Config(application_root);

    for(var servicename in (stack_config.services|| {})){
      if(!fs.existsSync(build_root + '/services/' + servicename)){
        fs.writeFileSync(build_root + '/services/' + servicename, '', 'utf8');
      }
    }

    var allroutes = [];
    for(var warehousename in (stack_config.warehouses || {})){
      var app = stack_config.warehouses[warehousename];

      allroutes.push(warehousename);

      var nodename = warehousename.replace(/^\//, '').replace(/\//g, '_');

      // this is for when we scale
      /*
      if(!fs.existsSync(build_root + '/nodes/' + nodename)){
        fs.writeFileSync(build_root + '/nodes/' + nodename, 'digger warehouse ' + nodename, 'utf8');
      }
      */
    }

    var alldomains = [];

    for(var i in (stack_config.apps || {})){
      var app = stack_config.apps[i];

      (app.domains || []).forEach(function(domain){
        alldomains.push(domain);
      })

      // this is for when we scale
      /*
      if(!fs.existsSync(build_root + '/nodes/' + app.id)){
        fs.writeFileSync(build_root + '/nodes/' + app.id, 'digger warehouse ' + nodename, 'utf8');
      }
      */
    }

    // we want a blank line on the end because I am shit at bash scripts and it misses the last line
    alldomains.push('');
    fs.writeFileSync(build_root + '/domains', alldomains.join("\n") + "\n", 'utf8');

    fs.writeFileSync(build_root + '/nodes/all', 'digger run', 'utf8');
    fs.writeFileSync(build_root + '/digger.json', JSON.stringify(stack_config, null, 4), 'utf8');
  }

  function build_app(){
    if(fs.existsSync(application_root + '/domains')){
      var domains = fs.readFileSync(application_root + '/domains', 'utf8');
      fs.writeFileSync(build_root + '/domains', (domains + "\n").replace(/\n\n$/, "\n"), 'utf8');      
    }

    if(fs.existsSync(application_root + '/services')){
      var services = fs.readFileSync(application_root + '/services', 'utf8');
      services = (services || '').split(/\n/).filter(function(service){
        return service && service.length>0;
      })

      services = services || [];

      services.forEach(function(servicename){
        if(!fs.existsSync(build_root + '/services/' + servicename)){
          fs.writeFileSync(build_root + '/services/' + servicename, '', 'utf8');
        }
      })
    }

    fs.writeFileSync(build_root + '/nodes/all', 'node index.js', 'utf8');
  }

  is_digger ? build_digger() : build_app();

  console.log('built: ' + application_root + '/.quarry');
	

}