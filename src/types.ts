export interface NovaShop {
  projectId: string
  name: string
  template: string
  primaryColor: string
  currency: string
  seoTitle: string
  seoDescription: string
  status: string
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

export interface NovaSDKConfig {
  apiBase?: string
  devMode?: boolean
  devShop?: Partial<NovaShop>
  devProducts?: NovaProduct[]
}
