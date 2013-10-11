/*

	we boot the given warehouse module
	
*/
var Warehouse = require('digger-warehouse');

/*

	we listen to all events on the radio

	process the packet and update the cache for the affected warehouse

	we can than ask this supplier for:

		tag, class, id and attr

	it will return a weighted list of names for each type
	
*/
module.exports = function(config, $digger){

	$digger.radio.listen('*', function(){
		console.log('-------------------------------------------');
		console.log('-------------------------------------------');
		console.log('META CACHE!!!');
	})

	var supplier = Warehouse();

	supplier.use(function(req, reply){
		reply(null, [{
			name:'Meta Cache'
		}]);
	})
	
	return supplier;
}