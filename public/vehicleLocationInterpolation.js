
function estimateVehicleLocation(bus, historicalBus, geolocTimestamp, shape) {
	const [bus_lat, bus_long, bus_t] = [bus[0], bus[1], Date.parse(bus[2])];
	const [histBus_lat, histBus_long, histBus_t] = [historicalBus[0], historicalBus[1], Date.parse(historicalBus[2])];

    const timeSpan = (bus_t - histBus_t) || 1;
    const interpFactor = (geolocTimestamp - histBus_t) / timeSpan;

	console.log(bus_t - histBus_t, geolocTimestamp, timeSpan, interpFactor)

    const tripStart = shape[0];
    const [originLat, originLong] = [Number(tripStart.shape_pt_lat), Number(tripStart.shape_pt_lon)];

    const bus_originDist = findDistanceBetweenPoints(originLat, originLong, bus_lat, bus_long);
    const histBus_originDist = findDistanceBetweenPoints(originLat, originLong, histBus_lat, histBus_long);

	console.log(originLat + " " + originLong + " " + bus_originDist)

    let estimatedDistance = 0;
    if (geolocTimestamp > bus_t) {
        // extrapolate: meters per ms * ms = meters
        const dt = (bus_t - histBus_t) || 1;
        const estimatedVelocity = (bus_originDist - histBus_originDist) / dt;
        const timeDifference = geolocTimestamp - bus_t;
        estimatedDistance = bus_originDist + (estimatedVelocity * timeDifference);
    } else {
        // interpolate between previous and current origin-distances
        estimatedDistance = histBus_originDist + interpFactor * (bus_originDist - histBus_originDist);
    }

	console.log(bus_originDist);

    return findclosestShapePoint(bus_originDist	, shape, [bus_lat, bus_long]);
}

function findclosestShapePoint(distance, shape, position) {
    // Possible idea:
    // Sort by distance of current bus position
    // Sort by distance of last bus position
    // Find which point is shared highly by both
    // Thats the closest point
    // Find the other point that forms the line that the bus is on (either the last point or the next point)
    // Calculate based on that line the dist traveled of the bus
    // Should be ready for interpolation






    shape.sort((a, b) => findDistanceBetweenPoints(a.shape_pt_lat, a.shape_pt_lon, position[0], position[1]) - findDistanceBetweenPoints(b.shape_pt_lat, b.shape_pt_lon, position[0], position[1]));
    console.log("Nearest point:", shape[0].shape_pt_lat, shape[0].shape_pt_lon);

	let [est_lat, est_long] = [null, null];
    for (let i = 0; i < shape.length; i++) {
		const shapeDistTraveled = Number(shape[i].shape_dist_traveled) * 1000
		const nextShapeDistTraveled = Number(shape[i+1].shape_dist_traveled) * 1000
        // compare distance-to-element vs distance-to-current-closest
        if (shapeDistTraveled < distance && distance < nextShapeDistTraveled) {
            console.log("shapeDistTraveled", shapeDistTraveled, "distance", distance, "nextShapeDistTraveled", nextShapeDistTraveled);
			console.log(shape[i].shape_pt_lat, shape[i].shape_pt_lon, shape[i].shape_pt_sequence);
			const t_space = Number(shape[i].shape_dist_traveled) / (Number(shape[i+1].shape_dist_traveled) - Number(shape[i].shape_dist_traveled));
			est_lat = Number(shape[i].shape_pt_lat) + t_space * (Number(shape[i+1].shape_pt_lat) - Number(shape[i].shape_pt_lat));
			est_long = Number(shape[i].shape_pt_lon) + t_space * (Number(shape[i+1].shape_pt_lon) - Number(shape[i].shape_pt_lon));

            drawPoints([
                [est_lat, est_long],
                [Number(shape[i].shape_pt_lat), Number(shape[i].shape_pt_lon)],
                [Number(shape[i+1].shape_pt_lat), Number(shape[i+1].shape_pt_lon)]
            ]);
			break;
        }
    }
    
    return [est_lat, est_long];
}


function findClosestPointOnSegment(bus_pos, shape_pos_a, shape_pos_b) {
    const [bus_x, bus_y] = bus_pos;
    const [a_x, a_y] = shape_pos_a;
    const [b_x, b_y] = shape_pos_b;
    
    const diff_x = b_x - a_x;
    const diff_y = b_y - a_y;
    
    if (diff_x == 0 || diff_y == 0) return;
    
    const perc = ((bus_x - a_x) * diff_x + (bus_y - a_y) * diff_y) / (diff_x * diff_x + diff_y * diff_y);
    const percClamp = Math.max(0, Math.min(perc));
    
    const closest_x = a_x + percClamp * diff_x;
    const closest_y = a_y + percClamp * diff_y;
    
    return [
        closest_x,
        closest_y,
        percClamped
    ];
}