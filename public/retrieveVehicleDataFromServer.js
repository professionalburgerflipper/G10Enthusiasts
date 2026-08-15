const cache = {
    vehicles: [],
    closestVehicle: null,
	geoloc: null,
	timetable: null,
    tripUpdate: null
}

function cacheUpdate() {
    if (!cache.geoloc) return;
    if (!cache.vehicles) return;

    for (const vehicle of cache.vehicles) vehicle.checkOld();

    const [closestVehicle, closestVehicleDist] = findClosestVehicle();
    if (closestVehicle === null) {
        updateDistanceCounter("G10?", -1, "None");
        loadShapeToMap();
        getNextStop();
        return;
    }

	const geolocTimestamp = cache.geoloc.timestamps.at(-1);

    const bus = [closestVehicle.lat.at(-1), closestVehicle.long.at(-1), closestVehicle.timestamps.at(-1)];

	findBusDistanceFromOrigin(bus, closestVehicle.shape);
    
    // BusPosition, HistoricalBusPosition, UserTimestamp, Shape 
    loadShapeToMap(closestVehicle.shape, closestVehicle.stops);
    updateDistanceCounter(closestVehicle.routeID, closestVehicleDist, closestVehicle.fleetNumber);
    getNextStop();
    renderVehicles();
}

const socket = io();

socket.on(
	'vehicleCache', async (data) => {
        await new Promise(async (res, rej) => {
            while (!cache.timetable) await new Promise(r => setTimeout(r, 100));
            res();
        })

		cache.vehicle = JSON.stringify(data);
        for (const vehicle of data.data) {
            const bus = cache.vehicles.find(v => v.id === vehicle.id)
            if (bus) bus.updatePositionalData(vehicle.lat, vehicle.long, vehicle.speed, data.lastUpdated);
            else {
                const newBus = new Bus(
                    vehicle.id,
                    vehicle.lat,
                    vehicle.long,
                    vehicle.speed,
                    vehicle.routeID,
                    vehicle.tripID,
                    vehicle.fleetNumber,
                    data.lastUpdated
                )
                cache.vehicles.push(newBus);
            }
        }
		document.getElementById("debug").innerHTML = cache.vehicle
        cacheUpdate()
	}
);

function findClosestVehicle() {
	const vehicles = cache.vehicles;

    if (vehicles.length === 0) return [null, "None"];

	let closestVehicleDist = Number.POSITIVE_INFINITY;
    let closestVehicle = null;

    for (const bus of vehicles) {
		const [busLat, busLong] = [bus.lat.at(-1), bus.long.at(-1)];
        const [geoLat, geoLong] = [cache.geoloc.lat.at(-1), cache.geoloc.long.at(-1)];
		const distance = findDistanceBetweenPoints(geoLat, geoLong, busLat, busLong);

		if (distance < closestVehicleDist) {
			closestVehicle = bus; closestVehicleDist = distance;
		}
	}


    cache.closestVehicle = closestVehicle

    return [closestVehicle, closestVehicleDist]
}


// Calculates the distance between two geographical points using the Haversine formula
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