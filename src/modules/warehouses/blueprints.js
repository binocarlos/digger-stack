/*

	we boot the given warehouse module
	
*/
var Blueprints = require('digger-blueprints');

module.exports = function(config, $digger){

	if(config.folder){
		config.folder = $digger.filepath(config.folder);
	}
	
	return Blueprints(config);
}