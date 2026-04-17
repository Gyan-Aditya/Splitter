import db from "../db.js";

function generateJoinCode(length = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

async function createUniqueCode() {

  let code;
  let exists = true;

  while (exists) {

    code = generateJoinCode();

    const result = await db.query(
      "SELECT 1 FROM events WHERE join_code=$1",
      [code]
    );

    exists = result.rows.length > 0;
  }

  return code;
}

export default createUniqueCode;