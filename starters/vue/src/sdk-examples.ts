import {
  quoteStarsFromRub,
  quoteSteamTopupFromRub,
  type NovaPaymentMethodId,
  type NovaProduct,
  type NovaPurchaseRequest,
  type NovaStarsOrderRequest,
  type NovaStarsPricing,
  type NovaSteamCurrency,
  type NovaSteamPricing,
  type NovaSteamTopupV2Request,
  type NovaTopupQuote,
} from '@novasynx/storefront-sdk/vue'

export type NovaStarsRubQuote = ReturnType<typeof quoteStarsFromRub>

export function buildProductPurchase(
  product: NovaProduct,
  paymentMethod: NovaPaymentMethodId,
): NovaPurchaseRequest {
  return {
    productId: product.id,
    quantity: 1,
    paymentMethod,
  }
}

export function buildStarsOrder(
  username: string,
  pricing: NovaStarsPricing | null,
  amountRub: number,
  paymentMethod: NovaPaymentMethodId,
): { quote: NovaStarsRubQuote; order: NovaStarsOrderRequest | null } {
  const quote = quoteStarsFromRub(pricing, amountRub)
  if (!quote.valid) return { quote, order: null }

  return {
    quote,
    order: {
      username,
      quantity: quote.quantity,
      paymentMethod,
    },
  }
}

export function buildSteamTopupOrder(
  login: string,
  pricing: NovaSteamPricing | null,
  amountRub: number,
  currency: NovaSteamCurrency,
  paymentMethod: NovaPaymentMethodId,
): { quote: NovaTopupQuote; order: NovaSteamTopupV2Request | null } {
  const quote = quoteSteamTopupFromRub(pricing, amountRub, currency)
  if (!quote.valid) return { quote, order: null }

  return {
    quote,
    order: {
      login,
      amount: quote.receiveAmount,
      currency: quote.receiveCurrency,
      paymentMethod,
    },
  }
}
