import express from "express";
import { getMenuForBranch } from "../controllers/menuController";

const router = express.Router();

router.get("/:branchSlug", getMenuForBranch);

export default router;
