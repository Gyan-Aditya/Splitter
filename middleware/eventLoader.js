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


async function perHeadFiller(req, res, next) {
  try {
    if (!req.isAuthenticated()) {
      return res.redirect("/login");
    }

    const eventID = req.params.id;
    if (!eventID) {
      res.locals.perHeadAmount = 0;
      return next();
    }

    const userID = req.user?.id;
    if (!userID) {
      res.locals.perHeadAmount = 0;
      return next();
    }

    const totalPaidByMeRes = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE event_id = $1 AND paid_by = $2`,
      [eventID, userID]
    );
    const myTotalPaid = parseFloat(totalPaidByMeRes.rows[0].total) || 0;

    const totalPaidByOthersRes = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE event_id = $1 AND paid_by != $2`,
      [eventID, userID]
    );
    const othersTotalPaid = parseFloat(totalPaidByOthersRes.rows[0].total) || 0;

    const membersRes = await db.query(
      `SELECT COUNT(*) AS count FROM event_members WHERE event_id = $1`,
      [eventID]
    );
    const membersCount = (parseInt(membersRes.rows[0].count, 10) || 0);

    const totalEventCost = myTotalPaid + othersTotalPaid;
    const myFairShare = membersCount > 0 ? totalEventCost / membersCount : 0;

    res.locals.perHeadAmount = myTotalPaid - myFairShare;

    next();
  } catch (err) {
    console.error("Error in perHeadFiller middleware:", err);
    res.locals.perHeadAmount = 0;
    next(err);
  }
}

export { eventFiller, joinedEventFiller, perHeadFiller }; 