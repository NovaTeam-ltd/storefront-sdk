<script setup>
import { useShop, useProducts, useCategories } from '@novahub/storefront-sdk/vue'

const { shop, loading: shopLoading, error: shopError } = useShop()
const { products, loading: productsLoading } = useProducts()
const { categories } = useCategories()

function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU').format(price)
}
</script>

<template>
  <div class="app">
    <div v-if="shopLoading" class="loader">
      <div class="spinner"></div>
      <p>Загрузка магазина...</p>
    </div>

    <div v-else-if="shopError" class="error">
      <p>{{ shopError }}</p>
    </div>

    <template v-else>
      <header class="header">
        <h1 class="logo">{{ shop.name }}</h1>
        <nav class="nav">
          <a v-for="cat in categories" :key="cat" href="#" class="nav-link">
            {{ cat }}
          </a>
        </nav>
      </header>

      <main class="main">
        <section class="hero">
          <h2>Добро пожаловать в {{ shop.name }}</h2>
          <p>Выберите товар из каталога</p>
        </section>

        <section class="catalog">
          <div v-if="productsLoading" class="loader">
            <div class="spinner"></div>
          </div>
          <div v-else class="products-grid">
            <div v-for="product in products" :key="product.id" class="product-card">
              <img
                v-if="product.image"
                :src="product.image"
                :alt="product.name"
                class="product-image"
              />
              <div v-else class="product-image-placeholder">
                <span>🛒</span>
              </div>
              <div class="product-info">
                <h3 class="product-name">{{ product.name }}</h3>
                <span class="product-category">{{ product.category }}</span>
                <div class="product-footer">
                  <span class="product-price">
                    {{ formatPrice(product.price) }} {{ shop.currency }}
                  </span>
                  <button class="btn-buy">Купить</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer class="footer">
        <p>&copy; {{ new Date().getFullYear() }} {{ shop.name }}</p>
      </footer>
    </template>
  </div>
</template>
