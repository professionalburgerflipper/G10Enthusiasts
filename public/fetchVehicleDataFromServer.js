// URL to fetch vehicle data from.
const fetchURL = './vehicles'

let cachedVehicleData

// Fetch vehicle data from server
async function refreshVehicleData(high_acc=true) {
	try {
		const response = await fetch(fetchURL);
		if (!response.ok) throw new Error(`No response from Backend at - '${fetchURL}'`);

		cachedVehicleData = JSON.stringify(await response.json());
		const [closestVehicleDist, closestVehicleFleetNumber] = await findClosestVehicle(cachedVehicleData, false);

		updateDistanceCounter(closestVehicleDist, closestVehicleFleetNumber);

	} catch (error) {
		console.error("Failed to auto-refresh vehicle data -", error);
	}
}

// Update data every 15s.
setInterval(refreshVehicleData, 10000);

document.addEventListener(
	"DOMContentLoaded", () => {
		refreshVehicleData(false);
	}
);