/*

	we boot the given warehouse module
	
*/
var Mailgun = require('digger-mailgun');

module.exports = function(config, $digger){
	return Mailgun(config);
}