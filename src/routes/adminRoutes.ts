import express from "express";
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImage,
  getMeta,
  getAdminBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getVendors,
  createVendor,
  updateVendor,
  deleteVendor,
  getPartners,
  createPartner,
  updatePartner,
  deletePartner,
  getCustomers,
  getAllOrders,
  adminUpdateOrder,
  deleteOrder,
} from "../controllers/adminController";
import { protect, adminOnly } from "../middleware/authMiddleware";

const router = express.Router();

// All admin routes require a valid token AND the admin role
router.use(protect, adminOnly);

router.get("/meta", getMeta);
router.post("/upload", uploadImage);

router.route("/products").get(getAllProducts).post(createProduct);
router.route("/products/:id").patch(updateProduct).delete(deleteProduct);

router.route("/branches").get(getAdminBranches).post(createBranch);
router.route("/branches/:id").patch(updateBranch).delete(deleteBranch);

router.route("/vendors").get(getVendors).post(createVendor);
router.route("/vendors/:id").patch(updateVendor).delete(deleteVendor);

router.route("/partners").get(getPartners).post(createPartner);
router.route("/partners/:id").patch(updatePartner).delete(deletePartner);

router.get("/customers", getCustomers);

// Order management — admin has full powers over any branch's orders.
router.get("/orders", getAllOrders);
router.route("/orders/:id").patch(adminUpdateOrder).delete(deleteOrder);

export default router;
