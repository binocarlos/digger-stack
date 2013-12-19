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

var EventEmitter = require('events').EventEmitter;
var util = require('util');

var Reception = require('digger-reception');
var Warehouse = require('digger-warehouse');
var logger = require('./logger');

/*

	options:

		router - function to run every packet via
	
*/
function Stack(options){
	var self = this;
	EventEmitter.call(this);
	this.options = options || {};
	this.warehouse = Warehouse();
	this.reception = Reception();
	this.reception.on('digger:request', this.request.bind(this));
	
	// log errors
	this.reception.on('digger:contract:error', function(req, error){
		self.log(function(){
			logger.reception_error(req, error);	
		})
		self.emit('digger:contract:error', req, error);
  })

  // log symlinks
  this.reception.on('digger:symlink', function(link){
  	self.log(function(){
			logger.symlink(link);
		})
    self.emit('digger:contract:symlink', link);
  })

  // log results
  this.reception.on('digger:contract:results', function(req, count){
  	self.log(function(){
			logger.reception_results(req, count);	
		})
    self.emit('digger:contract:results', req, count);
  })

  if(this.options.suppliers){
  	Object.keys(this.options.suppliers || {}).forEach(function(route){
  		var handler = self.options.suppliers[route];
  		self.use(route, handler);
  	})
  }
}

util.inherits(Stack, EventEmitter);

module.exports = Stack;

Stack.prototype.run_router = function(req, reply, next){
	var self = this;
	if(this.options.router){
		this.options.router(req, function(error, answer){
      if(error){
      	self.log(function(){
      		logger.error(error);
      	})
      	self.emit('digger:router:error', req, error);
      }
      reply(error, answer);
    }, next)
	}
	else{
		next();
	}
}

Stack.prototype.request = function(req, reply){
	var self = this;
	var start = new Date().getTime();

  this.run_router(req, reply, function(){
  	self.warehouse(req, function(error, results){
  		var gap = new Date().getTime() - start;
	    reply(error, results);
	    if(!req.fromcontract){
	      req.gap = gap;
	      self.emit('digger:request:results', req, results);
	      self.log(function(){
	      	logger.request(req, results);	
	      })
	      
	    }
  	}, function(){
  		reply('404:no route found');
  	})
  });
}

Stack.prototype.log = function(fn){
	if(this.options.log!=false){
		fn();
	}
}

Stack.prototype.use = function(route, handler){

	this.warehouse.use(route, function(req, res){
		req.headers['x-supplier-route'] = route;
    if((req.url || '').length<=0){
    	req.url = '/';
    }
    handler(req, res);
	})

}