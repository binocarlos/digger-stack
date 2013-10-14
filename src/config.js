/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

/*
  Module dependencies.
*/
var fs = require('fs');
var yaml = require('js-yaml');
var wrench = require('wrench');
var path = require('path');
var hogan = require("hogan.js");
var merge = require('merge-recursive');

/*

	returns a list of the services required for the given warehouse config

	e.g.

		INPUT

			{
				type:mongo
			}

		OUTPUT

		{
			mongo:true
		}
	
*/
function warehouse_services(config){
	var ret = {
		
	};

	if(config.module==='mongo'){
		ret.mongo = true;
	}

	return ret;
}

/*

	returns a list of the services required for the given app config
	
*/
function app_services(config){
	var ret = {
		
	};

	// if the app has middleware - we assume they will want a redis cache
	if(config.handlers && Object.keys(config.handlers).length>0){
		ret.redis = true;
	}

	return ret;
}

module.exports = function(application_root){
	var config_path = path.normalize(application_root + '/digger.yaml');

	if(!fs.existsSync(config_path)){
		console.error(config_path + ' does not exist');
		process.exit();
	}

	function run_load(done){

		var apps = {};
		var warehouses = {};
		var reception = {};

		// the github modules we need to download before booting
		var gitrepos = {

		};

		// the docker containers the stack needs alongside nodes
		var services = {
			
		};

		function add_module(module){

			// a github module - we download and npm install this
			if(module.match(/^([\w-]+)\/([\w-]+)$/)){
				gitrepos[module] = './.quarry/gitmodules/' + module;
				//moduleconfig
				return gitrepos[module];
			}
			// a local module
			else if(module.match(/^\./)){
				return module;
			}
			// an npm module in their package.json
			else{
				return module=='digger' ? module : './node_modules/' + module;
			}
		}

		function add_warehouse(id, config){
			if(id=='/reception'){
				config.id = '/reception';
				reception = config;
			}
			else{
				if(typeof(config)=='string'){
					config = {
						module:config
					}
				}
				config.id = id;
				warehouses[id] = config;
				var addservices = warehouse_services(config);
				for(var prop in addservices){
					services[prop] = addservices[prop];
				}
				config.module = add_module(config.module);
			}
		}

		function add_app(id, config){
			config.id = id;
			var addservices = app_services(config);
			for(var prop in addservices){
				services[prop] = addservices[prop];
			}

			/*
			
				loop handlers and process middleware & document_root for git downloads
				
			*/
			if(config.handlers){
				(Object.keys(config.handlers)).forEach(function(route){
					var handler = config.handlers[route];

					if(typeof(handler)==='string'){
						config.handlers[route] = add_module(handler);
						config.handlers[route].id = route;
					}
					else{
						handler.module = add_module(handler.module);
						handler.id = route;
						handler.config = handler.config || {};
						handler.config.id = route;
					}

				})
			}

			apps[id] = config;
		}

		var yamlstring = fs.readFileSync(config_path, 'utf8');

		/*
		
			run via template
			
		*/
		var template = hogan.compile(yamlstring);

		var yamloutput = template.render({
			application_root:application_root,
			build:application_root + '/.quarry'			
		});

	  var doc = yaml.safeLoad(yamloutput);

	  //doc.application_root = application_root;
	  //doc.build = application_root;


		/*
		
			check if there are overrides in the environment
			
		*/

		var current_env = process.env.NODE_ENV;
		var env = doc.env;
		delete(doc.env);

		var env_config = env ? env[current_env] : null;

		if(env_config){
			doc = merge.recursive(doc, env_config);
		}

	  for(var id in doc){
	  	var config = doc[id];

	  	/*
	  	
	  		warehouses begin with a slash
	  		
	  	*/
	  	if(id.charAt(0)==='/'){
	  		add_warehouse(id, config);
	  	}
	  	/*
	  	
	  		otherwise it's an app
	  		
	  	*/
	  	else{
	  		add_app(id, config);
	  	}
	  }

	  add_warehouse = null;
	  add_app = null;
	  doc = null;

	  done(null, {
	  	application_root:application_root,
	  	gitrepos:gitrepos,
	  	services:services,
	  	reception:reception,
	  	warehouses:warehouses,
	  	apps:apps
	  })
	}

	return {
		load:run_load
	}

}