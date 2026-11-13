const {Database} = require('node:sqlite');
const path = require('path');
const dbPath = path.join(__dirname, '../../database/data.db');
const db = new Database(dbPath);
db.exec('PRAGMA foreign_keys = ON');
const tables = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    ORDER BY name
`).all();
console.log('DB found!');
console.log('Tables:', tables.map(table => table.name).join(', '));
module.exports = db;