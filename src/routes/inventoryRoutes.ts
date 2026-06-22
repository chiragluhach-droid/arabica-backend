import express from "express";
import {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  adjustStock,
  bulkUpdate,
  getItemMovements,
} from "../controllers/inventoryController";
import { protect, adminOnly } from "../middleware/authMiddleware";

const router = express.Router();

// Inventory is managed by the admin only (per branch).
router.use(protect, adminOnly);

router.route("/").get(listItems).post(createItem);
router.post("/bulk", bulkUpdate);
router.route("/:id").patch(updateItem).delete(deleteItem);
router.patch("/:id/adjust", adjustStock);
router.get("/:id/movements", getItemMovements);

export default router;
