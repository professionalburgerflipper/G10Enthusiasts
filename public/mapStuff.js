// Global Variable
let map;

// Run on page load
document.addEventListener("DOMContentLoaded", () => {

    // Create the map
    map = new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json', // style URL
        center: [138.59735099075218, -34.920761823897166],
        zoom: 9,
        attributionControl: false,
        // interactive: false
    })

    // When map loads, start loading icon and add it
    map.on('load', async () => {
        const image = await map.loadImage('/media/g10.png')
        map.addImage('g10', image.data)
    })

});


/**
 * Loads a route shape to map
 * 
 * @param {string} shape_id  - The ID corresponding to the shape points
 * @param {string[]} stop_ids - The IDs corresponding to the stops for the shape
 */
function loadShapeToMap(shape, stops) {
    // Return early if missing dependencies
    if (!map) return;

    // Remove old data
    if (map.getLayer('route-shape')) map.removeLayer('route-shape');
    if (map.getSource('route-shape')) map.removeSource('route-shape');
    if (map.getLayer('stops')) map.removeLayer('stops');
    if (map.getSource('stops')) map.removeSource('stops');

    if (!shape || !stops) {
        map.flyTo({
            center: [138.59735099075218, -34.920761823897166],
            zoom: 9
        })
        return;
    }

    // Find shape points
    const coords = shape.map(s => [Number(s.shape_pt_lon), Number(s.shape_pt_lat)])

    // Format as geojson
    const geojson = {
        type: "FeatureCollection",
        features: [{
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: coords
            }
        }]
    }

    // Add to map
    map.addSource('route-shape', {
        type: 'geojson',
        data: geojson
    });
    
    map.addLayer({
        id: 'route-shape',
        type: 'line',
        source: 'route-shape',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': '#F2AF29',
            'line-width': 5
        }
    })


    // Format as geojson
    const stopsGeojson = {
        type: "FeatureCollection",
        features: stops.map(s => ({
            type: "Feature",
            properties: s,
            geometry: {
                type: "Point",
                coordinates: [Number(s.stop_lon), Number(s.stop_lat)]
            }
        }))
    }


    // Add to map
    map.addSource('stops', {
        type: 'geojson',
        data: stopsGeojson
    });

    map.addLayer({
        id: 'stops',
        type: 'circle',
        source: 'stops',
        paint: {
            'circle-color': '#ffffff',
            'circle-radius': 3,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#F2AF29'
        }
    })



    // Zoom to fit shape
    // map.fitBounds(turf.bbox(geojson), { padding: {
    //     top: 45, left: 20, right: 20, bottom: 45
    // } });


    // Reorder layers to have vehicles on top
    if (map.getLayer('vehicles')) map.moveLayer('vehicles')
    if (map.getLayer('closest-vehicle')) map.moveLayer('closest-vehicle')
}

function renderVehicles() {
    // Return early if missing dependencies
    if (!map) return;
    
    // Remove old data
    if (map.getLayer('vehicles')) map.removeLayer('vehicles');
    if (map.getSource('vehicles')) map.removeSource('vehicles');
    if (map.getLayer('closest-vehicle')) map.removeLayer('closest-vehicle');
    if (map.getSource('closest-vehicle')) map.removeSource('closest-vehicle');

    // Get closest vehicle
    const vehicles = cache.vehicles;
    const closest = cache.closestVehicle;

    // Format vehicles to geojson points
    const geojson = {
        type: "FeatureCollection",
        features: vehicles.filter(v => v.id != closest.id).map(v => ({
            type: "Feature",
            properties: {...v},
            geometry: {
                type: "Point",
                coordinates: [Number(v.long.at(-1)), Number(v.lat.at(-1))]
            }
        }))
    }

    // Format closest vehicle to a geojson point
    const closestGeojson = {
        type: "FeatureCollection",
        features: [{
            type: "Feature",
            properties: {...closest},
            geometry: {
                type: "Point",
                coordinates: [Number(closest.long.at(-1)), Number(closest.lat.at(-1))]
            }
        }]
    }

    // Add both to map
    map.addSource('vehicles', {
        type: 'geojson',
        data: geojson
    });

    map.addSource('closest-vehicle', {
        type: 'geojson',
        data: closestGeojson
    });

    map.addLayer({
        id: 'vehicles',
        type: 'symbol',
        source: 'vehicles',
        layout: {
            'icon-image': 'g10',
            'icon-size': 0.05,
            'icon-allow-overlap': true
        }
    })
    map.moveLayer('vehicles')

    map.addLayer({
        id: 'closest-vehicle',
        type: 'symbol',
        source: 'closest-vehicle',
        layout: {
            'icon-image': 'g10',
            'icon-size': 0.1,
            'icon-allow-overlap': true
        }
    })
    map.moveLayer('closest-vehicle')

    if (map.getLayer('point'))
        map.moveLayer('point')
}

function drawPoints(coords) {
    if (!map) return;

    if (map.getLayer('point')) map.removeLayer('point');
    if (map.getSource('point')) map.removeSource('point');

    const geojson = {
        type: "FeatureCollection",
        features: coords.map(c => ({
            type: "Feature",
            properties: {...c},
            geometry: {
                type: "Point",
                coordinates: [Number(c[1]), Number(c[0])]
            }
        }))
    }

    map.addSource('point', {
        type: 'geojson',
        data: geojson
    });

    map.addLayer({
        id: 'point',
        type: 'circle',
        source: 'point',
        paint: {
            'circle-color': '#ffffff',
            'circle-radius': 5,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ff0000'
        }
    })

    map.moveLayer('point')
}


function drawLine(coords) {
    if (!map) return;

    if (map.getLayer('point')) map.removeLayer('point');
    if (map.getSource('point')) map.removeSource('point');   

    const geojson = {
        type: "FeatureCollection",
        features: [{
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: coords.map(c => [c[1], c[0]])
            }
        }]
    }

    map.addSource('point', {
        type: 'geojson',
        data: geojson
    });

    map.addLayer({
        id: 'point',
        type: 'line',
        source: 'point',
        layout: {
            'line-join': 'round',
            'line-cap': 'round'
        },
        paint: {
            'line-color': '#ff0000',
            'line-width': 7
        }
    })

    map.moveLayer('point')
}