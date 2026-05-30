import express from "express";
import { handleCreateEvent, handleJoinEvent, handleViewEvent, handleDeleteEvent } from "../controller/eventController.js";
import { eventFiller, perHeadFiller } from "../middleware/eventLoader.js";

const router = express.Router({ mergeParams: true });

// router.get("/create", eventFiller, (req, res) => {
//   res.render("create-event");
// });
router.get("/create", (req, res) => {
  res.render("create-event");
});
router.post("/create", handleCreateEvent);

// router.get("/join", eventFiller, (req, res) => {
//   res.render("join-event");
// });
router.get("/join", (req, res) => {
  res.render("join-event");
});

router.get("/:id", perHeadFiller, handleViewEvent);

router.post("/delete/:id", handleDeleteEvent);

router.post("/join", handleJoinEvent);

export default router;