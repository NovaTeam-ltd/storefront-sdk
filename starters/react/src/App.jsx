import { useShop, useProducts, useCategories } from '@novasynx/storefront-sdk/react'

function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU').format(price)
}

export function App() {
  const { shop, loading: shopLoading, error: shopError } = useShop()
  const { products, loading: productsLoading } = useProducts()
  const { categories } = useCategories()

  if (shopLoading) {
    return (
      <div className="loader">
        <div className="spinner" />
        <p>Загрузка магазина...</p>
      </div>
    )
  }

  if (shopError) {
    return <div className="error"><p>{shopError}</p></div>
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">{shop.name}</h1>
        <nav className="nav">
          {categories.map(cat => (
            <a key={cat} href="#" className="nav-link">{cat}</a>
          ))}
        </nav>
      </header>

      <main className="main">
        <section className="hero">
          <h2>Добро пожаловать в {shop.name}</h2>
          <p>Выберите товар из каталога</p>
        </section>

        <section className="catalog">
          {productsLoading ? (
            <div className="loader"><div className="spinner" /></div>
          ) : (
            <div className="products-grid">
              {products.map(product => (
                <div key={product.id} className="product-card">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="product-image" />
                  ) : (
                    <div className="product-image-placeholder"><span>🛒</span></div>
                  )}
                  <div className="product-info">
                    <h3 className="product-name">{product.name}</h3>
                    <span className="product-category">{product.category}</span>
                    <div className="product-footer">
                      <span className="product-price">
                        {formatPrice(product.price)} {shop.currency}
                      </span>
                      <button className="btn-buy">Купить</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} {shop.name}</p>
      </footer>
    </div>
  )
}
