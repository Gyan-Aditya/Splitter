import db from "../db.js";
import createUniqueCode from "../utility/joincodes.js";

async function handleCreateEvent(req, res){

  if (!req.isAuthenticated()) {
    return res.redirect("/login");
  }

  const joinCode = await createUniqueCode();

  await db.query(
    "INSERT INTO events (name, join_code, created_by) VALUES ($1,$2,$3)",
    [req.body.name, joinCode, req.user.id]
  );

  await db.query(
    "INSERT INTO event_members (event_id, user_id) VALUES ((SELECT id FROM events WHERE join_code=$1), $2)",
    [joinCode, req.user.id]
  );

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

  // -----------------------------------
  const eventID = Number(req.params.id);
  req.eventID = eventID;

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
    // ---------------------------------
    const expensesResult = await db.query(
      `SELECT id, description, amount
       FROM expenses
       WHERE event_id = $1
       ORDER BY created_at DESC`,
      [eventID]
    );

    res.render("event", {
      event: eventResult.rows[0],
      members: membersResult.rows,
      expenses: expensesResult.rows
    });
  } catch (err) {
    console.log(err);
    res.status(500).send("Error loading event");
  }
}

export {handleCreateEvent, handleJoinEvent, handleViewEvent};