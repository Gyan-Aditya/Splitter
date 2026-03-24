import express from "express";
import dotenv from "dotenv";
import db from "./db.js";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import pgSession from "connect-pg-simple";

dotenv.config();

const PORT = process.env.PORT || 3000;
const saltRound = Number(process.env.SALT_ROUND);

const app = express();

db.connect();

const PgSession = pgSession(session);

const sessionStore = new PgSession({
  pool: db,
  tableName: "session"
});

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    maxAge: 1000 * 60,
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));


/* ---------- GLOBAL TEMPLATE VARIABLES ---------- */

app.use((req, res, next) => {
  res.locals.isAuth = req.isAuthenticated();
  res.locals.events = [];
  next();
});


/* ---------- EVENT LOADER MIDDLEWARE ---------- */

async function eventFiller(req, res, next) {
  try {

    if (req.isAuthenticated()) {

      const eventData = await db.query(
        "SELECT * FROM events WHERE created_by=$1",
        [req.user.id]
      );

      res.locals.events = eventData.rows || [];

    }

    next();

  } catch (err) {
    console.log(err);
    next();
  }
}


/* ---------- ROUTES ---------- */

app.get("/", eventFiller, (req, res) => {
  if (req.session.view) {
    req.session.view += 1;
  }
  else {
    req.session.view = 1;
  }
  console.log(req.session.view);
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login"
  })
);

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});

/* ---------- REGISTER USER ---------- */

app.post("/register", async (req, res) => {

  try {

    const username = req.body.username;
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

});


/* ---------- DASHBOARD ---------- */

app.get("/dashboard", eventFiller, (req, res) => {
  res.render("dashboard");
});


app.get("/events/create", eventFiller, (req, res) => {
  res.render("create-event");
});

app.get("/events/join", (req, res) => {
  res.render("join-event");
});


/* ---------- PASSPORT LOCAL STRATEGY ---------- */

passport.use("local", new Strategy(async (username, password, cb) => {

  try {

    const result = await db.query(
      "SELECT * FROM users WHERE email=$1",
      [username]
    );

    if (!result.rows.length) {
      return cb(null, false);
    }

    const userData = result.rows[0];

    const validLogin = await bcrypt.compare(
      password,
      userData.password
    );

    if (validLogin) {
      return cb(null, userData);
    }

    return cb(null, false);

  } catch (err) {

    return cb(err);

  }

}));


/* ---------- SESSION SERIALIZATION ---------- */

passport.serializeUser((user, cb) => {
  cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {

  try {

    const result = await db.query(
      "SELECT * FROM users WHERE id=$1",
      [id]
    );

    cb(null, result.rows[0]);

  } catch (err) {

    cb(err);

  }

});


app.listen(PORT, () => {
  console.log(`ALIVE AND KICKING ON PORT ${PORT}`);
});