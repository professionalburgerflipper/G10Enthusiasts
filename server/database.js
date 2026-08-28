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

function isSELECT(sql) {
    if (typeof(sql) != "string") return false;

    // Removal of comments
    let q = sql.trim();
    while (q.startsWith("--")) {
        const newline = q.indexOf("\n");
        if (newline == -1) break;
        q = q.slice(newline + 1).trim();
    }

    // remove whitespace and case
    q = q.toLowerCase().replace(/\s+/g, '');
    
    // Handle CTE (the reason i'm making this function)
    let idx = 0;
    const tokens = q.split(" ").filter(t => t.length > 0);

    if (idx >= tokens.length) return false;
    let keyword = tokens[idx];

    // CTE
    if (keyword === 'WITH') {
        // Locate first operation
        for (let j = idx + 1; j < tokens.length; j++) {
            const t = tokens[j];
            if (t === 'SELECT') return true;
            if (['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'].includes(t)) return false;
        }
        return false;
    }

    // Skip parenthesis
    if (keyword === '(') {
        while (idx < tokens.length && tokens[idx] !== ')') idx++;
        if (idx >= tokens.length) return false;
        keyword = tokens[idx];
    }
    
    // Or is ts basic
    return keyword === 'SELECT';
}

async function runSQL(sql, params = []) {
    const row = client.prepare(sql);
    if (isSELECT(sql)) return await row.all(params);
    else return await row.run(params);
}

module.exports = runSQL;

if (!module.parent) {
    // fuck_you = await runSQL("SELECT * FROM \"tripHistory\"");
	// console.log(fuck_you)
}