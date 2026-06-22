import express from "express";
import { getMyNotifications, markRead, markAllRead } from "../controllers/notificationController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", protect, getMyNotifications);
router.patch("/read-all", protect, markAllRead);
router.patch("/:id/read", protect, markRead);

export default router;
