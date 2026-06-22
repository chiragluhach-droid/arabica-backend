"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const analyticsController_1 = require("../controllers/analyticsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
function staffOnly(req, res, next) {
    if (req.user?.role === "admin" || req.user?.role === "vendor")
        return next();
    return res.status(403).json({ message: "Staff access required" });
}
router.get("/overview", authMiddleware_1.protect, staffOnly, analyticsController_1.getOverview);
exports.default = router;
