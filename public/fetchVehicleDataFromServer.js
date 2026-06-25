// URL to fetch vehicle data from.
const fetchURL = './vehicles'

let cachedVehicleData

// Fetch vehicle data from server
async function refreshVehicleData() {
	// Temp. To display stringified data to frontend.
	const _tempVehicleOutput = document.querySelector("#tempVehicleOutput");
	try {
		const response = await fetch(fetchURL);
		if (!response.ok) throw new Error(`No response from Backend at -'${fetchURL}'`);

		cachedVehicleData = JSON.stringify(await response.json());
		findClosestVehicle(cachedVehicleData);

	} catch (error) {
		console.error("Failed to auto-refresh vehicle data -", error);
	}
}

// Update data every 15s.
setInterval(refreshVehicleData, 15000);

document.addEventListener(
	"DOMContentLoaded", () => {
		refreshVehicleData();
	}
);