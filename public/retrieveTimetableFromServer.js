// Find the time the script initialised
const loadtime = new Date();

socket.on( 'timetable', async (data) => { 
	// Receive data
	cache.timetable = data; 
	console.log(data); 

	// Find how long it took to load
	console.log(`Took ${new Date() - loadtime} ms for the timetable data to be loaded`);
});