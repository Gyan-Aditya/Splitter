import db from "../db.js";
import createUniqueCode from "../utility/joincodes.js";

async function handleCreateEvent(req, res) {

  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  const joinCode = await createUniqueCode();

  await db.query(
    "INSERT INTO events (name, join_code, created_by) VALUES ($1,$2,$3)",
    [req.body.name, joinCode, req.user.id]
  );



  res.redirect("/dashboard");
}

async function handleDeleteEvent(req, res) {

  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }
  const eventID = req.params.id;

  try {
    await db.query(
      "DELETE FROM events WHERE id=$1",
      [eventID]
    );
  } catch (err) {
    console.error("Error deleting event:", err);
    return res.status(500).send("Error deleting event");
  }

  res.redirect("/dashboard");
}

async function handleJoinEvent(req, res) {

  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }
  const joinCode = req.body.code;

  const eventResult = await db.query(
    "SELECT * FROM events WHERE join_code=$1",
    [joinCode]
  );

  if (!eventResult.rows.length) {
    return res.status(404).send("Event not found");
  }

  // Check if user is already a member
  const memberResult = await db.query(
    "SELECT * FROM event_members WHERE event_id=$1 AND user_id=$2",
    [eventResult.rows[0].id, req.user.id]
  );

  if (memberResult.rows.length) {
    return res.status(400).send("You are already a member of this event");
  }

  // Add user to event
  await db.query(
    "INSERT INTO event_members (event_id, user_id) VALUES ($1,$2)",
    [eventResult.rows[0].id, req.user.id]
  );

  res.redirect("/dashboard");
}

const handleViewEvent = async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  const eventID = Number(req.params.id);

  if (!Number.isInteger(eventID)) {
    return res.status(400).send("Invalid event id");
  }

  try {
    const eventResult = await db.query(
      "SELECT * FROM events WHERE id=$1",
      [eventID]
    );

    if (!eventResult.rows.length) {
      return res.status(404).send("Event not found");
    }

    const membersResult = await db.query(
      `SELECT users.id, users.email
       FROM event_members
       JOIN users ON users.id = event_members.user_id
       WHERE event_members.event_id = $1`,
      [eventID]
    );

    const expensesResult = await db.query(
      `SELECT id, description, amount, paid_by
       FROM expenses
       WHERE event_id = $1
       ORDER BY created_at DESC`,
      [eventID]
    );

    // per member spending
    const memberSpendingResult = await db.query(
      `SELECT paid_by, SUM(amount) AS total
       FROM expenses
       WHERE event_id = $1
       GROUP BY paid_by`,
      [eventID]
    );

    const spendingMap = {};
    memberSpendingResult.rows.forEach(row => {
      spendingMap[row.paid_by] = parseFloat(row.total) || 0;
    });

    // already settled payments FROM current user TO others in this event
    const settlementsResult = await db.query(
      `SELECT payee_id, SUM(amount) AS total
       FROM settlements
       WHERE event_id = $1 AND payer_id = $2 AND status = 'paid'
       GROUP BY payee_id`,
      [eventID, req.user.id]
    );

    const settledMap = {};
    settlementsResult.rows.forEach(row => {
      settledMap[row.payee_id] = parseFloat(row.total) || 0;
    });

    const totalExpenses = expensesResult.rows
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const memberCount = membersResult.rows.length;
    const fairShare = memberCount > 0 ? totalExpenses / memberCount : 0;

    const membersWithData = membersResult.rows.map(m => {
      const paid = spendingMap[m.id] || 0;
      const balance = paid - fairShare;  // positive = others owe them, negative = they owe others
      const alreadySettled = settledMap[m.id] || 0;

      let owedByMe = 0;
      if (m.id !== req.user.id && balance > 0.01) {
        // this member paid more than their share
        // current user owes them their fair portion of that overpayment
        const myDebt = fairShare - (spendingMap[req.user.id] || 0);
        owedByMe = Math.max(0, Math.min(myDebt, balance) - alreadySettled);
      }

      return {
        ...m,
        totalSpent: paid,
        balance,
        owedByMe,
        alreadySettled
      };
    });

    res.render("event", {
      event: eventResult.rows[0],
      members: membersWithData,
      expenses: expensesResult.rows,
      perHeadAmount: res.locals.perHeadAmount,
      currentUserID: req.user.id,
      fairShare
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading event");
  }
};


export { handleCreateEvent, handleJoinEvent, handleViewEvent, handleDeleteEvent };