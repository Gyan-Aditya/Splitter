import express from "express";
import { handleCreateEvent, handleJoinEvent, handleViewEvent } from "../controller/eventController.js";
import { eventFiller, perHeadFiller } from "../middleware/eventLoader.js";

const router = express.Router();

router.get("/create", eventFiller, (req, res) => {
  res.render("create-event");
});

router.post("/create", handleCreateEvent);

router.get("/join", eventFiller, (req, res) => {
  res.render("join-event");
});

router.get("/:id", perHeadFiller, handleViewEvent);

router.post("/join", handleJoinEvent);

export default router;