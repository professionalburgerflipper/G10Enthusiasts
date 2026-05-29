// Load installed libraries.
const express = require('express');
const cors = require('cors');
const path = require('path');

const { transit_realtime } = require('gtfs-realtime-bindings');

const gc = require('./geocoding.js');

// Allow connections to frontend
const app = express();
app.use(cors());

let vehicleCache = [];
let lastUpdatedTime = null;

const routeFilter = "G10";

// Re-Fetch data from URL
async function updateVehicleCache() {
	try {
		// Realtime feed from ADLM GTFS. 
		const gtfsURL_vehicle_position = 'https://gtfs.adelaidemetro.com.au/v1/realtime/vehicle_positions';

		console.log(`[${new Date().toISOString()}] Fetching GTFS-RT from ${gtfsURL_vehicle_position}...`);
		
		// Fetch binary from ADLM.
		const response = await fetch(gtfsURL_vehicle_position);
		// Throw error if fetch failed.
		if (!response.ok) throw new Error(`No response from ADLM at - '${gtfsURL_vehicle_position}'\n`);

		// Convert response to binary buffer.
		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Decode binary to object.
		const feed = transit_realtime.FeedMessage.decode(buffer);

		const vehicles = feed.entity
			// Filter for valid vehicle entities.
			.filter( entity => entity.vehicle )
			.map( entity => {
					const position = entity.vehicle.position;
					const trip = entity.vehicle.trip;

					const vehicle = {
						// Vehicle ID
						id: entity.id || 0,
						// Vehicle Latitude
						lat: position.latitude || 0,
						// Vehicle Longitude
						long: position.longitude || 0,
						// Vehicle Speed
						speed: (position.speed * 3.6).toFixed(2) || 0,
						// Vehicle Route ID
						routeID: trip.routeId || 0,
						// Vehicle Trip ID
						tripID: trip.tripId	|| 0, 
						// ADLM Bus ID 
						fleetNumber: entity.vehicle.vehicle.id || 0,
						// Something cool I've found is:
						// 3 digit fleetNumbers denote older model busses,
						// 4 digit 1000-1999 fleetNumbers are newer model busses,
						// (2000-4999 are trains...)
						// and 4 digit 5000-5999 represent electric busses.
						// location: gc.getAddressFromCoords(position.latitude, position.longitude) || 0
					}
					return vehicle
				}
			);
		
		// Set cache to new feed.
		filteredVehicles = vehicles.filter(vehicle => vehicle.routeID.startsWith(routeFilter));
		busCount = vehicles.length;

		for (let bus = 0; bus < busCount; bus++) {
			
		}

		vehicleCache = vehicles.filter(vehicle => vehicle.routeID.startsWith(routeFilter))

		// Set last updated time of cache.
		lastUpdatedTime = new Date().toISOString();

		console.log('Cache Updated!\n');
	}
	catch (err) {
		console.error(err);
	}
}

updateVehicleCache(); // Initial fetch
// Fetch every 14s
setInterval(updateVehicleCache, 14000); 

// Endpoint to fetch and parse transit data.
// Parsed GTFS data can be viewed in http://localhost:3000/vehicles when server is running.
app.get('/vehicles',
	(req, res) => {
		res.json({ lastUpdated: lastUpdatedTime, data: vehicleCache });
	}
);
// Home page.
app.get('/', (req, res) => res.sendFile("index.html", {root: path.join(__dirname, "../")}));

// Allow for accessing scripts via URL
app.use(express.static(path.join(__dirname, "../static")))

app.listen(3000, () => console.log('Localhost active; open http://localhost:3000/vehicles to view data.'));

// ==--==--==--==--==--==--==--==
// LOCALHOST SETUP GUIDE:
// ==--==--==--==--==--==--==--==
// 1. Make sure Node.js is installed on your machine
// 2. Open terminal
// 3. Change directory to: {repoCloneDirectory}\G10Enthusiasts\server
// 4. Type "node server.js" to run localhost. (A message should display if done correctly)
// 5. go to http://localhost:3000/vehicles to view data.
// ==--==--==--==--==--==--==--==


// GTFS (General Transit Feed Specification) is how we're getting the vehicle data.
// (More specifically GTFS-RT (Real-Time))

// This data is avaliable through https://gtfs.adelaidemetro.com.au/.
// The raw binary data is then parsed to a JSON object using the npm package 'gtfs-realtime-bindings'.
// The general structure of the object is like this:

// entity
//  |- id
//  |- vehicle
//      |- trip
//      |   |- tripId
//      |   |- startDate
//      |   |- sheduleRelationship (usually "SCHEDULED")
//      |   |- routeId (What we can use to find G10 routes!!!!!)
//      |   |- directionID (either 0 or 1, not sure which way it corresponds to just yet...)
//      |- position
//      |   |- latitude
//      |   |- longitude
//      |   |- bearing
//      |   |- speed (in m/s)
//      |- timestamp
//      |- vehicle (vehicle subcateorgy in vehicle category?)
//          |- id (ADLM bus id)
//          |- label

// Though, we're returning a new entity which is simpiler but contains the data we need.
// entity
//  |- id
//  |- lat
//  |- long
//  |- speed (converted to kp/h)
//  |- routeID
//  |- tripID
//  |- ADLMID (Adelaide Metro Bus ID)