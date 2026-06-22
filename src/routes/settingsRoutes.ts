import express from "express";
import { getPublicSettings, updateSettings } from "../controllers/settingsController";
import { protect, adminOnly } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/", getPublicSettings);                 // public
router.patch("/", protect, adminOnly, updateSettings); // admin

export default router;
