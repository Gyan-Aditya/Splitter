import db from "../db.js";

async function eventFiller(req, res, next) {
  try {
    // Initialize both variables to empty arrays to prevent undefined errors
    if (!req.isAuthenticated()) {
      return res.redirect("/login");
    }
    res.locals.events = [];
    res.locals.joinedEvents = [];

    req.userID = req.user.id;
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

async function joinedEventFiller(req, res, next) {
  try {
    req.userID = req.user.id;
    if (req.isAuthenticated()) {
      const eventData = await db.query(
        `SELECT events.*
         FROM events
          JOIN event_members ON events.id = event_members.event_id
          WHERE event_members.user_id = $1`,
        [req.user.id]
      );

      res.locals.joinedEvents = eventData.rows || [];
    }
    next();
  } catch (err) {
    console.log(err);
    next();
  }
}

export { eventFiller, joinedEventFiller }; 