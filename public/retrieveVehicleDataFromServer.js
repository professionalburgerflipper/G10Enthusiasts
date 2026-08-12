let cachedVehicleData;
let previousCachedVehicleDataTimeStamp;

const socket = io();

socket.on(
	'vehicleCache', async (data) => {
		previousCachedVehicleDataTimeStamp = JSON.parse(cachedVehicleData || '{}').lastUpdated;

		cachedVehicleData = JSON.stringify(data);
		const [closestVehicleDist, closestVehicleFleetNumber] = await findClosestVehicle(cachedVehicleData, false);

		updateDistanceCounter(closestVehicleDist, closestVehicleFleetNumber);
	}
);