function getLocation(high_acc) {
    const timeout = high_acc ? 2000 : 5000;
    return new Promise((resolve, reject) => {
        if ("geolocation" in navigator) {
            const options = {
                enableHighAccuracy: high_acc,
                timeout: 5000,
                maximumAge: 30000
            };

            navigator.geolocation.getCurrentPosition(
                (position) => resolve([position.coords.latitude, position.coords.longitude]),
                (error) => {
                    geolocationErrorCallback(error, high_acc);
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

function geolocationErrorCallback(error, high_acc) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            console.error("Geolocation - User denied Geolocation");
            break;
        case error.POSITION_UNAVAILABLE:
            console.error("Geolocation - Location information unavailable");
            break;
        case error.TIMEOUT:
            if (high_acc) console.log("Geolocation - Location request timed out; Attempting low accuracy...");
            else console.error("Geolocation - Location request timed out");
            break;
        default:
            console.error("Geolocation - An unknown error occurred");
            break;
    }
}

async function findClosestVehicle(vehicleData, high_acc=true) {
    try {

        let [lat, long] = [null, null]

        if (high_acc) {
            try {
                [lat, long] = await getLocation(true);
            }
            catch {
                [lat, long] = await getLocation(false);
            }
        }
        else [lat, long] = await getLocation(false);

        const parsedVehicleData = JSON.parse(vehicleData);

        let closestVehicleDist = Number.POSITIVE_INFINITY;
        let closestVehicleFleetNumber = null;

        if (parsedVehicleData.data == {}) {
            return [0, 0]
        }

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
        console.error("Closest vehicle not found; Geolocation failed.", error || "??");
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