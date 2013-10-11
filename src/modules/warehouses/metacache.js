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

	$digger.radio.listen('*', function(channel, packet){
		if(!packet){
			return;
		}

		if(packet.action=='append'){

			var all_info = {
				tags:[],
				classnames:[],
				ids:[]
			}

			function recurse_container(container){
				var digger = container._digger || {};

				var info = {
					tag:digger.tag,
					classnames:digger.class,
					id:digger.id
				}

				if(info.tag){
					all_info.tags.push(info.tag);
				}
				if(info.classnames){
					info.classnames.forEach(function(classname){
						all_info.classnames.push(classname);
					})
				}
				if(info.id){
					all_info.ids.push(info.id);
				}

				(container._children || []).forEach(function(child){
					recurse_container(child);
				})
			}

			(packet.body || []).forEach(function(data){
				recurse_container(data);
			})

			console.log('-------------------------------------------');
			console.log('-------------------------------------------');
			console.log('added map');
			console.log(JSON.stringify(all_info, null, 4));

		}
		else if(packet.action=='save'){

		}
		else if(packet.action=='remove'){

		}

	})

	var supplier = Warehouse();

	supplier.use(function(req, reply){
		reply(null, [{
			name:'Meta Cache'
		}]);
	})
	
	return supplier;
}