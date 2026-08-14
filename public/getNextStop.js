
function getNextStop() {
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
        if (diff <= closest_diff && diff > 0) {
            closest_index = i 
            closest_diff = diff
        }
    }

    const view = document.querySelector('#next-stop')
    view.style.setProperty('--next-stop', `"${cache.closestVehicle.stops[closest_index].stop_name}"`);
    // document.querySelector('#next-stop::after').textContent = cache.closestVehicle.stops[closest_index].stop_name;

    // console.log(closest_index) // <-- returns NaN, logic error most likely
    // return cache.closestVehicle.stops[closest_index].stop_name lol
}