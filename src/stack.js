/*

  text
  
*/
module.exports = function(program){

  var Radio = require('digger-radio')
  var Digger = require('./digger');
  var App = require('./app');
  var logger = require('./logger');

  var $digger = Digger(program);
  var config = $digger.stack_config;

  // website only
  if(Object.keys(config.warehouses||{})<=0){
    App($digger)
    return;
  }

  var Reception = require('./reception');
  var Warehouse = require('./warehouse');

  var reception = Reception($digger);
  var warehouses = Warehouse($digger);
  var app = App($digger);

  // FRONT
  // pipe general requests to reception
  $digger.on('digger:request', function(req, res){
    process.nextTick(function(){
      reception(req, res);
    })
  });

  // BACK
  // requests going back to warehouses from reception
  reception.on('digger:warehouse', function(req, res){
    process.nextTick(function(){
      warehouses(req, function(error, results){
        res(error, results)
      });
    })
  })

  /*
  
    warehouse event -> pub/sub switchboard
    
  */
  warehouses.on('digger:radio', function(channel, body){
    $digger.radio.receive(channel, body);
    logger.radio('talk', channel);
  })

  /*
  
    user radio event -> pub/sub switchboard
    
  */
  $digger.on('digger:radio', function(action, channel, body){
    if(action=='listen'){
      $digger.radio.listen(channel, body);
      logger.radio('listen', channel);
    }
    else if(action=='cancel'){
      $digger.radio.cancel(channel, body); 
    }
    else if(action=='talk'){
      $digger.radio.receive(channel, body);
      logger.radio('talk', channel);
    }
  })

  $digger.on('digger:log', function(action, message){
    logger.app(action, message);
  })
}