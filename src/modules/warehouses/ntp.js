/*

	we boot the given warehouse module
	
*/
var Ntp = require('digger-ntp');

module.exports = function(config, $digger){

	return Ntp(config);
}