export type NovaPaymentMethodId = 'cryptobot' | 'heleket' | 'lolz' | (string & {})

export interface NovaVisitor {
  /** Stable per-browser id stored in HttpOnly cookie. */
  id: string
  /** Hashed UA + Accept-Language + IP — for analytics, not auth. */
  fingerprint: string
  /** Effective locale: cookie > Accept-Language > project default. */
  locale: string
  /** Effective currency: cookie override or project default. */
  currency: string
  /** UI theme preference. */
  theme: 'auto' | 'light' | 'dark'
  defaultLocale: string
  defaultCurrency: string
}

export interface NovaShop {
  projectId: string
  name: string
  template: string
  primaryColor: string
  currency: string
  seoTitle: string
  seoDescription: string
  status: string
  favicon?: string | null
  manifestName?: string | null
  locale?: string
  ogImage?: string | null
  enabledPaymentMethods?: NovaPaymentMethodId[]
  visitor?: NovaVisitor
}

export interface NovaProduct {
  id: string
  name: string
  price: number
  category: string
  image: string | null
  deliveryType: string
  stock: number
}

export interface NovaPaymentMethod {
  id: NovaPaymentMethodId
  name: string
  /** Inline data-URI SVG icon. Safe to use in <img src> or CSS background. */
  icon: string
  currencies: string[]
}

export interface NovaPurchaseRequest {
  productId: string
  quantity: number
  paymentMethod: NovaPaymentMethodId
  email?: string
  customerInfo?: Record<string, string>
}

export interface NovaPurchaseOptions {
  /** Idempotency key. Auto-generated if omitted. 16..128 chars [A-Za-z0-9_-]. */
  idempotencyKey?: string
  signal?: AbortSignal
}

export interface NovaPurchaseResult {
  orderId: string
  payUrl: string
  paymentMethod: NovaPaymentMethodId
  totalRub: number
  totalPay: number
  currency: string
}

export type NovaOrderStatusValue =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | (string & {})

export interface NovaOrderDelivery {
  type: string
  /** True when the order requires manual fulfillment by the seller. */
  manual: boolean
  /** Auto-delivery payload (codes/keys) once the order is COMPLETED. */
  content: string | null
  /** ISO timestamp of fulfillment, when applicable. */
  deliveredAt: string | null
}

export interface NovaOrderStatus {
  orderId: string
  status: NovaOrderStatusValue
  totalRub: number
  totalPay: number
  productId?: string
  productName?: string
  quantity?: number
  paymentMethod?: NovaPaymentMethodId
  createdAt: string
  delivery: NovaOrderDelivery | null
}

export interface NovaPreferences {
  locale?: string
  currency?: string
  theme?: 'auto' | 'light' | 'dark'
}

export interface NovaSDKConfig {
  apiBase?: string
  devMode?: boolean
  devShop?: Partial<NovaShop>
  devProducts?: NovaProduct[]
  devPaymentMethods?: NovaPaymentMethod[]
  /**
   * Whether `fetch` should send/receive credentials (cookies).
   * Defaults to `'include'` so the visitor cookie is persisted.
   */
  credentials?: RequestCredentials
}
