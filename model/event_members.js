import db from "../db.js";
// db.connect();

async function createEventMembersTable() {
  const event_members = await db.query(`CREATE TABLE event_members (
     id SERIAL PRIMARY KEY,
     event_id INTEGER REFERENCES events(id),
     user_id INTEGER REFERENCES users(id),
     joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
 )`);
}

export default createEventMembersTable;