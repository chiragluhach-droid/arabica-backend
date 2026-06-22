"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_1 = require("../controllers/adminController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// All admin routes require a valid token AND the admin role
router.use(authMiddleware_1.protect, authMiddleware_1.adminOnly);
router.get("/meta", adminController_1.getMeta);
router.post("/upload", adminController_1.uploadImage);
router.route("/products").get(adminController_1.getAllProducts).post(adminController_1.createProduct);
router.route("/products/:id").patch(adminController_1.updateProduct).delete(adminController_1.deleteProduct);
router.route("/branches").get(adminController_1.getAdminBranches).post(adminController_1.createBranch);
router.route("/branches/:id").patch(adminController_1.updateBranch).delete(adminController_1.deleteBranch);
router.route("/vendors").get(adminController_1.getVendors).post(adminController_1.createVendor);
router.route("/vendors/:id").patch(adminController_1.updateVendor).delete(adminController_1.deleteVendor);
router.route("/partners").get(adminController_1.getPartners).post(adminController_1.createPartner);
router.route("/partners/:id").patch(adminController_1.updatePartner).delete(adminController_1.deletePartner);
router.get("/customers", adminController_1.getCustomers);
// Order management — admin has full powers over any branch's orders.
router.get("/orders", adminController_1.getAllOrders);
router.route("/orders/:id").patch(adminController_1.adminUpdateOrder).delete(adminController_1.deleteOrder);
exports.default = router;
