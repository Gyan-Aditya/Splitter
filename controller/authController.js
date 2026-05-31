import db from "../db.js"; 
import bcrypt from "bcrypt"; 
import dns from "dns/promises";

const saltRound = Number(process.env.SALT_ROUND); 

const EMAIL_BLOCKLIST = [
  "example.com",
  "test.com",
  "domain.com",
  "mailinator.com", 
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
    const username = req.body.username?.toLowerCase().trim(); 
    const password = req.body.password; 

    // 1. Run legitimacy validation checks
    const emailCheck = await validateEmailLegitimacy(username);
    if (!emailCheck.valid) {
      return res.status(400).send(emailCheck.message);
    }

    if (!password || password.length < 6) {
      return res.status(400).send("Registration error: Password must be at least 6 characters long.");
    }

    // 2. Query the database to see if this email exists
    const dbResult = await db.query( 
      "SELECT * FROM users WHERE email=$1", 
      [username] 
    );

    const hashedPass = await bcrypt.hash(password, saltRound); 

    if (dbResult.rows.length === 0) { 
      // CASE A: True new registration -> INSERT standard row
      await db.query( 
        "INSERT INTO users(email, password) VALUES($1, $2)", 
        [username, hashedPass] 
      );
      return res.redirect("/login?registered=1");

    } else {
      const existingUser = dbResult.rows[0];

      // CASE B: User signed up via Google originally but has no local password yet
      if (existingUser.google_id && !existingUser.password) {
        await db.query(
          "UPDATE users SET password = $1 WHERE email = $2",
          [hashedPass, username]
        );
        return res.redirect("/login?account_linked=1");
      }
      
      // CASE C: An authenticated user trying to overwrite their password from this route
      // (Or a malicious/accidental attempt to re-register an existing full profile)
      if (req.isAuthenticated() && req.user.email === username) {
        await db.query(
          "UPDATE users SET password = $1 WHERE email = $2",
          [hashedPass, username]
        );
        return res.redirect("/dashboard?password_updated=1");
      }

      // CASE D: Standard duplicate email block guard
      return res.status(400).send("Registration error: An account with this email address already exists.");
    }

  } catch (err) {
    console.error("Registration pipeline error:", err);
    res.status(500).send("Registration error"); 
  }
}

export { handleRegister };