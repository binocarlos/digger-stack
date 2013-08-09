var Reception = require('../src');

var app = Reception();

/*

	the mongo route
	
*/
app.digger('/mongo', function(req, reply){
	console.log(JSON.stringify(req, null, 4));
	reply(null, []);
})
	
var server = app.listen(8791, function(){
	console.log('-------------------------------------------');
	console.log('listening on port: ' + 8791);
})