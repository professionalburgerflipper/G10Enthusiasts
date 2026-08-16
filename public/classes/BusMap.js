class BusMap {
    constructor(vehicle) { 
        this._vehicle = vehicle; 
        this.instantiateMapVehicle();
    }

    async instantiateMapVehicle() {
        while (!map) await new Promise(resolve => setTimeout(resolve, 100));
        while (!bg_routes_added) await new Promise(resolve => setTimeout(resolve, 100));
        while (!icons_added) await new Promise(resolve => setTimeout(resolve, 100));

        const route = this._vehicle.route;

        const geojson = {
            type: "FeatureCollection",
            features: [{
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [Number(this._vehicle.long.at(-1)), Number(this._vehicle.lat.at(-1))]
                },
                properties: {
                    color: `#${route.route_color}`,
                    short_name: route.route_short_name,
                    long_name: route.route_long_name,
                    desc: route.route_desc
                }
            }]
        }

        const vehicle_id = this._vehicle.id;

        map.addSource(`vehicle-${vehicle_id}`, {
            type: "geojson",
            data: geojson
        });

        map.addLayer({
            id: `vehicle-${vehicle_id}`,
            type: "symbol",
            source: `vehicle-${vehicle_id}`,
            layout: {
                "icon-image": 'bus',
                "icon-allow-overlap": true,
                'icon-size': 0.03,
                'icon-rotate': Number(this._vehicle.bearing.at(-1)) - map.getBearing()
            }
        })

        let popup;

        map.on('click', `vehicle-${vehicle_id}`, (e) => {
            if (popup) popup.remove();
            popup = new maplibregl.Popup({className: 'vehicle-popup', anchor: 'top'})
                .setLngLat(e.lngLat)
                .setHTML(`
                        <b>${route.route_short_name} | Fleet #${this._vehicle.fleetNumber}</b><br>
                        <p>${route.route_long_name}</p><br>
                        <i>${vehicle_id}</i>
                    `)
                .setMaxWidth("min-content")
                .addTo(map);
            
        });

        map.moveLayer(`vehicle-${vehicle_id}`);
    }

    unrenderMapVehicle() {
        if (!map) return;
        const vehicle_id = this._vehicle.id;
        if (map.getLayer(`vehicle-${vehicle_id}`)) {
            map.removeLayer(`vehicle-${vehicle_id}`);
            map.removeSource(`vehicle-${vehicle_id}`);
        }
    }

    async makeProminent() {
        while (!map) await new Promise(resolve => setTimeout(resolve, 100));
        const vehicle_id = this._vehicle.id;
        while (!map.getLayer(`vehicle-${vehicle_id}`)) await new Promise(resolve => setTimeout(resolve, 100));
        map.setLayoutProperty(`vehicle-${vehicle_id}`, 'icon-size', 0.0375);

        const shape = this._vehicle.shape;

        const geojson = {
            type: "FeatureCollection",
            features: [{
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: shape.map(p => [Number(p.shape_pt_lon), Number(p.shape_pt_lat)])
                },
                properties: {
                    color: `#${this._vehicle.route.route_color}`
                }
            }]
        }

        map.addSource(`vehicle-${vehicle_id}-route`, {
            type: "geojson",
            data: geojson
        });
        
        map.addLayer({
            id: `vehicle-${vehicle_id}-route`,
            type: "line",
            source: `vehicle-${vehicle_id}-route`,
            layout: {
                "line-join": "round",
                "line-cap": "round"
            },
            paint: {
                "line-color": ["get", "color"],
                "line-width": 5,
                "line-opacity": 1
            }
        });

        return true;
    }

    async makeNotProminent(vehicle) {
        while (!map) await new Promise(resolve => setTimeout(resolve, 100));
        const vehicle_id = this._vehicle.id;
        while (!map.getLayer(`vehicle-${vehicle_id}`)) await new Promise(resolve => setTimeout(resolve, 100));
        map.setLayoutProperty(`vehicle-${vehicle_id}`, 'icon-size', 0.03);

        if (map.getLayer(`vehicle-${vehicle_id}-route`)) {
            map.removeLayer(`vehicle-${vehicle_id}-route`);
            map.removeSource(`vehicle-${vehicle_id}-route`);
        }

        return true;
    }



    vehicleSetTo(position = [this._vehicle.long.at(-1), this._vehicle.lat.at(-1)], bearing = this._vehicle.bearing.at(-1), now = this._vehicle.mapInterpolationTime) {
        if (!map) return;
        if (this._vehicle.mapInterpolationTime !== now) return;

        this._vehicle.mapLat = position[1];
        this._vehicle.mapLon = position[0];

        const vehicle_id = this._vehicle.id;
        const route = this._vehicle.route;

        const source = map.getSource(`vehicle-${vehicle_id}`)
        if (!source) return;

        source.setData({
            type: "FeatureCollection",
            features: [{
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: position
                },
                properties: {
                    color: `#${route.route_color}`,
                    short_name: route.short_name,
                    long_name: route.long_name,
                    desc: route.route_desc
                }
            }]
        });

        map.setLayoutProperty(`vehicle-${vehicle_id}`, 'icon-rotate', Number(bearing) != NaN ? Number(bearing) - map.getBearing() : 0);
        map.moveLayer(`vehicle-${vehicle_id}`);

        if (map_mode == 1) fit();
    }
}