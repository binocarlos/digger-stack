/*

	we boot the given warehouse module
	
*/
var Supplier = require('digger-supplier');
var async = require('async');

/*

	we listen to all events on the radio

	process the packet and update the cache for the affected warehouse

	we can than ask this supplier for:

		tag, class, id and attr

	it will return a weighted list of names for each type
	
*/
module.exports = function(config, $digger){

	function remove_data(base_key, data, done){
		var fns = [];

		if(data.tag){
			fns.push(function(next){
				$digger.cache.zincrby(base_key + 'tag', -1, data.tag, next);
			})
		}

		if(data.id){
			fns.push(function(next){
				$digger.cache.zincrby(base_key + 'id', -1, data.id, next);
			})
		}

		if(data.class){
			data.class.forEach(function(c){
				fns.push(function(next){
					$digger.cache.zincrby(base_key + 'class', -1, c, next);
				})	
			})
			
		}

		async.parallel(fns, done);
	}

	$digger.radio.listen('*', function(channel, packet){

		if(!packet){
			return;
		}

		/*
		
			when a container is appended - we create the following keys:

			<warehouse_url>/tag
			<warehouse_url>/class
			<warehouse_url>/id

			each is a sorted set - we can read what tags, classnames and ids in order of appearance
			by doing a zrevrange <warehouse_url>/id 0 -1

			we also keep a hash for each containers data - this means we keep our index up to date with saves
			also for deletes we just need the id

			<warehouse_url>/containers is a hash - each field is the id of a container with a JSON string of it's meta
			
		*/
		if(packet.action=='append'){

			var headers = packet.headers || {};
			var supplier_url = headers['x-supplier-route'];
			var base_key = supplier_url + '/';

			if(!supplier_url){
				return;
			}

			var all_info = {
				tag:[],
				class:[],
				id:[]
			}

			var containers = {};

			function recurse_container(container){
				var digger = container._digger || {};
				var container_info = {};

				if(digger.tag){
					container_info.tag = digger.tag;
					all_info.tag.push(digger.tag);
				}
				if(digger.class){
					container_info.class = digger.class;
					digger.class.forEach(function(classname){
						all_info.class.push(classname);
					})
				}
				if(digger.id){
					container_info.id = digger.id;
					all_info.id.push(digger.id);
				}

				containers[digger.diggerid] = container_info;

				(container._children || []).forEach(function(child){
					recurse_container(child);
				})
			}

			(packet.body || []).forEach(function(data){
				recurse_container(data);
			})

			var arr = ['tag', 'class', 'id'];
			var fns = [];

			arr.forEach(function(prop){

				var key = base_key + prop;

				var arr = all_info[prop];
				var counts = {};
				arr.forEach(function(val){
					if(!counts[val]){
						counts[val] = 0;
					}

					counts[val]++;
				})

				Object.keys(counts).forEach(function(member){
					var count = counts[member];
					var useprop = member;
					fns.push(function(next){
						$digger.cache.zincrby(key, count, useprop, next);
					})
				})

			})

			Object.keys(containers).forEach(function(containerid){
				var info = containers[containerid];
				var infost = JSON.stringify(info);
				var key = base_key + 'containers';

				fns.push(function(next){
					$digger.cache.hset(key, containerid, infost, next);
				})
				
			})

			async.parallel(fns, function(){

			})
		}
		else if(packet.action=='save'){

			var headers = packet.headers || {};
			var supplier_url = headers['x-supplier-route'];
			var base_key = supplier_url + '/';

			if(!supplier_url){
				return;
			}

			var model = packet.body || {};
			var digger = model._digger || {};
			var containerid = digger.diggerid;

			var newdata = {
				id:digger.id,
				tag:digger.tag,
				class:digger.class
			}

			if(!containerid){
				return;
			}

			var fns = [];

			$digger.cache.hget(base_key + 'containers', containerid, function(error, st){
				if(error){
					console.error('redis error: ' + error);
					return;
				}

				var data = JSON.parse(st);

				// reduce the cache
				remove_data(base_key, data, function(){

					var addfns = [];

					if(newdata.id){
						addfns.push(function(nextfn){
							$digger.cache.zincrby(base_key + 'id', 1, newdata.id, nextfn);
						})
					}

					if(newdata.tag){
						addfns.push(function(nextfn){
							$digger.cache.zincrby(base_key + 'tag', 1, newdata.tag, nextfn);
						})
					}

					if(newdata.class){
						newdata.class.forEach(function(c){
							addfns.push(function(nextfn){
								$digger.cache.zincrby(base_key + 'class', 1, c, nextfn);
							})	
						})
						
					}

					async.parallel(addfns, function(){

					})

				})
				

			})

		}
		else if(packet.action=='remove'){
			
			var headers = packet.headers || {};
			var supplier_url = headers['x-supplier-route'];
			var base_key = supplier_url + '/';

			if(!supplier_url){
				return;
			}

			var model = packet.body || {};
			var digger = model._digger || {};
			var containerid = digger.diggerid;

			if(!containerid){
				return;
			}

			var fns = [];

			$digger.cache.hget(base_key + 'containers', containerid, function(error, st){
				if(error){
					console.error('redis error: ' + error);
					return;
				}
				
				var data = JSON.parse(st);

				// reduce the cache
				remove_data(base_key, data, function(){
					$digger.cache.hdel(base_key + 'containers', containerid, function(error){

					})
				})
			})
		}

	})

	var supplier = Supplier();

	supplier.on('select', function(req, reply){

		var supplier_url = req.url;

		if(!supplier_url){
			return;
		}

		var base_key = supplier_url + '/';

		var lists = {};
		var fns = ['tag', 'class', 'id'].map(function(prop){
			return function(nextfn){
				$digger.cache.zrevrange(base_key + prop, 0, -1, function(error, list){
					lists[prop] = list;
					nextfn();
				})
			}
		})

		async.parallel(fns, function(error){
			if(error){
				reply(error);
			}
			else{
				reply(null, [lists]);
			}
		})

	})

	
	return supplier;
}