const { transit_realtime } = require('gtfs-realtime-bindings');	// Allow for parsing GTFS-RT
const fs = require('fs');	// Allow for reading files
const path = require('path');
const csv = require('csv-parser'); // Allow for parsing CSV files

// Caching variables
let tripUpdateCache = [];
let lastUpdatedTime = null;

// Global variables
let sockets = require('./sockets');
let routeFilters = [];

/**
 * Method to retrieve live vehicle positions from Adelaide Metro,
 * consolidate to only that matching routeFilter,
 * and then cache and send to all connected sockets.
 */
async function updateTripUpdateCache() {
	try {
		// Realtime feed from ADLM GTFS. 
		const gtfsURL_vehicle_position = 'https://gtfs.adelaidemetro.com.au/v1/realtime/trip_updates';

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

		// console.log(feed.entity[0].tripUpdate); return;
		// const trips = await new Promise(async (resolve, reject) => {
		// 	while (!fs.existsSync(
		// 		path.join(__dirname, '..', 'timetable', 'trips.txt')
		// 	)) await new Promise(r => setTimeout(r, 1000));

		// 	fs.createReadStream(path.join(__dirname, '..', 'timetable', 'trips.txt'))
		// 		.pipe(csv())
		// 		.on('data', (data) => { trips.push(data); })
		// 		.on('end', () => { resolve(trips); })
		// 		.on('error', (error) => { reject(error); });
		// })

		const new_feed = feed.entity.filter(entity => routeFilters.includes(entity.tripUpdate.trip.routeId || 0));

		console.log(new_feed, new_feed[0]); 

		// console.log(feed.header.timestamp.low)
		
		// const vehicles = feed.entity
		// 	// Filter for valid vehicle entities.
		// 	.filter( entity => entity.vehicle )
		// 	.map( entity => {
		// 			const position = entity.vehicle.position;
		// 			const trip = entity.vehicle.trip;

		// 			const vehicle = {
		// 				// Vehicle ID
		// 				id: entity.id || 0,
		// 				// Vehicle Latitude
		// 				lat: position.latitude || 0,
		// 				// Vehicle Longitude
		// 				long: position.longitude || 0,
		// 				// Vehicle Speed
		// 				speed: position.speed || 0,
		// 				// Vehicle Route ID
		// 				routeID: trip.routeId || 0,
		// 				// Vehicle Trip ID
		// 				tripID: trip.tripId	|| 0, 
		// 				// ADLM Bus ID 
		// 				fleetNumber: entity.vehicle.vehicle.id || 0,
		// 				// Something cool I've found is:
		// 				// 3 digit fleetNumbers denote older model busses,
		// 				// 4 digit 1000-1999 fleetNumbers are newer model busses,
		// 				// (2000-4999 are trains...)
		// 				// and 4 digit 5000-5999 represent electric busses.
		// 				// location: gc.getAddressFromCoords(position.latitude, position.longitude) || 0
		// 			}
		// 			return vehicle
		// 		}
		// 	);
		
		// // Filter vehicles to only those in the route filters
		// vehicleCache = vehicles.filter(vehicle => routeFilters.includes(vehicle.routeID));

		// // Set last updated time of cache.
		// lastUpdatedTime = new Date().toISOString();

		// // Nice little logging :)
		// console.log('Cache Updated!\n');

		// // Send cache to all connected sockets
		// sockets.forEach(socket => {
		// 	socket.emit('vehicleCache', { lastUpdated: lastUpdatedTime, data: vehicleCache });
		// });
	}
	catch (err) {
		// spooky
		console.error(err);
	}
}

function initTripUpdateCache(rf) {
    // Set route filter variable from server.js
    routeFilters = rf;

    // Loop to call updateVehicleCache every 14s
    updateTripUpdateCache();
    // setInterval(updateVehicleCache, 14000);
}

module.exports = {
    initTripUpdateCache,
    tripUpdateCache: () => { return tripUpdateCache },
    lastUpdatedTime: () => { return lastUpdatedTime }
}