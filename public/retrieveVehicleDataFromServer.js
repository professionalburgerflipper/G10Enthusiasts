let cachedVehicleData;
let previousCachedVehicleDataTimeStamp;

const socket = io();

socket.on(
	'vehicleCache', async (data) => {
		previousCachedVehicleDataTimeStamp = JSON.parse(cachedVehicleData || '{}').lastUpdated;

		cachedVehicleData = JSON.stringify(data);

		document.getElementById("debug").innerHTML = cachedVehicleData

		const [closestVehicleDist, closestVehicleFleetNumber] = await findClosestVehicle(cachedVehicleData, false);

		updateDistanceCounter(closestVehicleDist, closestVehicleFleetNumber);
	}
);