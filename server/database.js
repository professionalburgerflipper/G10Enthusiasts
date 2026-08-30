// require('dotenv').config();
// console.log(process.env.connStr)

// const { Pool } = require('pg');
// const pool = new Pool({ connectionString: process.env.connStr });
// const log = require('./customLog.js');

// /**
//  * Run SQL query to database.
//  * @param {String} sql - SQL query as a string.
//  * @param {Boolean} print - Can be explicitly set to print SELECT result to terminal
//  * @returns 
//  */
// async function runSQL(sql, print=false) {
//     if (typeof(sql) != "string") return;
    
//     const res = await pool.query(sql);
//     if (print && sql.toLowerCase().startsWith('select')) log(`&9${JSON.stringify(res.rows)}`)
//     return res
// }

const Database = require('better-sqlite3');
const path = require("path");
const os = require("os");
const client = new Database('g10enthu.db');

async function runSQL(sql, params = []) {
    const row = client.prepare(sql);
    try { return await row.all(params); }
    catch (e) { return await row.run(params); }
}

async function createDependencies() {
    await runSQL(`
        CREATE TABLE IF NOT EXISTS tripHistory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fleetNumber INTEGER NOT NULL,
            tripID INTEGER NOT NULL,
            routeID TEXT NOT NULL,
            startTimestamp INTEGER NOT NULL DEFAULT (unixepoch()),
            endTimestamp INTEGER
        );`);
}

createDependencies();
module.exports = runSQL;

if (!module.parent) {
    // fuck_you = await runSQL("SELECT * FROM \"tripHistory\"");
	// console.log(fuck_you)
}