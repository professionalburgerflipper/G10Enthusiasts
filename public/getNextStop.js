function getNextStop() {
    // Try-catch to prevent odd errors from breaking cacheUpdate() method
    try {
        // If there is no closest vehicle, return
        if (!cache.closestVehicle) return;

        // Get the current time in seconds
        const time = new Date().toTimeString().split(' ')[0];
        const [hours, minutes, seconds] = time.split(':');
        const totalSeconds = parseInt(hours, 10) * 3600 + parseInt(minutes, 10) * 60 + parseInt(seconds, 10);

        // Get all stops and stop times for the closest vehicle
        const stop = cache.closestVehicle.stops;
        const stop_time = cache.closestVehicle.stop_times;

        // Iterate through stop times and find the closest stop
        let closest_stop_id = NaN;
        let closest_diff = Number.POSITIVE_INFINITY;
        for (let i = 0; i < stop_time.length; i++) {
            let [stop_h, stop_m, stop_s] = stop_time[i].arrival_time.split(":");
            let cleaned_stop_t = parseInt(stop_h, 10) * 3600 + parseInt(stop_m, 10) * 60 + parseInt(stop_s, 10);
            let diff = cleaned_stop_t - totalSeconds;
            if (diff < closest_diff && diff > 0) {
                closest_stop_id = stop_time[i].stop_id
                closest_diff = diff
            }
        }

        // Find the object of the next stop
        const next_stop = cache.closestVehicle.stops.find(s => s.stop_id == closest_stop_id);

        // Update the view accordingly
        const view = document.querySelector('#next-stop')
        if (next_stop)  view.style.setProperty('--next-stop', `"${next_stop.stop_name}"`);
        else view.style.setProperty('--next-stop', `"None"`);
    } catch (error) { console.log(`Error in getNextStop: ${error}`); }
}

function getNextStopAtStop(stop) {
    // If stop is a number, find the object of the stop
    if (typeof stop == "number") stop = cache.timetable.stops.find(s => s.stop_id == stop);

    // Get relevant comparison dates
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get relevant stop times
    const stop_times = cache.timetable.stop_times.filter(st => st.stop_id == stop.stop_id);

    // Convert stop times to times and sort by earliest to latest
    const stop_times_times = stop_times.map(st => {
        const [hours, minutes, seconds] = st.arrival_time.split(':');
        
        const date = new Date(midnight);
        date.setHours(hours, minutes, seconds, 0);

        return [date, st.trip_id];
    }).sort((a, b) => a[0] - b[0]);

    // Calculate next in day
    const closest = stop_times_times.find(st => st[0] > now);

    // Return either the next today or the earliest tomorrow
    return closest ? closest : stop_times_times[0];
}