import express from "express";
import dotenv from "dotenv";
import db from "./db.js";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";

// Constants
dotenv.config();
const PORT = process.env.PORT || 3000;
const saltRound = process.env.SALT_ROUND;



const app = express();

//connecting database
db.connect();

//ctreating session
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
}))

app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.locals.isAuth = req.isAuthenticated ? req.isAuthenticated() : false;
  next();
});

app.get("/", (req, res) => {

  res.render("home.ejs");

});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
});

app.get("/dashboard", (req, res) => {
  const events = []; // replace with DB later
  res.render("dashboard", { events });
});

app.get("/events/create", (req, res) => {
  const events = [];
  res.render("create-event", { events });
})

app.get("/events/join", (req, res) => {
  res.render("join-event");
})

passport.use("local", new Strategy(function verify(username, password, cb) {
  const result = db.query("SELECT * FROM users WHERE email=$1", [username]);
  if (result.rows.length) {
    //data found part
    const userData = result.rows[0];
    bcrypt.compare(password, userData.password, (err, validLogin) => {
      if (err) {
        console.log(`Comparision erro ${err}`);
        return cb(err);
      }
      else {
        if (validLogin) {
          req.session.userId = userData.id;
          return cb(null, userData); //correct Password
        }

        else {
          return cb(null, false);// incorrect passowrd

        }
      }

    })

  }
  else {
    cb(null, false);//that is no person in database still login attempt made
  }

}))

app.listen(PORT, () => {
  console.log(`ALIVE AND KICKING ON PORT ${PORT}`);
});