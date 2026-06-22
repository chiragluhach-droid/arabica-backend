import { Request, Response } from "express";
import mongoose from "mongoose";
import { Order } from "../models/Order";

const startOfDay = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const startOfMonth = () => { const x = new Date(); x.setDate(1); x.setHours(0, 0, 0, 0); return x; };

/**
 * GET /api/analytics/overview?branch=&from=&to=
 * KPIs + chart series. Vendors are forced to their own branch; admins may filter
 * by branch (or see all). Revenue counts every non-cancelled order.
 */
export const getOverview = async (req: Request, res: Response) => {
  try {
    const requester = (req as any).user;
    const branchId = requester.role === "vendor" ? String(requester.branch) : (req.query.branch as string);

    const to = req.query.to ? new Date(req.query.to as string) : new Date();
    const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 29 * 86400000);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    const branchMatch: any = {};
    if (branchId && branchId !== "all") branchMatch.branch = new mongoose.Types.ObjectId(branchId);

    const notCancelled = { status: { $ne: "Cancelled" } };
    const rangeMatch = { ...branchMatch, ...notCancelled, createdAt: { $gte: from, $lte: to } };

    const sum = async (match: any) => {
      const r = await Order.aggregate([{ $match: match }, { $group: { _id: null, sales: { $sum: "$totalAmount" }, orders: { $sum: 1 } } }]);
      return { sales: r[0]?.sales || 0, orders: r[0]?.orders || 0 };
    };

    const [today, mtd, range, activeAgg, salesByDay, topProducts, orderTypeSplit, paymentSplit, byBranch] = await Promise.all([
      sum({ ...branchMatch, ...notCancelled, createdAt: { $gte: startOfDay() } }),
      sum({ ...branchMatch, ...notCancelled, createdAt: { $gte: startOfMonth() } }),
      sum(rangeMatch),
      Order.aggregate([{ $match: { ...rangeMatch, user: { $ne: null } } }, { $group: { _id: "$user" } }, { $count: "n" }]),
      Order.aggregate([
        { $match: rangeMatch },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, sales: { $sum: "$totalAmount" }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $match: rangeMatch },
        { $unwind: "$items" },
        { $group: { _id: "$items.name", qty: { $sum: "$items.quantity" }, revenue: { $sum: "$items.totalItemPrice" } } },
        { $sort: { qty: -1 } },
        { $limit: 6 },
      ]),
      Order.aggregate([{ $match: rangeMatch }, { $group: { _id: "$orderType", count: { $sum: 1 } } }]),
      Order.aggregate([{ $match: rangeMatch }, { $group: { _id: "$paymentMethod", sales: { $sum: "$totalAmount" }, count: { $sum: 1 } } }]),
      requester.role === "admin"
        ? Order.aggregate([
            { $match: { ...notCancelled, createdAt: { $gte: from, $lte: to } } },
            { $group: { _id: "$branch", sales: { $sum: "$totalAmount" }, orders: { $sum: 1 } } },
            { $lookup: { from: "branches", localField: "_id", foreignField: "_id", as: "b" } },
            { $project: { name: { $arrayElemAt: ["$b.name", 0] }, sales: 1, orders: 1 } },
            { $sort: { sales: -1 } },
          ])
        : Promise.resolve([]),
    ]);

    res.status(200).json({
      kpis: {
        salesToday: today.sales,
        ordersToday: today.orders,
        salesMTD: mtd.sales,
        rangeSales: range.sales,
        rangeOrders: range.orders,
        aov: range.orders ? Math.round(range.sales / range.orders) : 0,
        activeCustomers: activeAgg[0]?.n || 0,
      },
      salesByDay: salesByDay.map((d) => ({ date: d._id, sales: d.sales, orders: d.orders })),
      topProducts: topProducts.map((p) => ({ name: p._id, qty: p.qty, revenue: p.revenue })),
      orderTypeSplit: orderTypeSplit.map((o) => ({ name: o._id, value: o.count })),
      paymentSplit: paymentSplit.map((p) => ({ name: p._id, value: p.sales, count: p.count })),
      salesByBranch: byBranch.map((b: any) => ({ name: b.name || "—", sales: b.sales, orders: b.orders })),
    });
  } catch (error: any) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
