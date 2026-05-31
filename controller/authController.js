import db from "../db.js";
import bcrypt from "bcrypt";

const saltRound = Number(process.env.SALT_ROUND);

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function handleRegister(req, res) {

  try {

    const username = req.body.username; //Email ID is used as username
    if (!isValidEmail(username)) {
      return res.status(400).send("Invalid email format");
    }
    const password = req.body.password;

    const dbResult = await db.query(
      "SELECT * FROM users WHERE email=$1",
      [username]
    );

    if (dbResult.rows.length === 0) {

      const hashedPass = await bcrypt.hash(password, saltRound);

      await db.query(
        "INSERT INTO users(email,password) VALUES($1,$2)",
        [username, hashedPass]
      );

    }

    res.redirect("/login");

  } catch (err) {

    console.log(err);
    res.send("Registration error");

  }

}

export {handleRegister};