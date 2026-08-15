// TODO: Integrate with vehicle data

socket.on( 'tripUpdateCache', async (data) => { 
	cache.tripUpdate = data; 
});