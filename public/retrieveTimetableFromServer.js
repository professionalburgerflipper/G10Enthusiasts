const loadtime = new Date();
socket.on( 'timetable', async (data) => { 
	cache.timetable = data; 
	console.log(data); 
	console.log(`Took ${new Date() - loadtime} ms for the timetable data to be loaded`);
});