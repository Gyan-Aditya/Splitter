import db from "../db.js";  

async function handleExpenseCreation(req, res) {
  try {
    if (!req.isAuthenticated()) {
      return res.redirect("/login");
    }
    const description = req.body.description;
    const amount = req.body.amount;
    const user_id = req.user.id;
    const eventId = req.params.eventID;
    if (!eventId || !description || !amount) {
      return res.status(400).send("All fields are required");
    }
    await db.query(
      "INSERT INTO expenses (event_id, description, amount, paid_by) VALUES ($1, $2, $3, $4)",
      [eventId, description, amount, user_id]
    );
    res.redirect(`/events/${eventId}`);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error creating expense");
  }
}

async function handleExpenseDeletion(req, res) {
  try {
    if (!req.isAuthenticated()) {
        return res.redirect("/login");
    }
    const expenseID = req.params.expenseID;
    const eventID = req.body.eventID;
    if (!expenseID) {
        return res.status(400).send("Expense ID is required");
    }
    await db.query(
        "DELETE FROM expenses WHERE id = $1",
        [expenseID]
    );
    res.redirect(`/events/${eventID}`);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error deleting expense");
  }
};



export { handleExpenseCreation, handleExpenseDeletion };
