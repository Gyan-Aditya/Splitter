import db from "../db.js";
// db.connect();

async function createExpensesTable() {
    const expenses = await db.query(`CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    event_id INTEGER REFERENCES events(id),
    user_id INTEGER REFERENCES users(id),
    amount NUMERIC NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);
}

export default createExpensesTable;