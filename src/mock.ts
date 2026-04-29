import type { NovaShop, NovaProduct, NovaPaymentMethod } from './types'

export const MOCK_SHOP: NovaShop = {
  projectId: 'dev-project-000',
  name: 'My Dev Shop',
  template: 'custom',
  primaryColor: '#6366F1',
  currency: 'RUB',
  seoTitle: 'My Dev Shop — Development Mode',
  seoDescription: 'Шаблон в режиме разработки. Данные тестовые.',
  status: 'active',
  favicon: null,
  manifestName: null,
  locale: 'ru',
  ogImage: null,
  enabledPaymentMethods: ['cryptobot', 'heleket', 'lolz'],
  visitor: {
    id: '00000000-0000-4000-8000-000000000000',
    fingerprint: 'devfingerprint',
    locale: 'ru',
    currency: 'RUB',
    theme: 'auto',
    defaultLocale: 'ru',
    defaultCurrency: 'RUB',
  },
}

export const MOCK_PRODUCTS: NovaProduct[] = [
  { id: 'dev-1', name: 'Steam 500₽', price: 550, category: 'gift_card', image: null, deliveryType: 'auto', stock: 99 },
  { id: 'dev-2', name: 'Steam 1000₽', price: 1100, category: 'gift_card', image: null, deliveryType: 'auto', stock: 50 },
  { id: 'dev-3', name: 'Steam 2000₽', price: 2200, category: 'gift_card', image: null, deliveryType: 'auto', stock: 30 },
  { id: 'dev-4', name: 'Telegram Stars 100', price: 115, category: 'stars', image: null, deliveryType: 'auto', stock: 200 },
  { id: 'dev-5', name: 'Telegram Stars 500', price: 560, category: 'stars', image: null, deliveryType: 'auto', stock: 100 },
  { id: 'dev-6', name: 'Premium 1 мес', price: 299, category: 'premium', image: null, deliveryType: 'manual', stock: 15 },
  { id: 'dev-7', name: 'Premium 12 мес', price: 2399, category: 'premium', image: null, deliveryType: 'manual', stock: 10 },
  { id: 'dev-8', name: 'VPN 1 мес', price: 199, category: 'vpn', image: null, deliveryType: 'auto', stock: 999 },
]

export const MOCK_PAYMENT_METHODS: NovaPaymentMethod[] = [
  {
    id: 'cryptobot',
    name: 'CryptoBot',
    currencies: ['USDT', 'TON', 'BTC', 'ETH'],
    icon:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>',
      ),
  },
  {
    id: 'heleket',
    name: 'Heleket',
    currencies: ['USDT', 'TRX', 'BTC'],
    icon:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/></svg>',
      ),
  },
  {
    id: 'lolz',
    name: 'Lolz Market',
    currencies: ['RUB'],
    icon:
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h16v12H4z"/><path d="M4 10h16M9 14h2"/></svg>',
      ),
  },
]
