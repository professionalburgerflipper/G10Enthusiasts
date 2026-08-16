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
        while (!icons_added) await new Promise(resolve => setTimeout(resolve, 100));

        const geojson = {
            type: "FeatureCollection",
            features: [{
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [Number(this._long.at(-1)), Number(this._lat.at(-1))]
                },
                properties: {}
            }]
        }

        map.addSource("geoloc", {
            type: "geojson",
            data: geojson
        });

        map.addLayer({
            id: "geoloc",
            type: "symbol",
            source: "geoloc",
            layout: {
                "icon-image": "user",
                "icon-size": 0.025
            }
        });

        map.moveLayer("geoloc");
        this._mapInstantiated = true;
    }

    async _renderPosition() {
        while (!this._mapInstantiated || false) await new Promise(resolve => setTimeout(resolve, 100));

        const source = map.getSource("geoloc");
        source.setData({
            type: "FeatureCollection",
            features: [{
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [Number(this._long.at(-1)), Number(this._lat.at(-1))]
                },
                properties: {}
            }]
        });

        map.moveLayer("geoloc");
        if (map_mode === 2 && map_mode_delayed === 2) fit();
    }
}