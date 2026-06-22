"use strict";
// Payment provider abstraction.
//
// The order flow only ever talks to this interface — it never imports a concrete
// gateway. Today we ship Cash on Delivery / Cash on Pickup. When Razorpay (or any
// online gateway) is added later, implement PaymentProvider, register it in
// `getPaymentProvider`, and the order controller does NOT change.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentProvider = getPaymentProvider;
exports.isPaymentMethodSupported = isPaymentMethodSupported;
// --- Cash providers (active) ---
class CashProvider {
    method;
    isInstant = false;
    constructor(method) {
        this.method = method;
    }
    async createIntent(_intent) {
        // No external call. Money is collected on delivery/pickup; staff mark it paid.
        return { status: "Pending" };
    }
}
const providers = {
    COD: new CashProvider("COD"),
    "Cash on Pickup": new CashProvider("Cash on Pickup"),
    // Razorpay: new RazorpayProvider(),  <-- drop-in later, no order-flow changes
};
function getPaymentProvider(method) {
    const provider = providers[method];
    if (!provider) {
        throw new Error(`Payment method "${method}" is not supported yet`);
    }
    return provider;
}
function isPaymentMethodSupported(method) {
    return method in providers;
}
