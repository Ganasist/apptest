/**
 * Module dependencies.
 */

var net = require('net')
    , redis = require('redis');

var client = redis.createClient();
client.on('error', function (err) {
    console.log('Database error', err);
});
client.select(1);

var server = net.createServer(function (socket) {
    console.log("Starting server");
    socket.on('end', function () {
        console.log("Connection closed")
    });
    socket.on('data', function (buf) {
	try {
		var requests = buf.toString().split('\n');
		var parsed_requests = [];
		for (var i = 0; i < requests.length; i++) {
			if (requests[i]) {
				parsed_requests.push(JSON.parse(requests[i]));						
			}
		}
		for (var j = 0; j < parsed_requests.length; j++) {
			var country = ('geoip' in parsed_requests[j]['@fields']? parsed_requests[j]['@fields']['geoip']['country_name'] : '');
			var glc_id = parsed_requests[j]['@fields']['request'][0];
			var pattern_glc_id = /\/\?gclid=(.*)/;
			if (pattern_glc_id.test(glc_id)) {
			    var client_ip = parsed_requests[j]['@fields']['clientip'][0];
			    var timestamp = parsed_requests[j]['@timestamp'];
			    var client_domain = parsed_requests[j]['@fields']['domain'];
			    var pattern_domain = /\/var\/log\/virtualmin\/(.*)_access_log/;
			    var redis_key = client_domain + ":" + client_ip;
			    client.lpush(redis_key, timestamp);
			    if (typeof client_domain != 'undefined') {
				if (country != 'Canada') {
				    client.lpush("fraud:" + client_domain,	client_ip + "|" + timestamp + "|" + country);
				}
			    }
			}
		}
	} catch (err) {
		console.log("Error", err, buf.toString());
	}
    });
    socket.write('ok\r\n');
}).listen(3000, function () {
    console.log("Server bound.");
});
