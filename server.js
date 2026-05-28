import express from "express";
import dotenv from "dotenv";
import db from "./db.js";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import pgSession from "connect-pg-simple";
import createUniqueCode from "./utility/joincodes.js"
import eventsRouter from "./routes/events.js";
import staticRouter from "./routes/basePath.js";
import { eventFiller } from "./middleware/eventLoader.js";
import GoogleStrategy from "passport-google-oauth2";
import expenses from "./model/expense.js";
import expensesRouter from "./routes/expenses.js";


dotenv.config();


const PORT = process.env.PORT || 3000;
const saltRound = Number(process.env.SALT_ROUND);

const app = express();

// db.connect();

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
    maxAge: 1000 * 60 * 60,
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




/* ---------- ROUTES ---------- */

app.use("/", staticRouter);

app.post("/login",
  passport.authenticate("local", {
    successRedirect: "/dashboard",
    failureRedirect: "/login"
  })
);

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/dashboard",
    failureRedirect: "/login"
  })
);

app.use("/events", eventsRouter);

app.use("/expenses", expensesRouter);

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

/*----------- pAssport Google authentication ----------------- */
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/auth/google/callback"
},
  async (accessToken, refreshToken, profile, done) => {

    try {

      // check if user already exists
      const user = await db.query(
        "SELECT * FROM users WHERE google_id = $1",
        [profile.id]
      );

      if (user.rows.length > 0) {
        return done(null, user.rows[0]);
      }

      // create new user
      const newUser = await db.query(
        "INSERT INTO users (email, google_id) VALUES ($1,$2) RETURNING *",
        [profile.emails[0].value, profile.id]
      );

      return done(null, newUser.rows[0]);

    } catch (err) {
      return done(err, null);
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