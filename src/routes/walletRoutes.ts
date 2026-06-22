import express from "express";
import { getMyWallet } from "../controllers/walletController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.get("/me", protect, getMyWallet);

export default router;
