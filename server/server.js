// The port the server is running on
// Set to 2119 to assume identity of busdle.theadelaidegame.org (which runs on port 2119)
const PORT = 2119;

// Load all required modules
const cors = require('cors');	// Allow connections to frontend
const path = require('path');	// Allow for accessing file paths
const express = require('express');	// the main server lol
const http = require('http');	// Allow for combining express & socket.io
const { Server } = require('socket.io');	// Allow for socket connections
const fs = require('fs');		// Allow for file operations

// Initialise server
const app = express();
app.use(cors());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'public', 'html'));

// Initialise socket connection
const server = http.createServer(app);
const io = new Server(server);

// The sacred
const routeFilters = ["G10", "G10A", "G10B", "G10C", "N10"];


// Load G10 enthusiast modules
const { initTimetableUpdater } = require('./timetableUpdater.js'); initTimetableUpdater(routeFilters);
const { initTripUpdateCache, tripUpdateCache, lastUpdatedTimeTUC } = require('./tripUpdateCache.js'); initTripUpdateCache(routeFilters);
const { init, vehicleCache, lastUpdatedTimeVC } = require('./vehicleCache.js'); init(routeFilters);
const retrieveTimetableComponents = require('./timetableRetriever.js');
const log = require('./customLog.js');
const sql = require('./database.js');
let sockets = require('./sockets.js');

// Allow for accessing scripts via URL
app.use(express.static(path.join(__dirname, '..', 'public'))) //allow and default accessing of public file (everything that is used in frontend)

// Index page
app.get('/', (req, res) => {
	const prerequisites = ["timetable", "timetable/routes.txt", "timetable/shapes.txt", 
		"timetable/stop_times.txt", "timetable/stops.txt", "timetable/trips.txt"];
	for (const p of prerequisites) 
		if (!fs.existsSync(path.join(__dirname, '..', p)))
			return res.status(425).send('Still loading server dependencies on first load. Please try again in a minute.');
	res.sendFile(path.join(__dirname, '..', 'public', 'html', "index.html")); //each ',' represents a slash basically in pth.join, and dirname takes the main directory
})

app.get('/history', async (req, res) => { 
	const topEntries = await sql(`
		WITH MostRecentTimestamps AS (
			SELECT fleetNumber, MAX(startTimestamp) AS time
			FROM tripHistory GROUP BY fleetNumber
		)
		SELECT t.fleetNumber, t.startTimestamp, t.endTimestamp, t.routeID, t.tripID FROM tripHistory AS t 
		JOIN MostRecentTimestamps AS mrt 
		ON t.fleetNumber = mrt.fleetNumber AND t.startTimestamp = mrt.time
		ORDER BY t.startTimestamp DESC LIMIT 50;`);
	const counts = await sql(`SELECT fleetNumber, COUNT(*) AS timesRan FROM tripHistory GROUP BY fleetNumber ORDER BY max(startTimestamp) DESC LIMIT 50`)
	const merged = topEntries.map(te => ({...te, count: counts.find(c => c.fleetNumber == te.fleetNumber).timesRan}));
	res.render('history', { topEntries: merged }); 
})

// Handle socket connections
io.on('connection', async (socket) => {
	// Add to socket list
	sockets.push(socket);

	// Log connection to console
	log(`&eClient connected.`)

	// Send current vehicle cache
	socket.emit('vehicleCache', { lastUpdated: lastUpdatedTimeVC(), data: vehicleCache() });

	// Send current trip update cache
	socket.emit('tripUpdateCache', { lastUpdated: lastUpdatedTimeTUC(), data: tripUpdateCache() });

	// Handle disconnections
	socket.on('disconnect', () => {
		// Remove from socket list
		sockets.splice(sockets.indexOf(socket), 1);

		// Log disconnection
		log(`&eClient disconnected.`)
	});

	// Send miscellaneous timetable data
	const timetable = await retrieveTimetableComponents();
	socket.emit('timetable', timetable);
})

// Start server on desired port and log
server.listen(PORT, () => log(`&eLocalhost active; open http://localhost:${PORT}/ to view the ${routeFilters[0]} enthusiasts :)`));