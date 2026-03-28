import type { NovaShop, NovaProduct } from './types'

export const MOCK_SHOP: NovaShop = {
  projectId: 'dev-project-000',
  name: 'My Dev Shop',
  template: 'custom',
  primaryColor: '#6366F1',
  currency: 'RUB',
  seoTitle: 'My Dev Shop — Development Mode',
  seoDescription: 'Шаблон в режиме разработки. Данные тестовые.',
  status: 'active',
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
