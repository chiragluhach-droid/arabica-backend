"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const branchController_1 = require("../controllers/branchController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get("/", branchController_1.getBranches);
// Printer config (POS settings) — registered before the /:slug catch-all.
router.get("/printer/:branchId", authMiddleware_1.protect, branchController_1.getPrinterConfig);
router.patch("/printer/:branchId", authMiddleware_1.protect, branchController_1.updatePrinterConfig);
router.get("/:slug", branchController_1.getBranchBySlug);
exports.default = router;
