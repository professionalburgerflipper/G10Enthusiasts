// Global Variable
let map;
let doneLoading = false;
let bg_routes_added = false;

// Run on page load
document.addEventListener("DOMContentLoaded", async () => {
    // Create the map
    map = new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json', // style URL
        center: [138.59735099075218, -34.920761823897166],
        zoom: 9,
        bearing: 88.25,
        attributionControl: false,
        interactive: false,
    })

    map.on('load', () => { doneLoading = true; });

    while (!map) await new Promise(resolve => setTimeout(resolve, 100));
    while (!cache.timetable) await new Promise(resolve => setTimeout(resolve, 100));

    loadBackgroundRoutes();

});


async function loadBackgroundRoutes() {
    while (!map) await new Promise(resolve => setTimeout(resolve, 100));
    while (!doneLoading) await new Promise(resolve => setTimeout(resolve, 100));
    while (!cache.timetable?.routes) await new Promise(resolve => setTimeout(resolve, 100));
    while (!cache.timetable?.trips) await new Promise(resolve => setTimeout(resolve, 100));
    while (!cache.timetable?.shapes) await new Promise(resolve => setTimeout(resolve, 100));

    if (map.getSource("bg-routes")) {
        map.removeLayer("bg-routes");
        map.removeSource("bg-routes");
    }

    const routes = cache.timetable.routes;
    // const routeTrips = routes.map(r => cache.timetable.trips.find(t => t.route_id == r.route_id));
    // const routeShapes = routeTrips.map(t => cache.timetable.shapes.filter(s => s.shape_id == t.shape_id));

    // const geojson = {
    //     type: "FeatureCollection",
    //     features: routeShapes.map((s, i) => ({
    //         type: "Feature",
    //         geometry: {
    //             type: "LineString",
    //             coordinates: s.map(p => [Number(p.shape_pt_lon), Number(p.shape_pt_lat)])
    //         },
    //         properties: {
    //             color: `#${routes[i].route_color}`
    //         }
    //     }))
    // }

    const shapes = cache.timetable.shapes;
    const distinctShapes = []
    for (let i = 0; i < shapes.length - 1; i++) {
        const thisPoint = shapes[i];
        const nextPoint = shapes[i + 1];
        if (thisPoint.shape_id != nextPoint.shape_id) continue;

        const joinedPoints = [
            [thisPoint.shape_pt_lon, thisPoint.shape_pt_lat],
            [nextPoint.shape_pt_lon, nextPoint.shape_pt_lat]
        ];
        const inversedJoinedPoints = [
            [nextPoint.shape_pt_lon, nextPoint.shape_pt_lat],
            [thisPoint.shape_pt_lon, thisPoint.shape_pt_lat]
        ]
        if (distinctShapes.includes(joinedPoints) || distinctShapes.includes(inversedJoinedPoints)) continue;

        distinctShapes.push([joinedPoints, thisPoint.shape_id]);
    }

    const geojson = {
        type: "FeatureCollection",
        features: distinctShapes.map(d => ({
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: d[0]
            },
            properties: {
                color: `#${routes.find(r => r.route_id == cache.timetable.trips.find(t => t.shape_id == d[1]).route_id).route_color}`
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
            // 'line-cap': 'butt',
            // 'line-join': 'miter'
        },
        paint: {
            "line-color": ["get", "color"],
            "line-width": 3,
            "line-layer-opacity": 0.5
        }
    });

    function fit() {
        map.fitBounds(turf.bbox(geojson), { padding: {
            top: 60, left: 85, right: 85, bottom: 55
        }, bearing: 86.8 });
    }
    fit();

    window.addEventListener("resize", () => setTimeout(fit, 100))

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
            "circle-radius": 3,
            "circle-stroke-color": ["get", "color"],
            "circle-stroke-width": 1
        }
    });

    let popup;

    map.on('click', `stop-${stop.stop_id}`, (e) => {
        if (popup) popup.remove();
        const NS = getNextStopAtStop(stop);
        const NS_Trip = cache.timetable.trips.find(t => t.trip_id == NS[1]);
        console.log(NS_Trip);
        popup = new maplibregl.Popup({className: 'stop-popup', anchor: 'top'})
            .setLngLat(e.lngLat)
            .setHTML(`
                    <b>${stop.stop_name}</b><br>
                    <p>${stop.stop_desc}</p>
                    <p>Next Arrival: ${NS[0].toLocaleTimeString()} to ${NS_Trip.trip_headsign}</p>
                    <i>Stop ID: ${stop.stop_id}</i>
                `)
            .setMaxWidth("min-content")
            .addTo(map);
        
    });

    map.moveLayer(`stop-${stop.stop_id}`);
}

function unrenderStop(stop_id) {
    if (!map) return;
    if (map.getLayer(`stop-${stop_id}`)) {
        map.removeLayer(`stop-${stop_id}`);
        map.removeSource(`stop-${stop_id}`);
    }
}



async function instantiateMapVehicle(vehicle) {
    while (!map) await new Promise(resolve => setTimeout(resolve, 100));
    while (!bg_routes_added) await new Promise(resolve => setTimeout(resolve, 100));

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
                short_name: vehicle.route.route_short_name,
                long_name: vehicle.route.route_long_name,
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
            "circle-radius": 7,
            "circle-stroke-color": ["get", "color"],
            "circle-stroke-width": 2
        }
    });

    let popup;

    map.on('click', `vehicle-${vehicle.id}`, (e) => {
        if (popup) popup.remove();
        popup = new maplibregl.Popup({className: 'vehicle-popup', anchor: 'top'})
            .setLngLat(e.lngLat)
            .setHTML(`
                    <b>${vehicle.route.route_short_name} | Fleet #${vehicle.fleetNumber}</b><br>
                    <p>${vehicle.route.route_long_name}</p><br>
                    <i>${vehicle.id}</i>
                `)
            .setMaxWidth("min-content")
            .addTo(map);
        
    });

    map.moveLayer(`vehicle-${vehicle.id}`);
}

function unrenderMapVehicle(vehicle_id) {
    if (!map) return;
    if (map.getLayer(`vehicle-${vehicle_id}`)) {
        map.removeLayer(`vehicle-${vehicle_id}`);
        map.removeSource(`vehicle-${vehicle_id}`);
    }
}

async function makeProminent(vehicle) {
    while (!map) await new Promise(resolve => setTimeout(resolve, 100));
    while (!map.getLayer(`vehicle-${vehicle.id}`)) await new Promise(resolve => setTimeout(resolve, 100));
    map.setPaintProperty(`vehicle-${vehicle.id}`, 'circle-radius', 10);
    map.setPaintProperty(`vehicle-${vehicle.id}`, 'circle-stroke-width', 3);
    map.setPaintProperty(`vehicle-${vehicle.id}`, 'circle-stroke-color', '#F2AF29');

    const shape = vehicle.shape;

    const geojson = {
        type: "FeatureCollection",
        features: [{
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: shape.map(p => [Number(p.shape_pt_lon), Number(p.shape_pt_lat)])
            },
            properties: {
                color: `#${vehicle.route.route_color}`
            }
        }]
    }

    map.addSource(`vehicle-${vehicle.id}-route`, {
        type: "geojson",
        data: geojson
    });
    
    map.addLayer({
        id: `vehicle-${vehicle.id}-route`,
        type: "line",
        source: `vehicle-${vehicle.id}-route`,
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

async function makeNotProminent(vehicle) {
    while (!map) await new Promise(resolve => setTimeout(resolve, 100));
    while (!map.getLayer(`vehicle-${vehicle.id}`)) await new Promise(resolve => setTimeout(resolve, 100));
    map.setPaintProperty(`vehicle-${vehicle.id}`, 'circle-radius', 6);
    map.setPaintProperty(`vehicle-${vehicle.id}`, 'circle-stroke-width', 2);
    map.setPaintProperty(`vehicle-${vehicle.id}`, 'circle-stroke-color', `#${vehicle.route.route_color}`);

    if (map.getLayer(`vehicle-${vehicle.id}-route`)) {
        map.removeLayer(`vehicle-${vehicle.id}-route`);
        map.removeSource(`vehicle-${vehicle.id}-route`);
    }

    return true;
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
function vehicleMoveTo(vehicle, current, destination) {
    if (!map) return;
    if (current[0] === destination[0] && current[1] === destination[1]) {
        vehicleSetTo(vehicle, destination, vehicle.mapInterpolationTime);
        return;
    }

    const now = new Date();
    vehicle.mapInterpolationTime = now;

    const shape = vehicle.shape;

    const [, initDistance] = findBusDistanceFromOrigin([current[1], current[0]], shape);
    const [, destDistance] = findBusDistanceFromOrigin([destination[1], destination[0]], shape);

    const diffDistance = Math.abs(destDistance - initDistance);

    const distPerIncrement = 0.001; // km
    // const timePerIncrement = 14;    // ms
    const totalTime = 14 * 1000; // ms

    console.log(
        `%c[${new Date().toISOString()}] Moving vehicle ${vehicle.id} from ${current} to ${destination} - ${diffDistance}km`,
        'background: #222; color: #bada55'
    );

    const direction = initDistance > destDistance ? -1 : 1;
    const startTime = Date.now();

    function animate() {
        const elapsed = Date.now() - startTime;

        // const m = Math.min(
        //     Math.floor(elapsed / timePerIncrement) * distPerIncrement,
        //     diffDistance
        // );
        const m = Math.min(elapsed / totalTime * diffDistance, diffDistance);

        const shapeDistance =
            initDistance + m * direction;

        const [point_lat, point_lon] =
            findShapePointByDistTraveled(shapeDistance, shape);

        vehicleSetTo(
            vehicle,
            [point_lon, point_lat],
            now
        );

        if (m < diffDistance) {
            vehicle.mapInterpolationFrame =
                requestAnimationFrame(animate);
        } else {
            vehicle.mapInterpolationFrame = null;
        }
    }

    vehicle.mapInterpolationFrame =
        requestAnimationFrame(animate);
}



//! Version 3: AI-generated, uses vehicle speed for interpolation speed, but I don't trust it
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

//     const direction =
//         initDistance > destDistance ? -1 : 1;

//     const previousSpeed = Number(vehicle.speed.at(-2));
//     const currentSpeed = Number(vehicle.speed.at(-1));

//     console.log(
//         `%c[${new Date().toISOString()}] Moving vehicle ${vehicle.id} ` +
//         `from ${current} to ${destination} - ${diffDistance}km ` +
//         `(${previousSpeed} → ${currentSpeed} m/s)`,
//         'background: #222; color: #bada55'
//     );

//     if (vehicle.mapInterpolationFrame) {
//         cancelAnimationFrame(vehicle.mapInterpolationFrame);
//     }

//     const startTime = Date.now();

//     function animate() {
//         const elapsed = Date.now() - startTime;

//         // Interpolate between previous and current speed.
//         const progress = Math.min(elapsed / 1000, 1);

//         const speed =
//             previousSpeed +
//             (currentSpeed - previousSpeed) * progress;

//         // m/s → km/ms
//         const kmPerMs = speed / 1_000_000;

//         // Distance travelled since animation started.
//         const distance =
//             Math.min(
//                 elapsed * kmPerMs,
//                 diffDistance
//             );

//         const shapeDistance =
//             initDistance +
//             distance * direction;

//         const [point_lat, point_lon] =
//             findShapePointByDistTraveled(
//                 shapeDistance,
//                 shape
//             );

//         vehicleSetTo(
//             vehicle,
//             [point_lon, point_lat],
//             now
//         );

//         if (distance < diffDistance) {
//             vehicle.mapInterpolationFrame =
//                 requestAnimationFrame(animate);
//         } else {
//             vehicle.mapInterpolationFrame = null;
//         }
//     }

//     vehicle.mapInterpolationFrame =
//         requestAnimationFrame(animate);
// }




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