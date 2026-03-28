import type { NovaShop, NovaProduct, NovaSDKConfig } from './types'
import { MOCK_SHOP, MOCK_PRODUCTS } from './mock'

export class NovaClient {
  private apiBase: string
  private devMode: boolean
  private devShop: NovaShop
  private devProducts: NovaProduct[]

  constructor(config: NovaSDKConfig = {}) {
    this.apiBase = config.apiBase || '/api/storefront'
    this.devMode = config.devMode ?? this.detectDevMode()
    this.devShop = { ...MOCK_SHOP, ...config.devShop }
    this.devProducts = config.devProducts ?? MOCK_PRODUCTS

    if (this.devMode) {
      console.info('[NovaHub SDK] Dev mode active — using mock data')
    }
  }

  private detectDevMode(): boolean {
    if (typeof window === 'undefined') return false
    const host = window.location.hostname
    return host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.')
  }

  isDevMode(): boolean {
    return this.devMode
  }

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${this.apiBase}${path}`)
    if (!response.ok) {
      throw new Error(`NovaHub API error: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }

  async getShop(domain?: string): Promise<NovaShop> {
    if (this.devMode) return this.devShop

    const host = domain || window.location.hostname
    return this.request<NovaShop>(`/shop?domain=${encodeURIComponent(host)}`)
  }

  async getProducts(projectId: string, category?: string): Promise<NovaProduct[]> {
    if (this.devMode) {
      const all = this.devProducts
      return category ? all.filter((p) => p.category === category) : all
    }

    const params = category ? `?category=${encodeURIComponent(category)}` : ''
    return this.request<NovaProduct[]>(`/${projectId}/products${params}`)
  }

  async getCategories(projectId: string): Promise<string[]> {
    if (this.devMode) {
      return [...new Set(this.devProducts.map((p) => p.category))]
    }

    return this.request<string[]>(`/${projectId}/categories`)
  }

  async getProduct(projectId: string, productId: string): Promise<NovaProduct> {
    if (this.devMode) {
      const product = this.devProducts.find((p) => p.id === productId)
      if (!product) throw new Error('Product not found')
      return product
    }

    return this.request<NovaProduct>(`/${projectId}/products/${productId}`)
  }
}
