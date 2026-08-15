// Global Variable
let map;
let bg_routes_added = false;
let stops_added = false;

// Run on page load
document.addEventListener("DOMContentLoaded", async () => {

    // Create the map
    map = new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json', // style URL
        center: [138.59735099075218, -34.920761823897166],
        zoom: 9,
        attributionControl: false,
        // interactive: false
    })

    while (!map) await new Promise(resolve => setTimeout(resolve, 100));
    while (!cache.timetable) await new Promise(resolve => setTimeout(resolve, 100));

    loadBackgroundRoutes();

});


function loadBackgroundRoutes() {
    if (!map) return;

    if (map.getSource("bg-routes")) {
        map.removeLayer("bg-routes");
        map.removeSource("bg-routes");
    }

    const routes = cache.timetable.routes;
    const routeTrips = routes.map(r => cache.timetable.trips.find(t => t.route_id == r.route_id));
    const routeShapes = routeTrips.map(t => cache.timetable.shapes.filter(s => s.shape_id == t.shape_id));

    const geojson = {
        type: "FeatureCollection",
        features: routeShapes.map((s, i) => ({
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: s.map(p => [Number(p.shape_pt_lon), Number(p.shape_pt_lat)])
            },
            properties: {
                color: `#${routes[i].route_color}`
            }
        }))
    }

    map.addSource("bg-routes", {
        type: "geojson",
        data: geojson
    });

    map.addLayer({
        id: "bg-routes",
        type: "line",
        source: "bg-routes",
        layout: {
            "line-join": "round",
            "line-cap": "round"
        },
        paint: {
            "line-color": ["get", "color"],
            "line-width": 5,
            "line-opacity": 0.4
        }
    });

    function fit() {
        map.fitBounds(turf.bbox(geojson), { padding: {
            top: 60, left: 20, right: 20, bottom: 55
        } });
    }
    fit();

    window.addEventListener("resize", () => {
        setTimeout(fit, 100);
    })

    bg_routes_added = true;
}

async function renderStop(stop, route_color) {
    while (!map) await new Promise(resolve => setTimeout(resolve, 100));
    while (!bg_routes_added) await new Promise(resolve => setTimeout(resolve, 100));
    
    const geojson = {
        type: "FeatureCollection",
        features: [{
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [Number(stop.stop_lon), Number(stop.stop_lat)]
            },
            properties: {
                color: `#${route_color}`,
                name: stop.stop_name,
                desc: stop.stop_desc,
                code: stop.stop_code
            }
        }]
    }

    map.addSource(`stop-${stop.stop_id}`, {
        type: "geojson",
        data: geojson
    });

    map.addLayer({
        id: `stop-${stop.stop_id}`,
        type: "circle",
        source: `stop-${stop.stop_id}`,
        paint: {
            "circle-color": "#adadad",
            "circle-radius": 5,
            "circle-stroke-color": ["get", "color"],
            "circle-stroke-width": 2
        }
    });

    let popup;

    map.on('click', `stop-${stop.stop_id}`, (e) => {
        if (popup) popup.remove();
        popup = new maplibregl.Popup({className: 'stop-popup', anchor: 'left'})
            .setLngLat(e.lngLat)
            .setHTML(`
                    <b>${stop.stop_name}</b><br>
                    <p>${stop.stop_desc}</p>
                `)
            .setMaxWidth("min-content")
            .addTo(map);
        
    });

    map.moveLayer(`stop-${stop.stop_id}`);
    stops_added = true;
}



async function instantiateMapVehicle(vehicle) {
    while (!map) await new Promise(resolve => setTimeout(resolve, 100));
    while (!bg_routes_added) await new Promise(resolve => setTimeout(resolve, 100));
    while (!stops_added) await new Promise(resolve => setTimeout(resolve, 100));

    const geojson = {
        type: "FeatureCollection",
        features: [{
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [Number(vehicle._long.at(-1)), Number(vehicle._lat.at(-1))]
            },
            properties: {
                color: `#${vehicle.route.route_color}`,
                short_name: vehicle.route.short_name,
                long_name: vehicle.route.long_name,
                desc: vehicle.route.route_desc
            }
        }]
    }

    map.addSource(`vehicle-${vehicle.id}`, {
        type: "geojson",
        data: geojson
    });

    map.addLayer({
        id: `vehicle-${vehicle.id}`,
        type: "circle",
        source: `vehicle-${vehicle.id}`,
        paint: {
            "circle-color": ["get", "color"],
            "circle-radius": 8,
            "circle-stroke-color": ["get", "color"],
            "circle-stroke-width": 2
        }
    });

    map.moveLayer(`vehicle-${vehicle.id}`);
}


//! Version 1: Human-written, janky (does not use animation frames)
// function vehicleMoveTo(vehicle, current, destination) {    
//     if (!map) return;
//     if (current[0] === destination[0] && current[1] === destination[1]) return;
//     const now = new Date();
//     vehicle.mapInterpolationTime = now;

//     const shape = vehicle.shape;

//     const [initClosestCoord, initDistance] = findBusDistanceFromOrigin([current[1], current[0]], shape);
//     const [destClosestCoord, destDistance] = findBusDistanceFromOrigin([destination[1], destination[0]], shape);

//     const diffDistance = Math.max(initDistance, destDistance) - Math.min(initDistance, destDistance);
//     const distPerIncrement = 0.001; // m
//     const timePerIncrement = 10; // ms

//     console.log(`%c[${new Date().toISOString()}] Moving vehicle ${vehicle.id} from ${current} to ${destination} - ${diffDistance}m`,
//         'background: #222; color: #bada55');

//     for (let m = 0, i = 0; m < Math.ceil(diffDistance); m += Math.min(distPerIncrement, Math.ceil(diffDistance) - m), i += 1) {
//         let real_m = m;
//         if (m > diffDistance) real_m = diffDistance;
//         if (initDistance > destDistance) real_m *= -1;

//         const [point_lat, point_lon] = findShapePointByDistTraveled(initDistance + real_m, shape);
//         setTimeout(() => vehicleSetTo(vehicle, [point_lon, point_lat], now), i * timePerIncrement);
//     }
// }



//! Version 2: AI-generated, does not use vehicle speed for interpolation speed
// function vehicleMoveTo(vehicle, current, destination) {
//     if (!map) return;
//     if (current[0] === destination[0] && current[1] === destination[1]) return;

//     const now = new Date();
//     vehicle.mapInterpolationTime = now;

//     const shape = vehicle.shape;

//     const [, initDistance] =
//         findBusDistanceFromOrigin([current[1], current[0]], shape);

//     const [, destDistance] =
//         findBusDistanceFromOrigin([destination[1], destination[0]], shape);

//     const diffDistance =
//         Math.abs(destDistance - initDistance);

//     const distPerIncrement = 0.001; // km
//     const timePerIncrement = 10;    // ms

//     console.log(
//         `%c[${new Date().toISOString()}] Moving vehicle ${vehicle.id} from ${current} to ${destination} - ${diffDistance}km`,
//         'background: #222; color: #bada55'
//     );

//     const direction = initDistance > destDistance ? -1 : 1;
//     const startTime = Date.now();

//     function animate() {
//         const elapsed = Date.now() - startTime;

//         const m = Math.min(
//             Math.floor(elapsed / timePerIncrement) * distPerIncrement,
//             diffDistance
//         );

//         const shapeDistance =
//             initDistance + m * direction;

//         const [point_lat, point_lon] =
//             findShapePointByDistTraveled(shapeDistance, shape);

//         vehicleSetTo(
//             vehicle,
//             [point_lon, point_lat],
//             now
//         );

//         if (m < diffDistance) {
//             vehicle.mapInterpolationFrame =
//                 requestAnimationFrame(animate);
//         } else {
//             vehicle.mapInterpolationFrame = null;
//         }
//     }

//     vehicle.mapInterpolationFrame =
//         requestAnimationFrame(animate);
// }



//! Version 3: AI-generated, uses vehicle speed for interpolation speed, but I don't trust it
function vehicleMoveTo(vehicle, current, destination) {
    if (!map) return;
    if (current[0] === destination[0] && current[1] === destination[1]) return;

    const now = new Date();
    vehicle.mapInterpolationTime = now;

    const shape = vehicle.shape;

    const [, initDistance] =
        findBusDistanceFromOrigin([current[1], current[0]], shape);

    const [, destDistance] =
        findBusDistanceFromOrigin([destination[1], destination[0]], shape);

    const diffDistance =
        Math.abs(destDistance - initDistance);

    const direction =
        initDistance > destDistance ? -1 : 1;

    const previousSpeed = Number(vehicle.speed.at(-2));
    const currentSpeed = Number(vehicle.speed.at(-1));

    console.log(
        `%c[${new Date().toISOString()}] Moving vehicle ${vehicle.id} ` +
        `from ${current} to ${destination} - ${diffDistance}km ` +
        `(${previousSpeed} → ${currentSpeed} m/s)`,
        'background: #222; color: #bada55'
    );

    if (vehicle.mapInterpolationFrame) {
        cancelAnimationFrame(vehicle.mapInterpolationFrame);
    }

    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;

        // Interpolate between previous and current speed.
        const progress = Math.min(elapsed / 1000, 1);

        const speed =
            previousSpeed +
            (currentSpeed - previousSpeed) * progress;

        // m/s → km/ms
        const kmPerMs = speed / 1_000_000;

        // Distance travelled since animation started.
        const distance =
            Math.min(
                elapsed * kmPerMs,
                diffDistance
            );

        const shapeDistance =
            initDistance +
            distance * direction;

        const [point_lat, point_lon] =
            findShapePointByDistTraveled(
                shapeDistance,
                shape
            );

        vehicleSetTo(
            vehicle,
            [point_lon, point_lat],
            now
        );

        if (distance < diffDistance) {
            vehicle.mapInterpolationFrame =
                requestAnimationFrame(animate);
        } else {
            vehicle.mapInterpolationFrame = null;
        }
    }

    vehicle.mapInterpolationFrame =
        requestAnimationFrame(animate);
}




function vehicleSetTo(vehicle, position, now = vehicle.mapInterpolationTime) {
    if (!map) return;
    if (vehicle.mapInterpolationTime !== now) return;

    const source = map.getSource(`vehicle-${vehicle.id}`)
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
                color: `#${vehicle.route.route_color}`,
                short_name: vehicle.route.short_name,
                long_name: vehicle.route.long_name,
                desc: vehicle.route.route_desc
            }
        }]
    });

    map.moveLayer(`vehicle-${vehicle.id}`);
}