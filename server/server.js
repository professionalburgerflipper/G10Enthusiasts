// Load installed libraries.
const express = require('express');
const cors = require('cors');
const { transit_realtime } = require('gtfs-realtime-bindings');

// Allow connections to frontend
const app = express();
app.use(cors());

const routeFilter = "G10";

// Endpoint to fetch and parse transit data.
// Parsed GTFS data can be viewed in http://localhost:3000/vehicles when server is running.
app.get('/vehicles',
	async (req, res) => {
		try {
		// Realtime feed from ADLM GTFS. 
		const gtfsURL_vehicle_position = 'https://gtfs.adelaidemetro.com.au/v1/realtime/vehicle_positions';

		console.log(`Fetching GTFS-RT from ${gtfsURL_vehicle_position}...`);
		
		// Fetch binary from ADLM.
		const response = await fetch(gtfsURL_vehicle_position);
		// Throw error if fetch failed.
		if (!response.ok) throw new Error(`No response from ADLM at - '${gtfsURL_vehicle_position}'`);

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
						speed: position.speed * 3.6 || 0,
						// Vehicle Route ID
						routeID: trip.routeId || 0,
						// Vehicle Trip ID
						tripID: trip.tripId	|| 0, 
						// ADLM Bus ID 
						ADLMID: entity.vehicle.vehicle.id || 0
					}
					return vehicle
				}
			);

		console.log('Successfully mapped data...');
		
		// Display filtered vehicles.
		res.json(vehicles.filter(vehicle => vehicle.routeID.startsWith(routeFilter)));

	}
	catch (err) {
			console.error(err);
			res.status(500).json({error: 'Fetch request failed - ' + err.message});
	}
	}
);


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