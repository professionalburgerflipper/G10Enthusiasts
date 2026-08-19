const GEOLOC_CHILD_STYLE = {
    width: '20px',
    height: '20px',
    backgroundSize: 'contain',
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center"
}

class Geoloc {
    constructor(lat, long, heading, speed, accuracy, timestamp) {
        this._lat = [lat];
        this._long = [long];
        this._heading = [heading];
        this._speed = [speed];
        this._accuracy = [accuracy];
        this._timestamps = [timestamp];

        this._instantiateMap();
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
        this._renderPosition();
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

    async _instantiateMap() {
        if (this._mapInstantiated) return;
        while (!map) await new Promise(resolve => setTimeout(resolve, 100));
        
        this._markerElement = UserIcon.cloneNode(true);
        this._markerElement.style.zIndex = 25;
        this._markerIconElement = this._markerElement.children[0];
        Object.assign(this._markerIconElement.style, GEOLOC_CHILD_STYLE);
        this._markerIconElement.style.rotate = `${this._heading.at(-1) - map.getBearing()}deg`;

        this._marker = new maplibregl.Marker({ element: this._markerElement })
            .setLngLat([Number(this._long.at(-1)), Number(this._lat.at(-1))])
            .addTo(map);

        this._mapInstantiated = true;
        this._lastMapRender = new Date();
    }

    async _renderPosition() {
        while (!this._mapInstantiated || false) await new Promise(resolve => setTimeout(resolve, 100));
        if (new Date() - this._lastMapRender < 100) return; // Throttle to 10fps
        this._lastMapRender = new Date();

        this._marker.setLngLat([Number(this._long.at(-1)), Number(this._lat.at(-1))]);
        this._markerIconElement.style.rotate = `${this._heading.at(-1) - map.getBearing()}deg`;

        if (map_mode === 2 && map_mode_delayed === 2) fit();
    }
}