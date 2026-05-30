import db from "../db.js";
// db.connect();

async function createEventsTable() {
  const events = await db.query(`CREATE TABLE events (
     id SERIAL PRIMARY KEY,
     name TEXT NOT NULL,
     join_code TEXT UNIQUE NOT NULL,
     created_by INTEGER REFERENCES users(id),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 )`);
}

export default events;