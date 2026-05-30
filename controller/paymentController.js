import Razorpay from "razorpay";
import crypto from "crypto";
import db from "../db.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function handleCreateOrder(req, res) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { amount, payeeID, eventID } = req.body;

    if (!amount || !payeeID || !eventID) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // prevent paying yourself
    if (parseInt(payeeID) === parseInt(req.user.id)) {
      return res.status(400).json({ error: "Cannot pay yourself" });
    }

    // amount in paise (Razorpay uses smallest currency unit)
    const order = await razorpay.orders.create({
      amount: Math.round(parseFloat(amount) * 100),
      currency: "INR",
      receipt: `evt_${eventID}_${Date.now()}`,
    });

    // store pending settlement
    await db.query(
      `INSERT INTO settlements 
       (event_id, payer_id, payee_id, amount, razorpay_order_id, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [eventID, req.user.id, payeeID, amount, order.id]
    );

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });

  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
}

async function handleVerifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;


    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    // paid update kar dena hai seedhe table mein
    const result = await db.query(
      `UPDATE settlements 
       SET status = 'paid', razorpay_payment_id = $1
       WHERE razorpay_order_id = $2
       RETURNING event_id`,
      [razorpay_payment_id, razorpay_order_id]
    );

    const eventID = result.rows[0]?.event_id;

    res.json({ success: true, eventID });

  } catch (err) {
    console.error("Error verifying payment:", err);
    res.status(500).json({ error: "Failed to verify payment" });
  }
}

export { handleCreateOrder, handleVerifyPayment };