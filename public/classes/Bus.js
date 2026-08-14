class Bus {
    constructor(id, lat, long, speed, routeID, tripID, fleetNumber, receivedTimestamp) {
        this._id = id
        this._lat = [lat];
        this._long = [long];
        this._speed = [speed];
        this._routeID = routeID;
        this._tripID = tripID;
		this._shapeID = cache.timetable.trips.find(item => item.trip_id == tripID).shape_id;
        this._fleetNumber = fleetNumber;
        this._allTimestamps = [receivedTimestamp];
    }

    // Attribute Getters
    get id() { return this._id; }
    get lat() { return this._lat; }
    get long() { return this._long; }
    get speed() { return this._speed; }
    get routeID() { return this._routeID; }
    get tripID() { return this._tripID; }
    get shapeID() { return this._shapeID; }
    get fleetNumber() { return this._fleetNumber; }
    get timestamps() { return this._allTimestamps; }

    // Relationship Getters
	get shape() { return cache.timetable.shapes.filter(shape => shape.shape_id == this._shapeID); }
    get stop_times() { return cache.timetable.stop_times.filter(t => t.trip_id === this._tripID); }
    get stops() { return cache.timetable.stops.filter(s => cache.timetable.stop_times.filter(t => t.trip_id === this._tripID).map(t => t.stop_id).includes(s.stop_id)); }
    get route() { return cache.timetable.routes.find(r => r.route_id == this._routeID); }
    get trip() { return cache.timetable.trips.find(t => t.trip_id == this._tripID); }

    setSnapped(position) { this._snapped = position; }
    get snapped() { return this._snapped || [this._lat.at(-1), this._long.at(-1)]; }
    setDistanceTraveled(distance) { this._distTraveled = Number(distance); }
    get distTraveled() { return this._distTraveled || undefined; }

    updatePositionalData(lat, long, speed, receivedTimestamp) {
        this._lat.push(lat);
        this._long.push(long);
        this._speed.push(speed);
        this._allTimestamps.push(receivedTimestamp);

        this._checkOld();
        this._removeStaleData();
    }

    _checkOld() {
        const now = new Date();
        const latestTimestamp = this._allTimestamps.at(-1);

        const durationSinceLast = new Date(latestTimestamp) - now;
        if (durationSinceLast > 120000) {                           // if older than 2 minutes
            cache.vehicles.splice(cache.vehicles.indexOf(this), 1); // kys
        }                                                           // period
    }

    _removeStaleData() {
        while (this._allTimestamps.length > 10) {
            this._allTimestamps.shift();
            this._lat.shift();
            this._long.shift();
            this._speed.shift();
        }
    }

}