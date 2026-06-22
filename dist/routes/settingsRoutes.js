"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const settingsController_1 = require("../controllers/settingsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get("/", settingsController_1.getPublicSettings); // public
router.patch("/", authMiddleware_1.protect, authMiddleware_1.adminOnly, settingsController_1.updateSettings); // admin
exports.default = router;
