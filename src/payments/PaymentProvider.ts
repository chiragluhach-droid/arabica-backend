// Payment provider abstraction.
//
// The order flow only ever talks to this interface — it never imports a concrete
// gateway. Today we ship Cash on Delivery / Cash on Pickup. When Razorpay (or any
// online gateway) is added later, implement PaymentProvider, register it in
// `getPaymentProvider`, and the order controller does NOT change.

export type PaymentMethod = "COD" | "Cash on Pickup" | "Wallet" | "Razorpay";

export interface PaymentIntent {
  orderId: string;
  amount: number; // in INR (rupees)
  currency: string; // "INR"
  method: PaymentMethod;
}

export interface PaymentResult {
  // For offline methods this is settled by staff later, so it starts "Pending".
  // For online gateways this would carry a provider order id / client secret.
  status: "Pending" | "Paid" | "Failed";
  providerRef?: string;
  // Extra data handed to the client to continue an online checkout (e.g. Razorpay order id).
  clientPayload?: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly method: PaymentMethod;
  /** Whether this provider settles instantly at checkout (online) or later (cash). */
  readonly isInstant: boolean;
  createIntent(intent: PaymentIntent): Promise<PaymentResult>;
  /** Verify a webhook / callback signature. Cash providers are always valid. */
  verifyCallback?(payload: unknown, signature?: string): Promise<boolean>;
}

// --- Cash providers (active) ---

class CashProvider implements PaymentProvider {
  readonly isInstant = false;
  constructor(public readonly method: PaymentMethod) {}

  async createIntent(_intent: PaymentIntent): Promise<PaymentResult> {
    // No external call. Money is collected on delivery/pickup; staff mark it paid.
    return { status: "Pending" };
  }
}

const providers: Partial<Record<PaymentMethod, PaymentProvider>> = {
  COD: new CashProvider("COD"),
  "Cash on Pickup": new CashProvider("Cash on Pickup"),
  // Razorpay: new RazorpayProvider(),  <-- drop-in later, no order-flow changes
};

export function getPaymentProvider(method: PaymentMethod): PaymentProvider {
  const provider = providers[method];
  if (!provider) {
    throw new Error(`Payment method "${method}" is not supported yet`);
  }
  return provider;
}

export function isPaymentMethodSupported(method: string): method is PaymentMethod {
  return method in providers;
}
