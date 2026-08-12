function estimateVehicleLocation(vehicleLoc, vehicleLocTimestamp, prevVehicleLoc, prevVehicleLocTimestamp, userLocTimestamp, shape) {
	const interpFactor = (userLocTimestamp - prevVehicleLocTimestamp) / (vehicleLocTimestamp - prevVehicleLocTimestamp);
	
	const tripStart = shape[0];
	const [originLat, originLong] = [tripStart.shape_pt_lat, tripStart.shape_pt_lon];

	const vehicleOriginDist = findDistanceBetweenPoints(originLat, originLong, vehicleLoc[0], vehicleLoc[1]);
	const prevVehicleOriginDist = findDistanceBetweenPoints(originLat, originLong, prevVehicleLoc[0], prevVehicleLoc[1]);

	let estimatedDistance = 0;
	if (userLocTimestamp > vehicleLocTimestamp) {
		// ... then extrapolate (guess where it would be in the future)...
		const estimatedVelocity = (vehicleOriginDist - prevVehicleOriginDist) / (vehicleLocTimestamp - prevVehicleLocTimestamp);
		const timeDifference = userLocTimestamp - vehicleLocTimestamp;
		estimatedDistance = (vehicleLoc + (estimatedVelocity * timeDifference));
	}
	else {
		// ... or interpolate (find where it was at the point of the geoloc call).
		const interpFactor = (userLocTimestamp - prevVehicleLocTimestamp) / (vehicleLocTimestamp - prevVehicleLocTimestamp);
		estimatedDistance = (prevVehicleOriginDist + interpFactor * (vehicleOriginDist - prevVehicleOriginDist));
	}

	shapePointLocation = findclosestShapePoint(estimatedDistance, shape);

	return shapePointLocation
}

function findclosestShapePoint(distance, shape) {
	let closestShapePoint = shape[0]
	shape.forEach((element, index) => {
		if (Math.abs(distance - element.shape_dist_travelled) < (Math.abs(closestShapePoint.shape_dist_travelled - element.shape_dist_travelled))) {
			closestShapePointSeq = shape[index]
		} 
	});

	return closestShapePoint
};