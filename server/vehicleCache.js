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
//      |   |- scheduleRelationship (usually "SCHEDULED")
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
//  |- speed
//  |- bearing
//  |- routeID
//  |- tripID
//  |- ADLMID (Adelaide Metro Bus ID)










const { transit_realtime } = require('gtfs-realtime-bindings');	// Allow for parsing GTFS-RT

// Caching variables
let vehicleCache = [];
let lastUpdatedTime = null;

// Global variables
const log = require('./customLog.js');
let sockets = require('./sockets');
let routeFilters = [];

/**
 * Method to retrieve live vehicle positions from Adelaide Metro,
 * consolidate to only that matching routeFilter,
 * and then cache and send to all connected sockets.
 */
async function updateVehicleCache() {
	try {
		// Realtime feed from ADLM GTFS. 
		const gtfsURL_vehicle_position = 'https://gtfs.adelaidemetro.com.au/v1/realtime/vehicle_positions';

		log(`&aFetching GTFS-RT from ${gtfsURL_vehicle_position}...`);
		
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
						speed: position.speed || 0,
						// Vehicle Bearing
						bearing: position.bearing || 0,
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
		
		// Filter vehicles to only those in the route filters
		vehicleCache = vehicles.filter(vehicle => routeFilters.includes(vehicle.routeID));

		// Set last updated time of cache.
		lastUpdatedTime = new Date().toISOString();

		// Nice little logging :)
		log('&aVehicle Cache Updated!');

		// Send cache to all connected sockets
		sockets.forEach(socket => socket.emit('vehicleCache', { lastUpdated: lastUpdatedTime, data: vehicleCache }));
	}
	catch (err) { log(`&4Error updating &avehicle cache&4: ${err}`) }
}

function init(rf) {
    // Set route filter variable from server.js
    routeFilters = rf;

    // Loop to call updateVehicleCache every 14s
    updateVehicleCache();
    setInterval(updateVehicleCache, 14000);
}

module.exports = {
    init,
    vehicleCache: () => { return vehicleCache },
    lastUpdatedTimeVC: () => { return lastUpdatedTime }
}