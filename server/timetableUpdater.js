const fs = require('fs');	    // Allow for file operations
const path = require('path');	// Allow for path operations
const JSZip = require('jszip');     // Allow for zip operations
const csv = require('csv-parser');  // Allow for csv read operations
const { createObjectCsvStringifier } = require('csv-writer'); // Allow for csv write operations

let is_first_checked = false;
let routeFilters = [];

/**
 * Method to automatically check to see if the localised timetable copy
 * is out of date, and if so, to download the new copy from the ADLM server.
 */
async function updateTimetableCache() {
	// TODO:
	// - Compare cached version with ADLM latest.txt
	// - If up to date, do nothing.
	// - Else:
	//    - Download the new .zip
	//    - Extract to new folder
	//    - Delete unnecessary files
	//    - Delete contents from files that do not pertain to routeFilter (optimisation)
	//    - Rename new folder to replace the old folder
	//    - Update cached version
	//    - Send new timetable to all connected sockets

	try {
		if (!fs.existsSync(path.join(__dirname, '..', 'current_version.txt')))
			fs.writeFileSync(path.join(__dirname, '..', 'current_version.txt'), '0');

		const currentVersion = fs.readFileSync(path.join(__dirname, '..', 'current_version.txt'), 'utf-8') || '0';

		const latestVersion = await fetch('https://gtfs.adelaidemetro.com.au/v1/static/latest/version.txt')
			.then(response => response.text());
		
		if (latestVersion == currentVersion) {
            is_first_checked = true;
            console.log(`[${new Date().toISOString()}] Timetable is already up to date!`);
            return;
        }
		console.log(`[${new Date().toISOString()}] Timetable out of date, updating...`);

		const latestZip = await fetch('https://gtfs.adelaidemetro.com.au/v1/static/latest/google_transit.zip')
			.then(response => response.arrayBuffer());

		const zip = new JSZip();
		await zip.loadAsync(latestZip);

        if (fs.existsSync(path.join(__dirname, '..', 'timetable_new')))
            fs.rmSync(path.join(__dirname, '..', 'timetable_new'), { recursive: true });
		fs.mkdirSync(path.join(__dirname, '..', 'timetable_new'));

		for (const [filename, file] of Object.entries(zip.files)) {
			if (file.dir) continue;

			if (!["routes.txt", "shapes.txt", "stops.txt",
				"trips.txt", "stop_times.txt"].includes(filename)) continue;

			const filepath = path.join(__dirname, '..', 'timetable_new', filename);

			const fileContent = await zip.file(filename).async('uint8array');
			fs.writeFileSync(filepath, fileContent);
		}

        await trimRoutes();
        const trips = await trimTrips();
        await trimShapes(trips.map(t => t.shape_id))
        const stop_ids = await trimStopTimes(trips.map(t => t.trip_id));
        await trimStops(stop_ids);
 
        if (fs.existsSync(path.join(__dirname, '..', 'timetable')))
		    fs.rmSync(path.join(__dirname, '..', 'timetable'), { recursive: true });
		fs.renameSync(path.join(__dirname, '..', 'timetable_new'), path.join(__dirname, '..', 'timetable'));

		console.log(`[${new Date().toISOString()}] Timetable updated!`);
		fs.writeFileSync(path.join(__dirname, '..', 'current_version.txt'), latestVersion);
        is_first_checked = true;
	}
	catch (err) {
		console.log(err);
	}
}

function trimRoutes() { return new Promise((resolve, reject) => {
    const results = []

    fs.createReadStream(path.join(__dirname, '..', 'timetable_new', 'routes.txt'))
    .pipe(csv())
    .on('data', (data) => {
        if (!routeFilters.includes(data.route_id)) return; 
        results.push(data);
    })
    .on('end', () => {
        // fs.writeFileSync(path.join(__dirname, '..', 'timetable_new', 'routes.txt'), 
        // `${Object.keys(results[0]).join(',')}\n${results.map(r => Object.values(r).join(',')).join('\n')}`);

        const header = Object.keys(results[0]).map(key => ({
            id: key,
            title: key
        }));

        const csvStringifier = createObjectCsvStringifier({ header });
        fs.writeFileSync(path.join(__dirname, '..', 'timetable_new', 'routes.txt'), csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(results));
        

        resolve();
    });
})} 
 
function trimTrips() { return new Promise((resolve, reject) => {
    const results = []

    fs.createReadStream(path.join(__dirname, '..', 'timetable_new', 'trips.txt'))
    .pipe(csv())
    .on('data', (data) => {
        if (!routeFilters.includes(data.route_id)) return;
        results.push(data);
    })
    .on('end', () => {
        // fs.writeFileSync(path.join(__dirname, '..', 'timetable_new', 'trips.txt'), 
        // `${Object.keys(results[0]).join(',')}\n${results.map(r => Object.values(r).join(',')).join('\n')}`);

        const header = Object.keys(results[0]).map(key => ({
            id: key,
            title: key
        }));

        const csvStringifier = createObjectCsvStringifier({ header });
        fs.writeFileSync(path.join(__dirname, '..', 'timetable_new', 'trips.txt'), csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(results));

        resolve(results);
    });
})}

function trimShapes(shape_ids) { return new Promise((resolve, reject) => {
    const results = []

    fs.createReadStream(path.join(__dirname, '..', 'timetable_new', 'shapes.txt'))
    .pipe(csv())
    .on('data', (data) => {
        if (!shape_ids.includes(data.shape_id)) return; 
        results.push(data); 
    })
    .on('end', () => {
        // fs.writeFileSync(path.join(__dirname, '..', 'timetable_new', 'shapes.txt'), 
        // `${Object.keys(results[0]).join(',')}\n${results.map(r => Object.values(r).join(',')).join('\n')}`);

        const header = Object.keys(results[0]).map(key => ({
            id: key,
            title: key
        }));

        const csvStringifier = createObjectCsvStringifier({ header });
        fs.writeFileSync(path.join(__dirname, '..', 'timetable_new', 'shapes.txt'), csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(results));

        resolve();
    });
})}

function trimStopTimes(trip_ids) { return new Promise((resolve, reject) => {
    const results = []

    fs.createReadStream(path.join(__dirname, '..', 'timetable_new', 'stop_times.txt'))
    .pipe(csv())
    .on('data', (data) => {
        if (!trip_ids.includes(data.trip_id)) return; 
        results.push(data); 
    })
    .on('end', () => {
        // fs.writeFileSync(path.join(__dirname, '..', 'timetable_new', 'stop_times.txt'), 
        // `${Object.keys(results[0]).join(',')}\n${results.map(r => Object.values(r).join(',')).join('\n')}`);

        const header = Object.keys(results[0]).map(key => ({
            id: key,
            title: key
        }));

        const csvStringifier = createObjectCsvStringifier({ header });
        fs.writeFileSync(path.join(__dirname, '..', 'timetable_new', 'stop_times.txt'), csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(results));

        resolve(results.map(r => r.stop_id));
    });
})}

function trimStops(stop_ids) { return new Promise((resolve, reject) => {
    const results = []

    fs.createReadStream(path.join(__dirname, '..', 'timetable_new', 'stops.txt'))
    .pipe(csv())
    .on('data', (data) => {
        if (!stop_ids.includes(data.stop_id)) return; 
        results.push(data); 
    })
    .on('end', () => {
        // fs.writeFileSync(path.join(__dirname, '..', 'timetable_new', 'stops.txt'), 
        // `${Object.keys(results[0]).join(',')}\n${results.map(r => Object.values(r).join(',')).join('\n')}`);

        const header = Object.keys(results[0]).map(key => ({
            id: key,
            title: key
        }));

        const csvStringifier = createObjectCsvStringifier({ header });
        fs.writeFileSync(path.join(__dirname, '..', 'timetable_new', 'stops.txt'), csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(results));

        resolve();
    });
})}






function init(rf) {
    routeFilters = rf;

    console.log(`[${new Date().toISOString()}] Starting timetable updater...`);
    updateTimetableCache();
    setInterval(updateTimetableCache, 3 * 60 * 60 * 1000); // Fetch every 3 hours
}

module.exports = {
    initTimetableUpdater: init,
    is_first_checked: () => is_first_checked
}