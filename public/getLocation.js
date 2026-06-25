function getLocation() {
    return new Promise((resolve, reject) => {
        if ("geolocation" in navigator) {
            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            };

            navigator.geolocation.getCurrentPosition(
                (position) => resolve([position.coords.latitude, position.coords.longitude]),
                (error) => {
                    geolocationErrorCallback(error);
                    reject(error);
                },
                options
            );
        } else {
            console.error("Geolocation is not supported by browser");
            reject(new Error("Geolocation is not supported by browser"));
        }
    });
}

function geolocationErrorCallback(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            console.error("Geolocation - User denied Geolocation");
            break;
        case error.POSITION_UNAVAILABLE:
            console.error("Geolocation - Location information unavailable");
            break;
        case error.TIMEOUT:
            console.error("Geolocation - Location request timed out");
            break;
        default:
            console.error("Geolocation - An unknown error occurred");
            break;
    }
}

async function findClosestVehicle(vehicleData) {
    try {
        const [lat, long] = await getLocation();
        const parsedVehicleData = JSON.parse(vehicleData);

        let closestVehicleDist = Number.POSITIVE_INFINITY;
        let closestVehicleFleetNumber = null;

        for (const value of Object.values(parsedVehicleData.data || {})) {
            if (value && typeof value === "object" && value.lat != null && value.long != null) {
                const distance = findDistanceBetweenPoints(lat, long, value.lat, value.long);

                if (distance < closestVehicleDist) {
                    closestVehicleDist = distance;
                    closestVehicleFleetNumber = value.fleetNumber;
                }
            }
        }
		return [closestVehicleDist, closestVehicleFleetNumber];

    } catch (error) {
        console.error("Closest vehicle not found; Geolocation failed.", error);
		return [-1, -1];
    }
}

function findDistanceBetweenPoints(lat1, long1, lat2, long2) {
    const radiansConv = Math.PI / 180;
    const R = 6371e3;

    const phi1 = lat1 * radiansConv;
    const phi2 = lat2 * radiansConv;

    const deltaPhi = (lat2 - lat1) * radiansConv;
    const deltaLambda = (long2 - long1) * radiansConv;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        (Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2));

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}