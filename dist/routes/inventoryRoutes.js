"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const inventoryController_1 = require("../controllers/inventoryController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Inventory is managed by the admin only (per branch).
router.use(authMiddleware_1.protect, authMiddleware_1.adminOnly);
router.route("/").get(inventoryController_1.listItems).post(inventoryController_1.createItem);
router.post("/bulk", inventoryController_1.bulkUpdate);
router.route("/:id").patch(inventoryController_1.updateItem).delete(inventoryController_1.deleteItem);
router.patch("/:id/adjust", inventoryController_1.adjustStock);
router.get("/:id/movements", inventoryController_1.getItemMovements);
exports.default = router;
