// Cache
const cache = {
    vehicles: [],
	timetable: null,
    tripUpdate: null,
	geoloc: null,
    mainRoute: 'G10',
    
    
    _closestVehicle: null,
    get closestVehicle() { return this._closestVehicle; },
    set closestVehicle(vehicle) { 
        // Don't update if the vehicle is the same
        if (vehicle === this._closestVehicle) return;

        // Don't update if the vehicle is not an instance of Bus or null
        if (!vehicle instanceof Bus && vehicle !== null) {
            console.error("Vehicle must be an instance of Bus or null");
            alert("Vehicle must be an instance of Bus or null");
            return;
        }
        console.log(`%c[${new Date().toISOString()}] New closest vehicle: ${vehicle.routeID} #${vehicle.fleetNumber}`, "color: #9dff84");
        
        // Get rid of the old shit
        this._closestVehicle?.unrenderStops();
        this._closestVehicle?.makeNotProminent();
        this._closestVehicle = vehicle; 
        
        // Return if there is no vehicle
        if (!vehicle) return;

        // Render the new vehicle
        this._lineFirstStopsLater(vehicle);
    },

    async _lineFirstStopsLater(vehicle) {
        // Wait for the bus to be prominent
        await vehicle.makeProminent();
        // Render it's stops
        vehicle.renderStops()
    }
}


/**
 * Function that runs on every vehicle update
 */
async function cacheUpdate() {
    try {
        // Wait for dependencies
        while (!cache.geoloc) await new Promise(resolve => setTimeout(resolve, 100));
        while (!cache.vehicles) await new Promise(resolve => setTimeout(resolve, 100));

        // Set the main route (in case we decide we hate the G10)
        cache.mainRoute = `${cache.timetable?.routes[0]?.route_id || 'G10'}`

        // Remove old vehicles
        for (const vehicle of cache.vehicles) vehicle.checkOld();

        // Find the closest vehicle
        const [closestVehicle, closestVehicleDist] = findClosestVehicle();
        if (closestVehicle === null) {
            // If there is no closest vehicle, reset the distance counter and torch the place
            updateDistanceCounter(`${cache.mainRoute}?`, -1, "None");
            getNextStop();
            return;
        }

        // Get the estimated position
        const geolocTimestamp = cache.geoloc.timestamps.at(-1);
        const bus = [closestVehicle.lat.at(-1), closestVehicle.long.at(-1), closestVehicle.timestamps.at(-1)];
        let prevBus = null;
        if (closestVehicle.timestamps.at(-2) !== undefined) 
            prevBus = [closestVehicle.lat.at(-2), closestVehicle.long.at(-2), closestVehicle.timestamps.at(-2)];
        const estPosition = estimatePosition(bus, prevBus, geolocTimestamp, closestVehicle.shape);
        const estDistance = findDistanceBetweenPoints(estPosition[0], estPosition[1], cache.geoloc.lat.at(-1), cache.geoloc.long.at(-1));

        // Get distance from origin for something or rather, yeah
        findClosestBusDistanceFromOrigin(bus, closestVehicle.shape);
        
        // Update the thingy mabobs
        updateBoardStatus(estDistance, closestVehicle.speed.at(-1), cache.geoloc.accuracy.at(-1));
        updateDistanceCounter(closestVehicle.routeID, estDistance, closestVehicle.fleetNumber); // BusPosition, HistoricalBusPosition, UserTimestamp, Shape 

        getNextStop();
    } catch (error) {
        // Shit
        console.error(error);
        updateDistanceCounter(`${cache.mainRoute}?`, -1, "Error");
    }
}

const socket = io();

// Receive vehicle data
socket.on(
	'vehicleCache', async (data) => {
        // Wait for dependencies
        await new Promise(async (res, rej) => {
            while (!cache.timetable) await new Promise(r => setTimeout(r, 100));
            res();
        })

        // Iterate through the vehicles
        for (const vehicle of data.data) {
            // If they already exist, update them
            // Else, instantiate them
            const bus = cache.vehicles.find(v => v.id === vehicle.id)
            if (bus) bus.updatePositionalData(vehicle.lat, vehicle.long, vehicle.speed, vehicle.bearing, data.lastUpdated);
            else {
                const newBus = new Bus(
                    vehicle.id,
                    vehicle.lat,
                    vehicle.long,
                    vehicle.speed,
                    vehicle.bearing,
                    vehicle.routeID,
                    vehicle.tripID,
                    vehicle.fleetNumber,

                    data.lastUpdated
                )
                cache.vehicles.push(newBus);
            }
        }
        
        // Show debugging information in HTML DOM
		document.getElementById("debug").innerHTML = JSON.stringify(data.data, null, 2);

        // Update the cache shit
        cacheUpdate()
	}
);

function findClosestVehicle() {
    // Return if there are no vehicles
	const vehicles = cache.vehicles;
    if (vehicles.length === 0) return [null, "None"];

    // Find the closest vehicle
	let closestVehicleDist = Number.POSITIVE_INFINITY;
    let closestVehicle = null;
    for (const bus of vehicles) {
        // Get bus location
		const [busLat, busLong] = [bus.lat.at(-1), bus.long.at(-1)];
        // Get user location
        const [geoLat, geoLong] = [cache.geoloc.lat.at(-1), cache.geoloc.long.at(-1)];

        // Get distance
		const distance = findDistanceBetweenPoints(geoLat, geoLong, busLat, busLong);

        // Update distance in bus
        bus.setDistanceFromUser(distance);

        // Update closest vehicle
		if (distance < closestVehicleDist) {
			closestVehicle = bus; 
            closestVehicleDist = distance;
		}
	}

    // Update closest vehicle in cache
    cache.closestVehicle = closestVehicle

    // Sort vehicles by distance from user
    cache.vehicles.sort((a, b) => a.distanceFromUser - b.distanceFromUser);

    // Return the closest vehicle and its distance
    return [closestVehicle, closestVehicleDist]
}


/**
 * Calculates the distance between two geographical points using the Haversine formula
 * 
 * @param {Number} lat1  - The latitude of the first point
 * @param {Number} long1 - The longitude of the first point
 * @param {Number} lat2  - The latitude of the second point
 * @param {Number} long2 - The longitude of the second point
 * @returns {Number} The distance between the two points
 */
function findDistanceBetweenPoints(lat1, long1, lat2, long2) {
    const toRad = x => x * Math.PI / 180;
    const R = 6371000; // earth radius in meters
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(long2 - long1);

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}