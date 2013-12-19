/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */


/**
 * Module dependencies.
 */

function logger(parts){
  console.log(parts.join("\t"));
}


function reception_error_logger(req, error){
  var parts = [
    new Date().getTime(),
    'error',
    req.url,
    error
  ]
  logger(parts);
}

function reception_results_logger(req, count){
  var parts = [
    new Date().getTime(),
    'contract',
    req.headers['x-contract-type'],
    (req.body || []).length,
    req.headers['x-request-time'] + 'ms',
    contract_summary(req),
    count
  ]
  logger(parts);
}

function radio_logger(action, channel){
  var parts = [
    new Date().getTime(),
    'radio',
    action,
    channel
  ]
  logger(parts);
}

function error_logger(req, error){
  var parts = [
    new Date().getTime(),
    'error',
    req.url,
    error
  ]
  logger(parts);
}

function provision_logger(routes, resource){
  var parts = [
    new Date().getTime(),
    'provision',
    routes.supplier_route,
    JSON.stringify(resource)
  ]
  logger(parts);
}

function action_logger(type, req, resultcount){
  var data = '';

  if(type==='select'){
    return;
    //data = (req.selector || {}).string;
  }
  else{
    data = (req.body || []).length;
  }

  var body = req.body || [];
  var tag = body.length>0 ? (body[0]._digger ? body[0]._digger.tag : '') : '';

  var parts = [
    new Date().getTime(),
    'action:' + type,
    req.headers['x-supplier-route'] + req.url//,
    //body.length + ' ' + tag + ' -> ' + data + ' -> ' + resultcount
  ]

  logger(parts);
}

function symlink_logger(link){
  var parts = [
    new Date().getTime(),
    'symlink',
    link.type,
    link.warehouse,
    link.diggerid || link.selector
  ]

  logger(parts);
}

function contract_summary(req){
  var reqs = (req.body || []).map(function(req){
    var headers = req.headers || {};
    if(headers['x-json-selector']){
      var selector = headers['x-json-selector'];
      return selector.string;
    }
    else{
      return null;
    }
  }).filter(function(req){
    return req!==null;
  })

  return reqs.join('');
}

function app_logger(action, message){
  var parts = [
    new Date().getTime(),
    action,
    message
  ]

  logger(parts);
}

function request_logger(req, results){
  if(req.headers['x-reception']){
    return;
  }

  var url = req.url;

  if(req.headers['x-supplier-route']){
    url = req.headers['x-supplier-route'] + req.url;
  }
  var parts = [
    new Date().getTime(),
    'request',
    req.method.toLowerCase(),
    url,
    req.gap + 'ms',
    'body:' + (req.body ? req.body.length : 0)
  ]

  if(req.headers['x-json-selector']){
    parts.push(req.headers['x-json-selector'].string);
  }

  if(results){
    parts.push(results.length + ' results');
  }
  logger(parts);
}

function stack_logger(program){

  var Runtime = require('./runtime');
  var runtime = Runtime(program);
  var config = runtime.stack_config;

  var default_ports = {
    redis:6379,
    mongo:27017
  }

  console.log('');
  console.log('   * application root:         ' + config.application_root);      
  if(config.reception.router){
  console.log('   * reception router:         ' + config.reception.router);
  }
  
  console.log('   * services:');
  for(var service in config.services){
    console.log('     * ' + service);
    var prefix = 'DIGGER_' + service.toUpperCase();
    var host = process.env[prefix + '_HOST'];
    if(!host){
      host = '127.0.0.1';
    }
    var port = process.env[prefix + '_PORT'];
    if(!port){
      port = default_ports[service];
    }

    console.log('       host:                   ' + host);
    console.log('       port:                   ' + port);
  }
  console.log('   * warehouses:         ');
  function logwarehouse(name, warehouse){
    var wconfig = warehouse.config;
    console.log('     * ' + name);
    for(var k in wconfig){
      console.log('       ' + k + ': ' + wconfig[k]);
    }
  }
  function logapp(name, app){
    var aconfig = app;

    console.log('     * ' + name);
    console.log('     * ' + app.document_root);
    (aconfig.domains || []).forEach(function(d){
      console.log('         * ' + d);
    })
    
  }
  for(var warehouse in config.warehouses){
    logwarehouse(warehouse, config.warehouses[warehouse]);
  }
  console.log('   * apps:         ');
  for(var app in config.apps){
    logapp(app, config.apps[app]);
  }

}


module.exports = {
  array:logger,
  app:app_logger,
  error:error_logger,
  radio:radio_logger,
  reception_error:reception_error_logger,
  reception_results:reception_results_logger,
  action:action_logger,
  request:request_logger,
  symlink:symlink_logger,
  provision:provision_logger,
  stack:stack_logger
}