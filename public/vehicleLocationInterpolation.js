/**
 * 
 * @param {*} bus 
 * @param {*} prevBus 
 * @param {*} geolocTimestamp 
 * @param {*} shape 
 * @returns 
 */
function estimatePosition(bus, prevBus, geolocTimestamp = new Date(), shape = cache.closestVehicle.shape) {
	const [bus_lat, bus_long, bus_t] = [bus[0], bus[1], new Date(bus[2])];

	if (prevBus === null) return [bus_lat, bus_long];

	const [p_bus_lat, p_bus_long, p_bus_t] = [prevBus[0], prevBus[1], new Date(prevBus[2])];

	const bus_distance = findBusDistanceFromOrigin(bus, shape)[1];
	const p_bus_distance = findBusDistanceFromOrigin(prevBus, shape)[1];

	let est_distance = null;
	if (p_bus_t < geolocTimestamp && geolocTimestamp < bus_t) {
		const t = (geolocTimestamp - p_bus_t) / (bus_t - p_bus_t);
		est_distance = p_bus_distance + t * (bus_distance - p_bus_distance);
	}
	else {
		const t = geolocTimestamp - bus_t ;
		const est_velocity = (bus_distance - p_bus_distance) / (bus_t - p_bus_t);
		est_distance = bus_distance + (est_velocity * t);
	}

	return findShapePointByDistTraveled(est_distance);
}

function findShapePointByDistTraveled(distance, shape = cache.closestVehicle.shape) {
	let closestShape = null;
	let closestShapeNext = null;

	for (let i = 0; i < (Object.values(shape).length - 1); i++) {
		const shape_dist_traveled = Number(shape[i].shape_dist_traveled);
		const next_shape_dist_traveled = Number(shape[i+1].shape_dist_traveled);

		if (shape_dist_traveled <= distance && distance <= next_shape_dist_traveled) {
			closestShape = shape[i];
			closestShapeNext = shape[i+1];
		}
	}

	if (!closestShape || !closestShapeNext) {
		// console.error(`No closest shape found for distance ${distance}`);
		return [0, 0];
	}

	const perc = (distance - Number(closestShape.shape_dist_traveled)) / (Number(closestShapeNext.shape_dist_traveled) - Number(closestShape.shape_dist_traveled));
	const lat =
		Number(closestShape.shape_pt_lat)
		+ perc * (Number(closestShapeNext.shape_pt_lat) - Number(closestShape.shape_pt_lat));
	
	const long =
		Number(closestShape.shape_pt_lon)
		+ perc * (Number(closestShapeNext.shape_pt_lon) - Number(closestShape.shape_pt_lon));

	return [lat, long];
}

function findClosestBusDistanceFromOrigin(bus, shape) {
	const [closestCoord, distance] = findBusDistanceFromOrigin(bus, shape);

	cache.closestVehicle.setSnapped(closestCoord);
    cache.closestVehicle.setDistanceTraveled(distance);
}

function findBusDistanceFromOrigin(bus, shape) {
	const [bus_lat, bus_long] = [bus[0], bus[1]];

	let closestShape = null;
	let closestShapeNext = null;
	let closestPointDist = Number.POSITIVE_INFINITY
    let closestCoord = [0, 0];

	let toNextShapePercentage = null;
	for (let i = 0; i < (Object.values(shape).length - 1); i++) {
		const [bus_lat, bus_long] = [bus[0], bus[1]];

		const shapePosA = [Number(shape[i].shape_pt_lat), Number(shape[i].shape_pt_lon)];
		const shapePosB = [Number(shape[i+1].shape_pt_lat), Number(shape[i+1].shape_pt_lon)];

		const closestPoint = findClosestPointOnSegment(
			[Number(bus_lat), Number(bus_long)],
            shapePosA,
            shapePosB
        );

		const pointDist = findDistanceBetweenPoints(closestPoint[0], closestPoint[1], bus_lat, bus_long);
		if (pointDist < closestPointDist) {
			closestShape = shape[i];
			closestShapeNext = shape[i+1];

			toNextShapePercentage = closestPoint[2];
			
            closestCoord = [closestPoint[0], closestPoint[1]]
			closestPointDist = pointDist;
		}
	}

	const distance =
		Number(closestShape.shape_dist_traveled)
		+ toNextShapePercentage * (Number(closestShapeNext.shape_dist_traveled) - Number(closestShape.shape_dist_traveled));

	return [closestCoord, distance];
}



/**
 * Method to find the closest position on a line segment (line AB) to a provided bus position
 * 
 * @param {Number[]} bus_pos - The [lat, lon] position of the bus object
 * @param {Number[]} shape_pos_a - The [lat, lon] position of position A
 * @param {Number[]} shape_pos_b - The [lat, lon] position of position B
 */
function findClosestPointOnSegment(bus_pos, shape_pos_a, shape_pos_b) {
    // Get x, y (lat, lon) of the provided positions
    const [bus_x, bus_y] = bus_pos;
    const [a_x, a_y] = shape_pos_a;
    const [b_x, b_y] = shape_pos_b;
    
    // Find the difference in coordinate axis'
    const diff_x = b_x - a_x;
    const diff_y = b_y - a_y;
    
    // Return early if no difference 
    if (diff_x == 0 && diff_y == 0) return [a_x, a_y, 0];
    
    // Project the bus position onto line segment AB to find the percentage distance the bus is along AB
    const perc = ((bus_x - a_x) * diff_x + (bus_y - a_y) * diff_y) / (diff_x * diff_x + diff_y * diff_y);
    
    // Clamp the afformentioned percentage value to be in range 0-1 (0% to 100%)
    const percClamp = Math.max(0, Math.min(1, perc));
    
    // Find the x, y (lat, lon) values based on this percentage from A
    const closest_x = a_x + percClamp * diff_x;
    const closest_y = a_y + percClamp * diff_y;
    
    // Return the x, y (lat, lon), and percentage
    return [
        closest_x,
        closest_y,
        percClamp
    ];
}