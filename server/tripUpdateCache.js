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

		// Filter updates to only those with vehicles in the route filters
		tripUpdateCache = feed.entity.filter(entity => routeFilters.includes(entity.tripUpdate.trip.routeId || 0));

		// Set last updated time of cache.
		lastUpdatedTime = new Date().toISOString();

		// Nice little logging :)
		console.log('Trip Update Cache Updated!\n');

		// Send cache to all connected sockets
		sockets.forEach(socket => {
			socket.emit('tripUpdateCache', { lastUpdated: lastUpdatedTime, data: tripUpdateCache });
		})
	}
	catch (err) {
		// spooky
		console.error(err);
	}
}

function initTripUpdateCache(rf) {
    // Set route filter variable from server.js
    routeFilters = rf;

    // Loop to call updateTripUpdateCache every 14s
    updateTripUpdateCache();
    setInterval(updateTripUpdateCache, 14000);
}

module.exports = {
    initTripUpdateCache,
    tripUpdateCache: () => { return tripUpdateCache },
    lastUpdatedTimeTUC: () => { return lastUpdatedTime }
}