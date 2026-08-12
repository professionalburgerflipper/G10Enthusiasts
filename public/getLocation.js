let geolocationCache = [null, null, null, null, null]

async function initGeolocCache() {
    geolocationCache = await getLocation(false);
    document.getElementById("debug2").innerHTML = geolocationCache;
}

initGeolocCache();

setInterval(
    async () => {
        try { 
            geolocationCache = await getLocation(true);
            document.getElementById("debug2").innerHTML = geolocationCache;
        }
        catch {geolocationCache = await getLocation(false);}
    },
    15000
);

function getLocation(high_acc) {
    return new Promise((resolve, reject) => {
        if ("geolocation" in navigator) {
            // Geolocation options
            const options = {
                enableHighAccuracy: high_acc,
                timeout: 5000,
                maximumAge: 30000
            };

            // Get the current position using the Geolocation API
            // Resolves latitude and longitude on success
            // Rejects with a specific error on failure

            navigator.geolocation.getCurrentPosition(
                (position, speed) => resolve([position.coords.latitude, position.coords.longitude, speed, position.coords.accuracy, new Date()]),
                (error) => {
                    geolocationErrorCallback(error, high_acc);
                    reject(error);
                },
                options
            );
        } else {
            // Errors out if geolocation is not supported by the browser
            console.error("Geolocation is not supported by browser");
            reject(new Error("Geolocation is not supported by browser"));
        }
    });
}

// Error messages for geolocation errors, with a fallback to low accuracy if high accuracy fails
function geolocationErrorCallback(error, high_acc) {
    switch (error.code) {
        // Manual permission denied error
        case error.PERMISSION_DENIED:
            console.error("Geolocation - User denied Geolocation");
            break;
        // Automatic permission denied error
        case error.POSITION_UNAVAILABLE:
            console.error("Geolocation - Location information unavailable");
            break;
        // Timeout error, attempts low accuracy if high accuracy fails
        case error.TIMEOUT:
            if (high_acc) console.log("Geolocation - Location request timed out; Attempting low accuracy...");
            else console.error("Geolocation - Location request timed out");
            break;
        // Miscellaneous / Unknown error
        default:
            console.error("Geolocation - An unknown error occurred");
            break;
    }
}

// Finds the closest vehicle to the user
async function findClosestVehicle(vehicleData, high_acc=true) {
    try {
        // Default empty values to be overridden by geolocation results
        let [lat, long, speed, acc, timeStamp] = geolocationCache;

        // Parse the inputted vehicle data
        const parsedVehicleData = JSON.parse(vehicleData);

        // Declares the furthest vehicle and its fleet number
        let closestVehicleDist = Number.POSITIVE_INFINITY;
        let closestVehicleFleetNumber = null;

        // Returns early if there are no vehicles in the data with a unique fleet number
        if ((parsedVehicleData.data || []).length === 0) { // 101% perfect implementaion. 
            console.log("No vehicle data available to find closest vehicle.");
            return [-1, "None"];
        }

        // Iterates through the vehicle data to find the closest vehicle based on the user's geolocation
        for (const value of Object.values(parsedVehicleData.data || {})) {
            if (value && typeof value === "object" && value.lat != null && value.long != null) {
                // Calculates the distance between the user's location and the iterated vehicle's
                const distance = findDistanceBetweenPoints(lat, long, value.lat, value.long);

                // Determines if the iterated vehicle is closer than the current closest
                if (distance < closestVehicleDist) {
                    // If so, updates the closest vehicle distance and fleet number
                    closestVehicleDist = distance;
                    closestVehicleFleetNumber = value.fleetNumber;
                }
            }
        }
        // Returns the closest vehicle's distance and corresponding fleet number
		return [closestVehicleDist, closestVehicleFleetNumber];
    } catch (error) {
        // Logs an error message if the closest vehicle cannot be found due to geolocation failure or other issues
        console.error("Closest vehicle not found; Geolocation failed.", error || "??");
        // Returns a default error value indicating that the closest vehicle could not be determined
		return [-1, "Error"];
    }
}

// Calculates the distance between two geographical points using the Haversine formula
function findDistanceBetweenPoints(lat1, long1, lat2, long2) {
    // Converts degrees to radians and defines the Earth's radius in meters
    const radiansConv = Math.PI / 180;
    const R = 6371e3;

    // Calculates the latitude and longitude in radians for both points
    const phi1 = lat1 * radiansConv;
    const phi2 = lat2 * radiansConv;

    // Calculates the differences in latitude and longitude between the two points
    const deltaPhi = (lat2 - lat1) * radiansConv;
    const deltaLambda = (long2 - long1) * radiansConv;

    // Applies the Haversine formula
    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        (Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2));

    // Calculates the angular distance in radians and converts it to meters using the Earth's radius
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Returns the calculated distance in meters between the two geographical points
    return R * c;
}