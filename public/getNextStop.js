
function getNextStop() {
    try {
        if (!cache.closestVehicle) return;

        const time = new Date().toTimeString().split(' ')[0];
        const [hours, minutes, seconds] = time.split(':');
        const totalSeconds = parseInt(hours, 10) * 3600 + parseInt(minutes, 10) * 60 + parseInt(seconds, 10);
        const stop = cache.closestVehicle.stops;
        const stop_time = cache.closestVehicle.stop_times;

        let closest_index = NaN;
        let closest_diff = Number.POSITIVE_INFINITY;
        for (let i = 0; i < stop_time.length; i++) {
            let [stop_h, stop_m, stop_s] = stop_time[i].arrival_time.split(":");
            let cleaned_stop_t = parseInt(stop_h, 10) * 3600 + parseInt(stop_m, 10) * 60 + parseInt(stop_s, 10);
            let diff = cleaned_stop_t - totalSeconds;
            if (diff < closest_diff && diff > 0) {
                closest_index = i 
                closest_diff = diff
            }
        }

        const view = document.querySelector('#next-stop')
        if (closest_index !== NaN)  view.style.setProperty('--next-stop', `"${cache.closestVehicle.stops[closest_index].stop_name}"`);
        else view.style.setProperty('--next-stop', `"None"`);
        // document.querySelector('#next-stop::after').textContent = cache.closestVehicle.stops[closest_index].stop_name;

        // console.log(closest_index) // <-- returns NaN, logic error most likely
        // return cache.closestVehicle.stops[closest_index].stop_name lol
    } catch (error) {
        console.log(`Error in getNextStop: ${error}`);
    }
}

function getNextStopAtStop(stop) {
    if (typeof stop == "number") stop = cache.timetable.stops.find(s => s.stop_id == stop);

    // Get relevant comparison dates
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    console.log(now, midnight)

    // Get relevant stop times
    const stop_times = cache.timetable.stop_times.filter(st => st.stop_id == stop.stop_id);

    // Convet stop times to times and sort by earliest to latest
    const stop_times_times = stop_times.map(st => {
        const [hours, minutes, seconds] = st.arrival_time.split(':');
        
        const date = new Date(midnight);
        date.setHours(hours, minutes, seconds, 0);

        return [date, st.trip_id];
    }).sort((a, b) => a[0] - b[0]);

    console.log(stop_times_times)

    // Calculate next in day
    const closest = stop_times_times.find(st => st[0] > now);

    console.log(closest)

    // Return either the next today or the earliest tomorrow
    return closest ? closest : stop_times_times[0];
}