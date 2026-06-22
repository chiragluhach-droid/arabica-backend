"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
const socket_io_1 = require("socket.io");
const http_1 = require("http");
const branchRoutes_1 = __importDefault(require("./routes/branchRoutes"));
const menuRoutes_1 = __importDefault(require("./routes/menuRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const couponRoutes_1 = __importDefault(require("./routes/couponRoutes"));
const loyaltyRoutes_1 = __importDefault(require("./routes/loyaltyRoutes"));
const walletRoutes_1 = __importDefault(require("./routes/walletRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const inventoryRoutes_1 = __importDefault(require("./routes/inventoryRoutes"));
const analyticsRoutes_1 = __importDefault(require("./routes/analyticsRoutes"));
const settingsRoutes_1 = __importDefault(require("./routes/settingsRoutes"));
dotenv_1.default.config();
(0, db_1.connectDB)();
const app = (0, express_1.default)();
const port = process.env.PORT || 5000;
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PATCH"],
    },
});
app.use((0, cors_1.default)());
// Raised limit so base64 image uploads (admin product images) fit in the JSON body
app.use(express_1.default.json({ limit: "15mb" }));
// Attach io to every request BEFORE routes so controllers can emit realtime events
app.use((req, _res, next) => {
    req.io = io;
    next();
});
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", message: "API is healthy" });
});
app.use("/api/branches", branchRoutes_1.default);
app.use("/api/menu", menuRoutes_1.default);
app.use("/api/auth", authRoutes_1.default);
app.use("/api/orders", orderRoutes_1.default);
app.use("/api/admin", adminRoutes_1.default);
app.use("/api/coupons", couponRoutes_1.default);
app.use("/api/loyalty", loyaltyRoutes_1.default);
app.use("/api/wallet", walletRoutes_1.default);
app.use("/api/notifications", notificationRoutes_1.default);
app.use("/api/inventory", inventoryRoutes_1.default);
app.use("/api/analytics", analyticsRoutes_1.default);
app.use("/api/settings", settingsRoutes_1.default);
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
