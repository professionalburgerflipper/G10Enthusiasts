class Bus {
    constructor(id, lat, long, speed, bearing, routeID, tripID, fleetNumber, receivedTimestamp) {
        this._id = id
        this._lat = [lat];
        this._long = [long];
        this._speed = [speed];
        this._bearing = [bearing];
        this._routeID = routeID;
        this._tripID = tripID;
		this._shapeID = cache.timetable.trips.find(item => item.trip_id == tripID).shape_id;
        this._fleetNumber = fleetNumber;
        this._allTimestamps = [receivedTimestamp];

		this._snapped = [];
		this._distTraveled = [];

        this.mapInterpolationTime = new Date();
        // instantiateMapVehicle(this);
        this._mapController = new BusMap(this);
        this.mapLat = lat;
        this.mapLon = long;
    }

    // Attribute Getters
    get id() { return this._id; }
    get lat() { return this._lat; }
    get long() { return this._long; }
    get speed() { return this._speed; }
    get bearing() { return this._bearing; }
    get routeID() { return this._routeID; }
    get tripID() { return this._tripID; }
    get shapeID() { return this._shapeID; }
    get fleetNumber() { return this._fleetNumber; }
    get timestamps() { return this._allTimestamps; }
    get mapController() { return this._mapController; }

    // Relationship Getters
	get shape() { return cache.timetable.shapes.filter(shape => shape.shape_id == this._shapeID); }
    get stop_times() { return cache.timetable.stop_times.filter(t => t.trip_id === this._tripID); }
    get stops() { return cache.timetable.stops.filter(s => cache.timetable.stop_times.filter(t => t.trip_id === this._tripID).map(t => t.stop_id).includes(s.stop_id)); }
    get route() { return cache.timetable.routes.find(r => r.route_id == this._routeID); }
    get trip() { return cache.timetable.trips.find(t => t.trip_id == this._tripID); }

    setSnapped(position) { this._snapped.push(position); this._removeStaleData(); }
    get snapped() { return this._snapped.at(-1) || [this._lat.at(-1), this._long.at(-1)]; }
	getSnapped(index = -1) { return this._snapped.at(index); }
    setDistanceTraveled(distance) { this._distTraveled.push(Number(distance)); this._removeStaleData(); }
    get distTraveled() { return this._distTraveled.at(-1) || undefined; }
	getDistTraveled(index = -1) { return this._distTraveled.at(index); }

    setDistanceFromUser(distance) { this._distFromUser = distance; }
    get distanceFromUser() { return this._distFromUser; }

    updatePositionalData(lat, long, speed, bearing, receivedTimestamp) {
        this._speed.push(speed);
        this._bearing.push(bearing);

        vehicleMoveTo(
            this,
            [this._long.at(-1), this._lat.at(-1)],
            [long, lat]
        );

        this._lat.push(lat);
        this._long.push(long);
        this._allTimestamps.push(receivedTimestamp);

        this._removeStaleData();
    }

    checkOld() {
        const now = new Date();
        const latestTimestamp = this._allTimestamps.at(-1);

        const vehicleIndex = cache.vehicles.indexOf(this);
        if (vehicleIndex === -1) return;

        const durationSinceLast = now - new Date(latestTimestamp);
        if (durationSinceLast > 1000 * 60 * 5) {       // if older than 5 minutes
            this._mapController.unrenderMapVehicle();  // k
            cache.vehicles.splice(vehicleIndex, 1);    // ys
        }                                              // period
    }


    _removeStaleData() {
        while (this._allTimestamps.length > 10) {
            this._allTimestamps.shift();
            this._lat.shift();
            this._long.shift();
            this._speed.shift();
        }
		while (this._snapped.length > 10) this._snapped.shift();
		while (this._distTraveled.length > 10) this._distTraveled.shift();
    }

    async renderStops() {
        while (!map) await new Promise(resolve => setTimeout(resolve, 100));
        const stops = this.stops;
        const route = this.route;
        stops.forEach(stop => renderStop(stop, route.route_color));
    }
    unrenderStops() { this.stops.forEach(stop => unrenderStop(stop.stop_id)); }

    async makeProminent() { return await this._mapController.makeProminent(); }
    async makeNotProminent() { return await this._mapController.makeNotProminent() }

}
