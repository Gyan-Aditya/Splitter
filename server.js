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
import configPassport from "./config/passport.js";
import paymentsRouter from "./routes/payments.js";

dotenv.config();


const PORT = process.env.PORT || 3000;
const saltRound = Number(process.env.SALT_ROUND);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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


configPassport();
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
    successRedirect: "/",
    failureRedirect: "/login"
  })
);

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get("/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/",
    failureRedirect: "/login"
  })
);

app.use("/events", eventsRouter);

app.use("/expenses", expensesRouter);

app.use("/payments", paymentsRouter);


app.listen(PORT, '0.0.0.0', () => {
  console.log(`ALIVE AND KICKING ON PORT ${PORT}`);
});