/**
 * Module dependencies.
 */

net = require('net')
redis = require('redis')

client = redis.createClient()

client.on('error', (err) ->
    console.log('Database error', err)
)
client.select(1)

server = net.createServer((socket) ->	console.log("Starting server")
	socket.on('end', -> console.log("Connection closed"))
  socket.on('data', (buf) ->
		try
			requests = buf.toString().split('\n')
			parsed_requests = []
				for (i = 0 i < requests.length i++)
					if (requests[i])
						parsed_requests.push(JSON.parse(requests[i]))						

		for (j = 0 j < parsed_requests.length j++)
			country = ('geoip' in parsed_requests[j]['@fields']? parsed_requests[j]['@fields']['geoip']['country_name'] : '')
			glc_id = parsed_requests[j]['@fields']['request'][0]
			pattern_glc_id = /\/\?gclid=(.*)/
			if (pattern_glc_id.test(glc_id)) {
			    client_ip = parsed_requests[j]['@fields']['clientip'][0]
			    timestamp = parsed_requests[j]['@timestamp']
			    client_domain = parsed_requests[j]['@fields']['domain']
			    pattern_domain = /\/var\/log\/virtualmin\/(.*)_access_log/
			    redis_key = client_domain + ":" + client_ip
			    client.lpush(redis_key, timestamp)
			    if (typeof client_domain != 'undefined')
				if (country != 'Canada')
				    client.lpush("fraud:" + client_domain, client_ip + "|" + timestamp + "|" + country)

	catch (err)
		console.log("Error", err, buf.toString())
	
    )
    socket.write('ok\r\n')
).listen(3000,  ->
    console.log("Server bound.")
)
