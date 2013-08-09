/*

	(The MIT License)

	Copyright (C) 2005-2013 Kai Davenport

	Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

 */

var yaml = require('js-yaml');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var fs = require('fs');
var path = require('path');

function Stack(folder){
  this.folder = folder;
}

util.inherits(Stack, EventEmitter);

Stack.prototype.config_path = function(){
  return path.normalize(this.folder + '/digger.yaml');
}

Stack.prototype.load = function(done){
  var self = this;
  fs.exists(self.config_path(), function(exists){
    if(!exists){
      done(self.folder + ' does not contain a digger.yaml file');
      return;
    }

    try {
      var doc = require(self.config_path());
    } catch (e) {
      done(e);
      return;
    }

    self.config = doc;

    for(var name in self.config.warehouses || {}){
      self.emit('warehouse', name, self.config.warehouses[name]);
    }

    if(self.config.router){
      self.emit('router', self.config.router);
    }
    
    done(null, doc);
  })
}

module.exports = function(stackfolder){
  var stack = new Stack(stackfolder);
  return stack;
}