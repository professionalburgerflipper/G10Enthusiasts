const fs = require('fs');	    // Allow for file operations
const path = require('path');	// Allow for path operations
const csv = require('csv-parser');  // Allow for csv operations

let { is_first_checked } = require('./timetableUpdater.js');

async function retrieveTimetableComponents() {
    await is_first_checked;

    const components = {
        routes: [],
        trips: [],
        shapes: [],
        stop_times: [],
        stops: []
    }

    // Routes
    const routes = await new Promise((resolve, reject) => {
        fs.createReadStream(path.join(__dirname, '..', 'timetable', 'routes.txt'))
            .pipe(csv())
            .on('data', (data) => { components.routes.push(data) })
            .on('end', () => { resolve(components.routes) })
            .on('error', (error) => { reject(error) })
    });

    // Trips
    const trips = await new Promise((resolve, reject) => {
        fs.createReadStream(path.join(__dirname, '..', 'timetable', 'trips.txt'))
            .pipe(csv())
            .on('data', (data) => { components.trips.push(data) })
            .on('end', () => { resolve(components.trips) })
            .on('error', (error) => { reject(error) })
    });

    // Shapes
    const shapes = await new Promise((resolve, reject) => {
        fs.createReadStream(path.join(__dirname, '..', 'timetable', 'shapes.txt'))
            .pipe(csv())
            .on('data', (data) => { components.shapes.push(data) })
            .on('end', () => { resolve(components.shapes) })
            .on('error', (error) => { reject(error) })
    });

    // Stop Times
    const stop_times = await new Promise((resolve, reject) => {
        fs.createReadStream(path.join(__dirname, '..', 'timetable', 'stop_times.txt'))
            .pipe(csv())
            .on('data', (data) => { components.stop_times.push(data) })
            .on('end', () => { resolve(components.stop_times) })
            .on('error', (error) => { reject(error) })
    });

    // Stops
    const stops = await new Promise((resolve, reject) => {
        fs.createReadStream(path.join(__dirname, '..', 'timetable', 'stops.txt'))
            .pipe(csv())
            .on('data', (data) => { components.stops.push(data) })
            .on('end', () => { resolve(components.stops) })
            .on('error', (error) => { reject(error) })
    });

    return components;
}

module.exports = retrieveTimetableComponents;