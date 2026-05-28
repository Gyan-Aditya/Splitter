import db from "../db.js";
// db.connect();

async function createUsersTable() {
	const users = await db.query(`CREATE TABLE users(
 	id SERIAL PRIMARY KEY,
 	email TEXT UNIQUE NOT NULL,
 	password TEXT,
 	google_id TEXT,
 	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 )`);
}

export default users;