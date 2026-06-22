import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import { Server } from "socket.io";
import { createServer } from "http";
import branchRoutes from "./routes/branchRoutes";
import menuRoutes from "./routes/menuRoutes";
import authRoutes from "./routes/authRoutes";
import orderRoutes from "./routes/orderRoutes";
import adminRoutes from "./routes/adminRoutes";
import couponRoutes from "./routes/couponRoutes";
import loyaltyRoutes from "./routes/loyaltyRoutes";
import walletRoutes from "./routes/walletRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import inventoryRoutes from "./routes/inventoryRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import settingsRoutes from "./routes/settingsRoutes";

dotenv.config();

connectDB();

const app = express();
const port = process.env.PORT || 5000;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH"],
  },
});

app.use(cors());
// Raised limit so base64 image uploads (admin product images) fit in the JSON body
app.use(express.json({ limit: "15mb" }));

// Attach io to every request BEFORE routes so controllers can emit realtime events
app.use((req: any, _res, next) => {
  req.io = io;
  next();
});

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "API is healthy" });
});

app.use("/api/branches", branchRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/loyalty", loyaltyRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/settings", settingsRoutes);

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinBranchRoom", (branchId) => {
    socket.join(`branch_${branchId}`);
    console.log(`Socket ${socket.id} joined branch room: branch_${branchId}`);
  });

  socket.on("joinUserRoom", (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined user room: user_${userId}`);
  });

  socket.on("joinPartnerRoom", (partnerId) => {
    socket.join(`partner_${partnerId}`);
    console.log(`Socket ${socket.id} joined partner room: partner_${partnerId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
