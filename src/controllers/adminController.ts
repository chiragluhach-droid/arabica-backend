import { Request, Response } from "express";
import cloudinary from "../config/cloudinary";
import { Product } from "../models/Product";
import { Category } from "../models/Category";
import { Modifier } from "../models/Modifier";
import { Branch } from "../models/Branch";
import { User } from "../models/User";
import { Order } from "../models/Order";
import { hashPassword } from "../utils/password";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// GET /api/admin/products — all products (including out of stock) for management
export const getAllProducts = async (_req: Request, res: Response) => {
  try {
    const products = await Product.find()
      .populate("category")
      .populate("modifiers")
      .sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// POST /api/admin/products — create a product
export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, description, basePrice, image, category, modifiers, branchAvailability } = req.body;

    if (!name || basePrice == null || !image || !category) {
      return res.status(400).json({ message: "Name, base price, image and category are required" });
    }

    // Default: available at every branch unless caller specifies a subset
    let branches = branchAvailability;
    if (!branches || branches.length === 0) {
      branches = (await Branch.find().select("_id")).map((b) => b._id);
    }

    const product = await Product.create({
      name,
      description,
      basePrice,
      image,
      category,
      modifiers: modifiers || [],
      branchAvailability: branches,
    });

    const populated = await Product.findById(product._id)
      .populate("category")
      .populate("modifiers");

    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// PATCH /api/admin/products/:id — update a product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { name, description, basePrice, image, category, modifiers, branchAvailability, isOutOfStock } = req.body;

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (basePrice !== undefined) update.basePrice = basePrice;
    if (image !== undefined) update.image = image;
    if (category !== undefined) update.category = category;
    if (modifiers !== undefined) update.modifiers = modifiers;
    if (branchAvailability !== undefined) update.branchAvailability = branchAvailability;
    if (isOutOfStock !== undefined) update.isOutOfStock = isOutOfStock;

    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate("category")
      .populate("modifiers");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// DELETE /api/admin/products/:id
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.status(200).json({ message: "Product deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// POST /api/admin/upload — upload a base64 data-URL image to Cloudinary, return the URL
export const uploadImage = async (req: Request, res: Response) => {
  try {
    const { image } = req.body; // expects a base64 data URL: "data:image/png;base64,...."
    if (!image) {
      return res.status(400).json({ message: "No image provided" });
    }

    const result = await cloudinary.uploader.upload(image, {
      folder: "arabica-coffee/products",
      resource_type: "image",
    });

    res.status(200).json({ url: result.secure_url });
  } catch (error: any) {
    res.status(500).json({ message: "Image upload failed", error: error.message });
  }
};

// GET /api/admin/meta — categories, modifiers and branches for building forms
export const getMeta = async (_req: Request, res: Response) => {
  try {
    const [categories, modifiers, branches] = await Promise.all([
      Category.find().sort({ order: 1 }),
      Modifier.find(),
      Branch.find().select("name slug"),
    ]);
    res.status(200).json({ categories, modifiers, branches });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ----------------------- Branch management -----------------------

// GET /api/admin/branches — all branches (including inactive)
export const getAdminBranches = async (_req: Request, res: Response) => {
  try {
    const branches = await Branch.find().sort({ createdAt: 1 });
    res.status(200).json(branches);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// POST /api/admin/branches
export const createBranch = async (req: Request, res: Response) => {
  try {
    const { name, address, location, contactNumber, deliveryRadiusKM, deliveryCharges, openingHours, managerName, isActive } = req.body;

    if (!name || !address || !contactNumber) {
      return res.status(400).json({ message: "Name, address and contact number are required" });
    }

    const slug = req.body.slug ? slugify(req.body.slug) : slugify(name);
    if (await Branch.findOne({ slug })) {
      return res.status(409).json({ message: `A branch with slug "${slug}" already exists` });
    }

    const branch = await Branch.create({
      name,
      slug,
      address,
      location: location || { lat: 0, lng: 0 },
      contactNumber,
      deliveryRadiusKM: deliveryRadiusKM ?? 10,
      deliveryCharges: deliveryCharges || [
        { maxDistanceKM: 3, charge: 0 },
        { maxDistanceKM: 6, charge: 30 },
        { maxDistanceKM: 10, charge: 60 },
      ],
      openingHours: openingHours || { open: "08:00", close: "23:00" },
      managerName,
      isActive: isActive ?? true,
      vendorPassword: req.body.vendorPassword ? hashPassword(req.body.vendorPassword) : undefined,
    });

    res.status(201).json(branch);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// PATCH /api/admin/branches/:id
export const updateBranch = async (req: Request, res: Response) => {
  try {
    const fields = ["name", "address", "location", "contactNumber", "deliveryRadiusKM", "deliveryCharges", "openingHours", "managerName", "isActive"];
    const update: Record<string, unknown> = {};
    for (const f of fields) if (req.body[f] !== undefined) update[f] = req.body[f];
    if (req.body.slug !== undefined) update.slug = slugify(req.body.slug);
    // Only overwrite the vendor password when a new non-empty one is provided.
    if (req.body.vendorPassword) update.vendorPassword = hashPassword(req.body.vendorPassword);

    const branch = await Branch.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    res.status(200).json(branch);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// DELETE /api/admin/branches/:id
export const deleteBranch = async (req: Request, res: Response) => {
  try {
    const branch = await Branch.findByIdAndDelete(req.params.id);
    if (!branch) return res.status(404).json({ message: "Branch not found" });
    // Unassign any vendors tied to this branch
    await User.updateMany({ branch: branch._id }, { $unset: { branch: "" }, isActive: false });
    res.status(200).json({ message: "Branch deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ----------------------- Vendor management -----------------------

// GET /api/admin/vendors
export const getVendors = async (_req: Request, res: Response) => {
  try {
    const vendors = await User.find({ role: "vendor" })
      .select("-password")
      .populate("branch", "name slug")
      .sort({ createdAt: -1 });
    res.status(200).json(vendors);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// POST /api/admin/vendors
export const createVendor = async (req: Request, res: Response) => {
  try {
    const { name, username, password, branch } = req.body;
    if (!name || !username || !password || !branch) {
      return res.status(400).json({ message: "Name, username, password and branch are required" });
    }

    const uname = String(username).toLowerCase().trim();
    if (await User.findOne({ username: uname })) {
      return res.status(409).json({ message: `Username "${uname}" is already taken` });
    }
    if (!(await Branch.findById(branch))) {
      return res.status(400).json({ message: "Selected branch does not exist" });
    }

    const vendor = await User.create({
      name,
      username: uname,
      password: hashPassword(password),
      branch,
      role: "vendor",
      isActive: true,
    });

    const populated = await User.findById(vendor._id).select("-password").populate("branch", "name slug");
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// PATCH /api/admin/vendors/:id
export const updateVendor = async (req: Request, res: Response) => {
  try {
    const { name, branch, isActive, password } = req.body;
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (branch !== undefined) update.branch = branch;
    if (isActive !== undefined) update.isActive = isActive;
    if (password) update.password = hashPassword(password); // only when a new password is provided

    const vendor = await User.findOneAndUpdate({ _id: req.params.id, role: "vendor" }, update, { new: true })
      .select("-password")
      .populate("branch", "name slug");

    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.status(200).json(vendor);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// DELETE /api/admin/vendors/:id
export const deleteVendor = async (req: Request, res: Response) => {
  try {
    const vendor = await User.findOneAndDelete({ _id: req.params.id, role: "vendor" });
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    res.status(200).json({ message: "Vendor deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ----------------------- Delivery partner management -----------------------

// GET /api/admin/partners
export const getPartners = async (_req: Request, res: Response) => {
  try {
    const partners = await User.find({ role: "delivery" })
      .select("-password")
      .populate("branch", "name slug")
      .sort({ createdAt: -1 });
    res.status(200).json(partners);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// POST /api/admin/partners
export const createPartner = async (req: Request, res: Response) => {
  try {
    const { name, username, password, phone, branch } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ message: "Name, username and password are required" });
    }

    const uname = String(username).toLowerCase().trim();
    if (await User.findOne({ username: uname })) {
      return res.status(409).json({ message: `Username "${uname}" is already taken` });
    }
    if (branch && !(await Branch.findById(branch))) {
      return res.status(400).json({ message: "Selected branch does not exist" });
    }

    const partner = await User.create({
      name,
      username: uname,
      password: hashPassword(password),
      phone,
      branch: branch || undefined,
      role: "delivery",
      isActive: true,
    });

    const populated = await User.findById(partner._id).select("-password").populate("branch", "name slug");
    res.status(201).json(populated);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// PATCH /api/admin/partners/:id
export const updatePartner = async (req: Request, res: Response) => {
  try {
    const { name, branch, isActive, password, phone } = req.body;
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (branch !== undefined) update.branch = branch || undefined;
    if (isActive !== undefined) update.isActive = isActive;
    if (password) update.password = hashPassword(password);

    const partner = await User.findOneAndUpdate({ _id: req.params.id, role: "delivery" }, update, { new: true })
      .select("-password")
      .populate("branch", "name slug");

    if (!partner) return res.status(404).json({ message: "Partner not found" });
    res.status(200).json(partner);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// DELETE /api/admin/partners/:id
export const deletePartner = async (req: Request, res: Response) => {
  try {
    const partner = await User.findOneAndDelete({ _id: req.params.id, role: "delivery" });
    if (!partner) return res.status(404).json({ message: "Partner not found" });
    res.status(200).json({ message: "Partner deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ----------------------- Customer management -----------------------

// GET /api/admin/customers
export const getCustomers = async (_req: Request, res: Response) => {
  try {
    const customers = await User.find({ role: "customer" }).select("-password").lean();
    
    // Calculate amount spent by aggregating orders
    const ordersAggregation = await Order.aggregate([
      { $match: { user: { $in: customers.map((c) => c._id) }, status: { $ne: "cancelled" } } },
      { $group: { _id: "$user", totalSpent: { $sum: "$totalAmount" }, orderCount: { $sum: 1 } } }
    ]);
    
    const aggregatedData = new Map(ordersAggregation.map((a) => [a._id.toString(), a]));
    
    const result = customers.map((c) => {
      const data = aggregatedData.get(c._id.toString()) || { totalSpent: 0, orderCount: 0 };
      return {
        ...c,
        totalSpent: data.totalSpent,
        orderCount: data.orderCount,
      };
    });
    
    // Sort by total spent descending
    result.sort((a, b) => b.totalSpent - a.totalSpent);
    
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ----------------------- Order management (admin: full powers) -----------------------

// GET /api/admin/orders?branch=&status=&source=&search=&limit=
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const { branch, status, source, search, limit } = req.query as Record<string, string>;
    const filter: any = {};
    if (branch && branch !== "all") filter.branch = branch;
    if (status && status !== "all") filter.status = status;
    if (source && source !== "all") filter.source = source;
    if (search) {
      const n = Number(search);
      if (!isNaN(n)) filter.billNo = n;
    }
    const orders = await Order.find(filter)
      .populate("branch", "name slug")
      .populate("user", "name phone")
      .populate("deliveryPartner", "name phone")
      .sort({ createdAt: -1 })
      .limit(Number(limit) || 150);
    res.status(200).json(orders);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// PATCH /api/admin/orders/:id — edit non-status fields (status uses /orders/:id/status)
export const adminUpdateOrder = async (req: Request, res: Response) => {
  try {
    const fields = ["paymentStatus", "paymentMethod", "tableNumber", "notes", "orderType"];
    const update: Record<string, unknown> = {};
    for (const f of fields) if (req.body[f] !== undefined) update[f] = req.body[f];
    const order = await Order.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate("branch", "name slug")
      .populate("user", "name phone");
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.status(200).json(order);
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// DELETE /api/admin/orders/:id
export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.status(200).json({ message: "Order deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
