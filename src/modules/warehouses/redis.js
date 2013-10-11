/*

	we boot the given warehouse module
	
*/
var Redis = require('digger-redis');

module.exports = function(config, $digger){

	return Redis(config);
}