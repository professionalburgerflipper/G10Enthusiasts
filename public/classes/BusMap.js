const BUS_CHILD_STYLE = {
    width: '25px',
    height: '25px',
    backgroundSize: 'contain',
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center",
    cursor: "pointer"
}

class BusMap {
    constructor(vehicle) { 
        this._vehicle = vehicle; 
        this.instantiateMapVehicle();
    }

    async instantiateMapVehicle() {
        while (!map) await new Promise(resolve => setTimeout(resolve, 100));
        while (!bg_routes_added) await new Promise(resolve => setTimeout(resolve, 100));

        this._markerElement = BusIcon.cloneNode(true);
        this._markerElement.style.zIndex = 20;
        this._markerIconElement = this._markerElement.children[0];
        Object.assign(this._markerIconElement.style, BUS_CHILD_STYLE);
        this._markerIconElement.style.rotate = `${this._vehicle.bearing.at(-1) - map.getBearing()}deg`;

        const route = this._vehicle.route;

        this._markerIconElement.addEventListener("click", e => {
            if (this._markerIconElement != e.target) return;
            if (popup) popup.remove();
            popup = new maplibregl.Popup({className: 'vehicle-popup', anchor: 'top'})
                .setLngLat(this._marker.getLngLat())
                .setHTML(`
                        <b>${route.route_short_name} | Fleet #${this._vehicle.fleetNumber}</b><br>
                        <p>${route.route_long_name}</p><br>
                        <i>${this._vehicle.id}</i>
                    `)
                .setMaxWidth("min-content")
                .addTo(map);
        })

        this._marker = new maplibregl.Marker({ element: this._markerElement })
            .setLngLat([Number(this._vehicle.long.at(-1)), Number(this._vehicle.lat.at(-1))])
            .addTo(map);
    }

    unrenderMapVehicle() {
        if (!map) return;
        if (!this._marker || !this._markerElement) return;
        
        this._markerElement.remove();
        this._marker.remove();
    }

    async makeProminent() {
        while (!this._markerElement || !this._marker || !this._markerIconElement) await new Promise(resolve => setTimeout(resolve, 100));
        Object.assign(this._markerIconElement.style, {
            width: '40px',
            height: '40px'
        });
        return true;
    }

    async makeNotProminent(vehicle) {
        while (!this._markerElement || !this._marker || !this._markerIconElement) await new Promise(resolve => setTimeout(resolve, 100));
        Object.assign(this._markerIconElement.style, BUS_CHILD_STYLE);
        return true;
    }



    vehicleSetTo(position = [this._vehicle.long.at(-1), this._vehicle.lat.at(-1)], bearing = this._vehicle.bearing.at(-1), now = this._vehicle.mapInterpolationTime) {
        if (!map) return;
        if (!this._marker || !this._markerIconElement) return;
        if (this._vehicle.mapInterpolationTime !== now) return;

        this._marker.setLngLat(position);
        this._markerIconElement.style.rotate = `${bearing - map.getBearing()}deg`;
    }

    vehicleUpdatePosition(position = [this._vehicle.long.at(-1), this._vehicle.lat.at(-1)], bearing = this._vehicle.bearing.at(-1), now = this._vehicle.mapInterpolationTime) {
        this.vehicleSetTo(position, bearing, now);
        if (map_mode === 1 && map_mode_delayed === 1) fit();
    }
}