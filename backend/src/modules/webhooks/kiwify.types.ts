export type KiwifyEventType = "order_approved" | "subscription_canceled" | "subscription_renewed";

export type KiwifyCustomer = {
  full_name: string;
  email: string;
  mobile?: string;
};

export type KiwifyProduct = {
  id: string;
  name: string;
};

export type KiwifySubscription = {
  id: string;
  status: string;
  charge_frequency?: string;
};

export type KiwifyWebhookPayload = {
  webhook_event_type: KiwifyEventType;
  order_id?: string;
  Customer: KiwifyCustomer;
  Product: KiwifyProduct;
  Subscription?: KiwifySubscription;
};
