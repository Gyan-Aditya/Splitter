import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import bcrypt from "bcrypt";
import db from "../db.js";

export default function passportConfigurations() {

  // local strategy
  passport.use("local", new LocalStrategy(async (username, password, cb) => {
    try {
      const result = await db.query("SELECT * FROM users WHERE email=$1", [username]);
      //get alll data with username or email matched 

      if (!result.rows.length) {
        return cb(null, false);
      }//if no data with same user name return a call back with null errors and false authentication
      const userData = result.rows[0];

      const validLogin = await bcrypt.compare(password, userData.password);
      // if user exists compare password hash using bcrypt 


      if (validLogin) {
        return cb(null, userData);
      }
      //if hash matchess return null error and userdata so that it remains true which converts to returning not false eitherwise

      return cb(null, false);
      // if hsh do not match just reutn no error ie null and a false authentication

    }
    catch (err) {
      return cb(err, false);
      // if anything fails while retrieving data or authentication catch error and return error and false authentication .
    }
  }));

  // // google strategy

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/callback"
  },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await db.query("SELECT * FROM users WHERE google_id=$1", [profile.id]);

        if (user.rows.length > 0) {

          // console.log(profile)
          // console.log(profile.emails)
          // console.log(profile.emails[0])
          // console.log(profile.emails[0].value + " " + profile.id);
          return done(null, user.rows[0]);
        }

        const newUser = await db.query("INSERT INTO users (email, google_id) VALUES ($1,$2) RETURNING *", [profile.emails[0].value, profile.id]);

        return done(null, newUser.rows[0]);
      }
      catch (err) {
        return done(err, null);
      }
    }
  ));



  /// serialization

  passport.serializeUser((user, cb) => {
    cb(null, user.id);
  })

  passport.deserializeUser(async (id, cb) => {
    try {
      const result = await db.query("SELECT * FROM users WHERE id=$1", [id]);

      cb(null, result.rows[0]);
    }
    catch (err) {
      cb(err);
    }
  });


}