import { useMemo, useState } from 'react'
import {
  useCategories,
  usePaymentMethods,
  useProducts,
  usePurchase,
  useShop,
  type NovaPaymentMethodId,
  type NovaProduct,
  type NovaPurchaseRequest,
} from '@novasynx/storefront-sdk/react'

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price)
}

export function App() {
  const { shop, loading: shopLoading, error: shopError } = useShop()
  const { categories } = useCategories()
  const { methods } = usePaymentMethods()
  const {
    products,
    loading: productsLoading,
    error: productsError,
    reload: reloadProducts,
  } = useProducts()
  const {
    purchase,
    loading: purchaseLoading,
    error: purchaseError,
    result: purchaseResult,
  } = usePurchase()
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>()

  const paymentMethod = useMemo<NovaPaymentMethodId | null>(
    () => methods[0]?.id ?? null,
    [methods],
  )

  async function selectCategory(category?: string) {
    setSelectedCategory(category)
    await reloadProducts(category)
  }

  async function buy(product: NovaProduct) {
    if (!paymentMethod) return

    const request: NovaPurchaseRequest = {
      productId: product.id,
      quantity: 1,
      paymentMethod,
    }

    const order = await purchase(request)
    if (order.payUrl) window.location.assign(order.payUrl)
  }

  if (shopLoading) {
    return (
      <div className="loader">
        <div className="spinner" />
        <p>Загрузка магазина...</p>
      </div>
    )
  }

  if (shopError) {
    return (
      <div className="error">
        <p>{shopError}</p>
      </div>
    )
  }

  const shopName = shop?.name ?? 'Nova Shop'
  const shopCurrency = shop?.currency ?? 'RUB'

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">{shopName}</h1>
        <nav className="nav" aria-label="Категории">
          <button
            type="button"
            className={`nav-link ${!selectedCategory ? 'active' : ''}`}
            onClick={() => selectCategory(undefined)}
          >
            Все
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`nav-link ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => selectCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </nav>
      </header>

      <main className="main">
        <section className="hero">
          <h2>{shopName}</h2>
          <p>Выберите товар из каталога</p>
        </section>

        {productsError ? <p className="inline-error">{productsError}</p> : null}
        {purchaseError ? <p className="inline-error">{purchaseError}</p> : null}
        {purchaseResult?.payUrl ? (
          <a href={purchaseResult.payUrl} className="payment-link">
            Открыть оплату
          </a>
        ) : null}

        <section className="catalog">
          {productsLoading ? (
            <div className="loader compact">
              <div className="spinner" />
            </div>
          ) : products.length === 0 ? (
            <div className="empty">Нет товаров в выбранной категории</div>
          ) : (
            <div className="products-grid">
              {products.map((product) => (
                <article key={product.id} className="product-card">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="product-image" />
                  ) : (
                    <div className="product-image-placeholder">Нет изображения</div>
                  )}
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <span className="product-category">{product.category}</span>
                    <div className="product-footer">
                      <span className="product-price">
                        {formatPrice(product.price)} {shopCurrency}
                      </span>
                      <button
                        type="button"
                        className="btn-buy"
                        disabled={purchaseLoading || !paymentMethod}
                        onClick={() => buy(product)}
                      >
                        {purchaseLoading ? 'Создание...' : 'Купить'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} {shopName}</p>
      </footer>
    </div>
  )
}
