let watchId = null;
let retryTimeoutId = null;  

const highAccOptions = {
    enableHighAccuracy: true, // Use GPS location instead of wifi if true.
    timeout: 5000, // Error out if geoloc takes more than n seconds to complete.
    maximumAge: 0 // Do not accept any old geoloc data.
}
const lowAccOptions = {
    enableHighAccuracy: false, // Use GPS location instead of wifi if true.
    timeout: 10000, // Error out if geoloc takes more than n seconds to complete.
    maximumAge: 30000 // Allow old positions on low-acc.
}

function stopTracking() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
}

function startTracking(highAcc) {
    stopTracking();
    if (highAcc) watchId = navigator.geolocation.watchPosition(successCallback, errorCallback, highAccOptions);
    else watchId = navigator.geolocation.watchPosition(lowAccSuccessCallback, finalErrorCallback, lowAccOptions);
}

function successCallback(position) {
    if (cache.geoloc) cache.geoloc.updatePositionalData(
        position.coords.latitude,
        position.coords.longitude,
        position.coords.heading,
        position.coords.speed,
        position.coords.accuracy,
        new Date());
    else cache.geoloc = new Geoloc(
        position.coords.latitude,
        position.coords.longitude,
        position.coords.heading,
        position.coords.speed,
        position.coords.accuracy,
        new Date());
}

function lowAccSuccessCallback(position) {
    successCallback(position);

    if (!retryTimeoutId) {
        console.log("Resolved - Attempting retry high-accuracy in 15 seconds...")
        retryTimeoutId = setTimeout(
            () => {
                retryTimeoutId = null;
                startTracking(true);
            }, 15000
        )
    }
}

function errorCallback(error) {
    if (error.code === error.TIMEOUT) {
        console.warn(`Error ${error.code} - ${error.message} - Attempting low-accuracy...`)
        startTracking(false);
    } else finalErrorCallback(error)
}

function finalErrorCallback(error) {
    console.error(`Error ${error.code} - ${error.message}`);
}

function initGeoloc() {
    // Check if browser supports geoloc.
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(successCallback, finalErrorCallback, lowAccOptions);
        startTracking(true);
    } else console.error("Geolocation is not supported by browser");
}

document.addEventListener("DOMContentLoaded", () => initGeoloc());