import db from "../db.js";

async function eventFiller(req, res, next) {
  try {
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
  console.log("=== perHeadFiller ===");
  console.log("req.params:", req.params);
  console.log("req.params.id:", req.params.id);
  console.log("req.url:", req.url);
  console.log("req.originalUrl:", req.originalUrl);

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

    const totalRes = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total 
       FROM expenses WHERE event_id = $1`,
      [eventID]
    );
    const totalExpenses = parseFloat(totalRes.rows[0].total) || 0;

    const memberRes = await db.query(
      `SELECT COUNT(*) AS count 
       FROM event_members WHERE event_id = $1`,
      [eventID]
    );
    const memberCount = parseInt(memberRes.rows[0].count, 10) || 1;

    const fairShare = totalExpenses / memberCount;

    const myPaidRes = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total 
       FROM expenses WHERE event_id = $1 AND paid_by = $2`,
      [eventID, userID]
    );
    const myPaid = parseFloat(myPaidRes.rows[0].total) || 0;

    const iPaidOutRes = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total 
       FROM settlements
       WHERE event_id = $1 AND payer_id = $2 AND status = 'paid'`,
      [eventID, userID]
    );
    const iPaidOut = parseFloat(iPaidOutRes.rows[0].total) || 0;

    const iPaidInRes = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total 
       FROM settlements
       WHERE event_id = $1 AND payee_id = $2 AND status = 'paid'`,
      [eventID, userID]
    );
    const iPaidIn = parseFloat(iPaidInRes.rows[0].total) || 0;

    res.locals.perHeadAmount = (myPaid - fairShare) - iPaidIn + iPaidOut;

    next();
  } catch (err) {
    console.error("Error in perHeadFiller:", err);
    res.locals.perHeadAmount = 0;
    next(err);
  }
}

async function dashboardBalanceFiller(req, res, next) {
  try {
    if (!req.isAuthenticated()) {
      return res.redirect("/login");
    }

    const userID = req.user.id;

    const allEventsRes = await db.query(
      `SELECT id, name, join_code FROM events WHERE created_by = $1
       UNION
       SELECT events.id, events.name, events.join_code
       FROM events
       JOIN event_members ON events.id = event_members.event_id
       WHERE event_members.user_id = $1`,
      [userID]
    );

    const allEvents = allEventsRes.rows;

    if (allEvents.length === 0) {
      res.locals.eventBalances = [];
      res.locals.overallBalance = 0;
      return next();
    }

    const eventIDs = allEvents.map(e => e.id);

    const expenseRes = await db.query(
      `SELECT
         e.id AS event_id,
         COALESCE(SUM(CASE WHEN ex.paid_by = $1 THEN ex.amount ELSE 0 END), 0) AS paid_by_me,
         COALESCE(SUM(ex.amount), 0) AS total,
         (SELECT COUNT(*) FROM event_members em WHERE em.event_id = e.id) AS member_count
       FROM events e
       LEFT JOIN expenses ex ON ex.event_id = e.id
       WHERE e.id = ANY($2)
       GROUP BY e.id`,
      [userID, eventIDs]
    );

    const paidOutRes = await db.query(
      `SELECT event_id, COALESCE(SUM(amount), 0) AS total
       FROM settlements
       WHERE payer_id = $1 AND event_id = ANY($2) AND status = 'paid'
       GROUP BY event_id`,
      [userID, eventIDs]
    );

    const paidInRes = await db.query(
      `SELECT event_id, COALESCE(SUM(amount), 0) AS total
       FROM settlements
       WHERE payee_id = $1 AND event_id = ANY($2) AND status = 'paid'
       GROUP BY event_id`,
      [userID, eventIDs]
    );

    const paidOutMap = {};
    paidOutRes.rows.forEach(r => {
      paidOutMap[parseInt(r.event_id)] = parseFloat(r.total) || 0;
    });

    const paidInMap = {};
    paidInRes.rows.forEach(r => {
      paidInMap[parseInt(r.event_id)] = parseFloat(r.total) || 0;
    });

    const balanceMap = {};
    expenseRes.rows.forEach(row => {
      const total = parseFloat(row.total) || 0;
      const paidByMe = parseFloat(row.paid_by_me) || 0;
      const memberCount = parseInt(row.member_count) || 1;
      const fairShare = total / memberCount;
      const paidOut = paidOutMap[parseInt(row.event_id)] || 0;
      const paidIn = paidInMap[parseInt(row.event_id)] || 0;

      balanceMap[parseInt(row.event_id)] = (paidByMe - fairShare) - paidIn + paidOut;
    });

    res.locals.eventBalances = allEvents.map(event => ({
      ...event,
      balance: balanceMap[parseInt(event.id)] ?? 0
    }));

    res.locals.overallBalance = res.locals.eventBalances
      .reduce((sum, e) => sum + e.balance, 0);

    next();
  } catch (err) {
    console.error("dashboardBalanceFiller error:", err);
    res.locals.eventBalances = [];
    res.locals.overallBalance = 0;
    next();
  }
}

export { eventFiller, joinedEventFiller, perHeadFiller, dashboardBalanceFiller };