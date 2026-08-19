// Global Variable
let map;
let doneLoading = false;
let bg_routes_added = false;

let map_mode = 0;
let map_mode_delayed = 0;
let big_geojson;
let popup;

const BusIcon = document.createElement("div");
const UserIcon = document.createElement("div");
const StopMarker = document.createElement("div");

function fit() {
    switch (map_mode) {
        case 0: // Route Mode (Default)
            map.fitBounds(turf.bbox(big_geojson), { padding: {
                top: 60, left: 85, right: 85, bottom: 55
            }, bearing: 86.8 }); break;
        case 1: // Closest Vehicle Mode
            map.flyTo({
                center: [cache.closestVehicle.long.at(-1), cache.closestVehicle.lat.at(-1)],
                zoom: 15,
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
document.addEventListener("DOMContentLoaded", async () => {

    for (const x of [BusIcon, UserIcon]) x.appendChild(document.createElement("div"));
    BusIcon.children[0].style.backgroundImage = 'url("/media/Bus Icon.png")';
    UserIcon.children[0].style.backgroundImage = 'url("/media/User Icon.png")';
    StopMarker.className = 'stop-marker';

    document.querySelectorAll("#map-buttons > button").forEach((btn, idx) => {
        btn.addEventListener("click", () => {
            document.querySelectorAll("#map-buttons > button")
            .forEach((btn) => btn.classList.remove("selected"));

            btn.classList.add("selected");
            map_mode = idx;
            
            fit();
        })
    })

    while (!maplibregl) await new Promise(resolve => setTimeout(resolve, 100));

    // Create the map
    map = new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json', // style URL
        center: [138.59735099075218, -34.920761823897166],
        zoom: 9,
        bearing: 86.8,
        attributionControl: false,
        interactive: false,
    })

    map.on('load', () => { doneLoading = true; });

    while (!map) await new Promise(resolve => setTimeout(resolve, 100));
    while (!doneLoading) await new Promise(resolve => setTimeout(resolve, 100));
    
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
    
    const markerElement = StopMarker.cloneNode(true);
    markerElement.style.setProperty("--color", `#${route_color}`);
    markerElement.dataset.stop_id = stop.stop_id;

    markerElement.addEventListener("click", e => {
        if (e.target != markerElement) return;
        if (popup) popup.remove();
        const NS = getNextStopAtStop(stop);
        const NS_Trip = cache.timetable.trips.find(t => t.trip_id == NS[1]);
        console.log(NS_Trip);
        popup = new maplibregl.Popup({className: 'stop-popup', anchor: 'top'})
            .setLngLat([Number(stop.stop_lon), Number(stop.stop_lat)])
            .setHTML(`
                    <b>${stop.stop_name}</b><br>
                    <p>${stop.stop_desc}</p>
                    <p>Next Arrival: ${NS[0].toLocaleTimeString()} to ${NS_Trip.trip_headsign}</p>
                    <i>Stop ID: ${stop.stop_id}</i>
                `)
            .setMaxWidth("min-content")
            .addTo(map);
    })

    const marker = new maplibregl.Marker({ element: markerElement })
        .setLngLat([Number(stop.stop_lon), Number(stop.stop_lat)])
        .addTo(map);

}

function unrenderStop(stop_id) {
    if (!map) return;
    
    const markerElement = document.querySelector(`[data-stop_id="${stop_id}"]`);
    if (!markerElement) return;
    markerElement.remove();
}

function vehicleMoveTo(vehicle, current, destination) {
    if (!map) return;

    if (current[0] === destination[0] && current[1] === destination[1]) {
        vehicle.mapController.vehicleSetTo(destination, vehicle.bearing.at(-1), vehicle.mapInterpolationTime);
        return;
    }

    if (cache.vehicles.indexOf(vehicle) >= 3) { // limit to 3 vehicles (closest 3 to user)
        console.log(
            `%c[${new Date().toISOString()}] Skipping vehicle ${vehicle.id} (limit to 3 vehicles)`,
            'background: #222; color: #da8155'
        )
        vehicle.mapController.vehicleSetTo(destination, vehicle.bearing.at(-1), vehicle.mapInterpolationTime);
        return;
    }

    if (cache.closestVehicle.id === vehicle.id) // Re-fit map if closest vehicle and if map mode is set to that mode
        if (map_mode === 1 && map_mode_delayed === 1) fit();

    console.log(
        `%c[${new Date().toISOString()}] Moving vehicle ${vehicle.id} from ${current} to ${destination}`,
        'background: #222; color: #bada55'
    );

    const now = new Date();
    vehicle.mapInterpolationTime = now;

    const shape = vehicle.shape;

    const initBearing = Number(vehicle.bearing.at(-2));
    const destBearing = Number(vehicle.bearing.at(-1));

    function _lerpAngle(a, b, t) {
        const diff = ((b - a + 180) % 360 + 360) % 360 - 180;
        return (a + diff * t + 360) % 360;
    }

    const [, initDistance] = findBusDistanceFromOrigin([current[1], current[0]], shape);
    const [, destDistance] = findBusDistanceFromOrigin([destination[1], destination[0]], shape);

    const allPoints = [[current[0], current[1], initDistance]];
    let curDist = initDistance;

    while (true) {
        const nextShapePoint = shape.find(s => Number(s.shape_dist_traveled) > curDist && Number(s.shape_dist_traveled) < destDistance);
        if (!nextShapePoint) {
            allPoints.push([destination[0], destination[1], destDistance]);
            break;
        }

        allPoints.push([Number(nextShapePoint.shape_pt_lon), Number(nextShapePoint.shape_pt_lat), Number(nextShapePoint.shape_dist_traveled)]);
        curDist = Number(nextShapePoint.shape_dist_traveled);
    }

    const totalTime = 13 * 1000; // ms
    const startTime = new Date();

    function animate() {
        const elapsed = Date.now() - startTime;
        const elapsedPerc = elapsed / totalTime;

        if (elapsedPerc > 1) {
            vehicle.mapInterpolationFrame = null;
            vehicle.mapController.vehicleSetTo(destination, destBearing, now);
            return;
        }

        const estDistance = allPoints[0][2] + (allPoints.at(-1)[2] - allPoints[0][2]) * elapsedPerc;
        const nextPoint = allPoints.find(p => p[2] > estDistance) || allPoints.at(-1);
        const prevPoint = allPoints[allPoints.indexOf(nextPoint) - 1] || allPoints[0];
        const segmentDist = nextPoint[2] - prevPoint[2];
        const segmentPerc = (estDistance - prevPoint[2]) / segmentDist;

        const point_lat = prevPoint[1] + (nextPoint[1] - prevPoint[1]) * segmentPerc;
        const point_lon = prevPoint[0] + (nextPoint[0] - prevPoint[0]) * segmentPerc;

        const currentBearing = _lerpAngle(initBearing, destBearing, elapsedPerc);

        try { vehicle.mapController.vehicleSetTo([point_lon, point_lat], currentBearing, now); }
        catch (e) { console.warn(e, vehicle.id, vehicle.fleetNumber); vehicle.mapInterpolationFrame = null; return; }

        vehicle.mapInterpolationFrame = requestAnimationFrame(animate);
    }

    vehicle.mapInterpolationFrame = requestAnimationFrame(animate);
}