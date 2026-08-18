// Global Variable
let map;
let doneLoading = false;
let bg_routes_added = false;
let icons_added = false;

let map_mode = 0;
let map_mode_delayed = 0;
let big_geojson;

function fit() {
    switch (map_mode) {
        case 0: // Route Mode (Default)
            map.fitBounds(turf.bbox(big_geojson), { padding: {
                top: 60, left: 85, right: 85, bottom: 55
            }, bearing: 86.8 }); break;
        case 1: // Closest Vehicle Mode
            map.flyTo({
                center: [cache.closestVehicle.mapLon, cache.closestVehicle.mapLat],
                zoom: 14,
                bearing: 86.8
            }); break;
        case 2: // User Geoloc Mode
            map.flyTo({
                center: [cache.geoloc.long.at(-1), cache.geoloc.lat.at(-1)],
                zoom: 14,
                bearing: 86.8
            }); break;
    }

    setTimeout(() => map_mode_delayed = map_mode, 1000);
}

// Run on page load
// document.addEventListener("DOMContentLoaded", async () => {

//     document.querySelectorAll("#map-buttons > button").forEach((btn, idx) => {
//         btn.addEventListener("click", () => {
//             document.querySelectorAll("#map-buttons > button")
//             .forEach((btn) => btn.classList.remove("selected"));

//             btn.classList.add("selected");
//             map_mode = idx;
            
//             fit();
//         })
//     })

//     while (!maplibregl) await new Promise(resolve => setTimeout(resolve, 100));

//     // Create the map
//     map = new maplibregl.Map({
//         container: 'map',
//         style: 'https://tiles.basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json', // style URL
//         center: [138.59735099075218, -34.920761823897166],
//         zoom: 9,
//         bearing: 86.8,
//         attributionControl: false,
//         interactive: false,
//     })

//     map.on('load', () => { doneLoading = true; });

//     while (!map) await new Promise(resolve => setTimeout(resolve, 100));
//     while (!doneLoading) await new Promise(resolve => setTimeout(resolve, 100));
    
//     loadBackgroundRoutes();

//     const bus_response = await map.loadImage('/media/Bus Icon.png');
//     const user_response= await map.loadImage('/media/User Icon.png');
//     map.addImage("bus", bus_response.data);
//     map.addImage("user", user_response.data);
//     icons_added = true;
// });


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
    const shapes = cache.timetable.shapes;
    const distinctShapes = [];
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
        },
        paint: {
            "line-color": ["get", "color"],
            "line-width": 3,
            "line-layer-opacity": 0.5
        }
    });

    big_geojson = geojson;

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




function vehicleMoveTo(vehicle, current, destination) {
    if (!map) return;
    if (current[0] === destination[0] && current[1] === destination[1]) {
        vehicle.mapController.vehicleSetTo(destination, vehicle.bearing.at(-1), vehicle.mapInterpolationTime);
        return;
    }

    const now = new Date();
    vehicle.mapInterpolationTime = now;

    const shape = vehicle.shape;

    const initBearing = Number(vehicle.bearing.at(-2));
    const destBearing = Number(vehicle.bearing.at(-1));

    const [, initDistance] = findBusDistanceFromOrigin([current[1], current[0]], shape);
    const [, destDistance] = findBusDistanceFromOrigin([destination[1], destination[0]], shape);

    const diffDistance = Math.abs(destDistance - initDistance);

    const distPerIncrement = 0.001; // km
    const totalTime = 14 * 1000; // ms

    console.log(
        `%c[${new Date().toISOString()}] Moving vehicle ${vehicle.id} from ${current} to ${destination} - ${diffDistance}km`,
        'background: #222; color: #bada55'
    );

    const direction = initDistance > destDistance ? -1 : 1;
    const startTime = Date.now();

    function _lerpAngle(a, b, t) {
        const diff = ((b - a + 180) % 360 + 360) % 360 - 180;
        return (a + diff * t + 360) % 360;
    }

    function animate() {
        const elapsed = Date.now() - startTime;
        const m = Math.min(elapsed / totalTime * diffDistance, diffDistance);
        
        const shapeDistance = initDistance + m * direction;
        const currentBearing = _lerpAngle(initBearing, destBearing, m / diffDistance);

        const [point_lat, point_lon] = findShapePointByDistTraveled(shapeDistance, shape);

        vehicle.mapController.vehicleSetTo([point_lon, point_lat], currentBearing, now);

        if (m < diffDistance) vehicle.mapInterpolationFrame = requestAnimationFrame(animate);
        else {
            vehicle.mapInterpolationFrame = null; 
            vehicle.mapController.vehicleSetTo(destination, destBearing, now);
        }
    }

    vehicle.mapInterpolationFrame = requestAnimationFrame(animate);
}