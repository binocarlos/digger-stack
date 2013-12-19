var Stack = require('../src');

describe('stack', function(){

	it('should route a request', function (done) {
		var status = {};
		var stack = new Stack({
			log:false,
			router:function(req, reply, next){
				status.router = true;
				next();
			},
			suppliers:{
				"/apples":function(req, reply){
					req.url.should.equal('/');
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
