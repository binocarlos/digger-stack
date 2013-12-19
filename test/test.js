var Stack = require('../src');

describe('stack', function(){

	it('should route a request', function (done) {
		var status = {};
		var stack = new Stack({
			router:function(req, reply, next){
				status.router = true;
				next();
			},
			suppliers:{
				"/apples":function(req, reply){
					reply(null, [{
						name:'apples'
					}])
				}
			}
		})

		stack.reception({
			url:'/apples'
		}, function(error, results){
			results[0].name.should.equal('apples');
			status.router.should.equal.true;
			done();
		})
	})
})
