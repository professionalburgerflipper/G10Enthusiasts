let timetable = {}
const loadtime = new Date();
socket.on( 'timetable', async (data) => { 
	timetable = data; 
	console.log(data); 
	console.log(`Took ${new Date() - loadtime} ms for the timetable data to be loaded`);
});