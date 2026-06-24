function getLocation() {
	// Check if browser supports geolocation
	if ("geolocation" in navigator) {
		// Config options for geolocation
		const options = {
			enableHighAccuracy: true, // High accuracy location
			timeout: 10000, // Maximum wait time of 10 seconds before timeout
			maximumAge: 0 // Do not use cache
		};

		navigator.geolocation.getCurrentPosition()
	}
	else {
		console.log("Geolocation is not supported by browser!");
	}	
}

function successCallback(position) {
	const lat = position.coords.latitude;
	const long = position.coords.longitude;
	const accuracy = position.coords.accuracy; // Radius in meters
}