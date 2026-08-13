class Geoloc {
    constructor(lat, long, heading, speed, accuracy, timestamp) {
        this._lat = [lat];
        this._long = [long];
        this._heading = [heading];
        this._speed = [speed];
        this._accuracy = [accuracy];
        this._timestamps = [timestamp];
    }

    get lat() { return this._lat; }
    get long() { return this._long; }
    get heading() { return this._heading; }
    get speed() { return this._speed; }
    get accuracy() { return this._accuracy; }
    get timestamps() { return this._timestamps; }

    updatePositionalData(lat, long, heading, speed, accuracy, timestamp) {
        this._lat.push(lat);
        this._long.push(long);
        this._heading.push(heading);
        this._speed.push(speed);
        this._accuracy.push(accuracy);
        this._timestamps.push(timestamp);

        this._removeStaleData();
    }

    _removeStaleData() {
        while (this._timestamps.length > 10) {
            this._lat.shift();
            this._long.shift();
            this._heading.shift();
            this._speed.shift();
            this._accuracy.shift();
            this._timestamps.shift();
        }
    }
}