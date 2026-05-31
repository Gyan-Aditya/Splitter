import db from "../db.js"; // [cite: 15]
import bcrypt from "bcrypt"; // [cite: 16]
import dns from "dns/promises";

const saltRound = Number(process.env.SALT_ROUND); // [cite: 16]

// 1. Array of banned placeholder domains and exact emails
const EMAIL_BLOCKLIST = [
  "example.com",
  "test.com",
  "domain.com",
  "mailinator.com", // Common disposable email service
  "10minutemail.com",
  "placeholder.com",
  "abc.com",
  "xyz.com"
];

async function validateEmailLegitimacy(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { valid: false, message: "Invalid email format structure." };

  const lowerCaseEmail = email.toLowerCase().trim();
  const domain = lowerCaseEmail.split("@")[1];

  if (EMAIL_BLOCKLIST.includes(domain) || lowerCaseEmail === "test@1234") {
    return { valid: false, message: "Registration error: Dummy, testing, or placeholder domains are not allowed." };
  }

  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return { valid: false, message: "Registration error: This domain does not have active mail servers." };
    }
  } catch (error) {

    return { valid: false, message: "Registration error: The email domain does not exist." };
  }

  return { valid: true };
}

async function handleRegister(req, res) {
  try {
    const username = req.body.username;
    const password = req.body.password;

    const emailCheck = await validateEmailLegitimacy(username);
    if (!emailCheck.valid) {
      return res.status(400).send(emailCheck.message);
    }

    if (!password || password.length < 6) {
      return res.status(400).send("Registration error: Password must be at least 6 characters long.");
    }

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
    console.error(err);
    res.send("Registration error");
  }
}

export { handleRegister }; 