import express from "express";
import { handleExpenseCreation, handleExpenseDeletion } from "../controller/expenseController.js";

const router = express.Router();

router.post("/add/:eventID", handleExpenseCreation);

router.post("/delete/:expenseID", handleExpenseDeletion);

export default router;