// The port the server is running on
// Set to 2119 to assume identity of busdle.theadelaidegame.org (which runs on port 2119)
const PORT = 2119;

// Load all required modules
const cors = require('cors');	// Allow connections to frontend
const path = require('path');	// Allow for accessing file paths
const express = require('express');	// the main server lol
const http = require('http');	// Allow for combining express & socket.io
const { Server } = require('socket.io');	// Allow for socket connections

// Initialise server
const app = express();
app.use(cors());

// Initialise socket connection
const server = http.createServer(app);
const io = new Server(server);

// The sacred
const routeFilters = [ "G10", "G10A", "G10B", "G10C", "N10" ];

// Load G10 enthusiast modules
const { initTimetableUpdater } = require('./timetableUpdater.js'); initTimetableUpdater(routeFilters);
const { initTripUpdateCache } = require('./tripUpdateCache.js'); initTripUpdateCache(routeFilters);
const { init, vehicleCache, lastUpdatedTime } = require('./vehicleCache.js'); init(routeFilters);
const retrieveTimetableComponents = require('./timetableRetriever.js');
let sockets = require('./sockets.js');

// Allow for accessing scripts via URL
app.use(express.static(path.join(__dirname, '..', 'public'))) //allow and default accessing of public file (everything that is used in frontend)

// Index page
app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, '..', 'public', 'html', "index.html")); //each ',' represents a slash basically in pth.join, and dirname takes the main directory
})

// Handle socket connections
io.on('connection', async (socket) => {
	// Add to socket list
	sockets.push(socket);

	// Log connection to console
	console.log(`[${new Date().toISOString()}] Client connected.`)

	// Send current cache
	socket.emit('vehicleCache', { lastUpdated: lastUpdatedTime(), data: vehicleCache() });

	// Handle disconnections
	socket.on('disconnect', () => {
		// Remove from socket list
		sockets.splice(sockets.indexOf(socket), 1);

		// Log disconnection
		console.log(`[${new Date().toISOString()}] Client disconnected.`)
	});

	// Send miscellaneous timetable data
	const timetable = await retrieveTimetableComponents();
	socket.emit('timetable', timetable);
})

// Start server on desired port and log
server.listen(PORT, () => console.log(`Localhost active; open http://localhost:${PORT}/ to view the ${routeFilters[0]} enthusiasts :)`));