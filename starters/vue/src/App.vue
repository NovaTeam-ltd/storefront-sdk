<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  useCategories,
  usePaymentMethods,
  useProducts,
  usePurchase,
  useShop,
  type NovaPaymentMethodId,
  type NovaProduct,
  type NovaPurchaseRequest,
} from '@novasynx/storefront-sdk/vue'

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

const selectedCategory = ref<string | undefined>()

const shopName = computed(() => shop.value?.name ?? 'Nova Shop')
const shopCurrency = computed(() => shop.value?.currency ?? 'RUB')
const categoryList = computed(() => categories.value)
const productList = computed(() => products.value)
const paymentMethod = computed<NovaPaymentMethodId | null>(() => methods.value[0]?.id ?? null)
const paymentUrl = computed(() => purchaseResult.value?.payUrl ?? null)
const isBuying = computed(() => purchaseLoading.value)

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price)
}

async function selectCategory(category?: string) {
  selectedCategory.value = category
  await reloadProducts(category)
}

async function buy(product: NovaProduct) {
  const method = paymentMethod.value
  if (!method) return

  const request: NovaPurchaseRequest = {
    productId: product.id,
    quantity: 1,
    paymentMethod: method,
  }

  const order = await purchase(request)
  if (order.payUrl) window.location.assign(order.payUrl)
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
        <h1 class="logo">{{ shopName }}</h1>
        <nav class="nav" aria-label="Категории">
          <button
            type="button"
            class="nav-link"
            :class="{ active: !selectedCategory }"
            @click="selectCategory(undefined)"
          >
            Все
          </button>
          <button
            v-for="cat in categoryList"
            :key="cat"
            type="button"
            class="nav-link"
            :class="{ active: selectedCategory === cat }"
            @click="selectCategory(cat)"
          >
            {{ cat }}
          </button>
        </nav>
      </header>

      <main class="main">
        <section class="hero">
          <h2>{{ shopName }}</h2>
          <p>Выберите товар из каталога</p>
        </section>

        <p v-if="productsError" class="inline-error">{{ productsError }}</p>
        <p v-if="purchaseError" class="inline-error">{{ purchaseError }}</p>
        <a v-if="paymentUrl" :href="paymentUrl" class="payment-link">
          Открыть оплату
        </a>

        <section class="catalog">
          <div v-if="productsLoading" class="loader compact">
            <div class="spinner"></div>
          </div>
          <div v-else-if="!productList.length" class="empty">
            Нет товаров в выбранной категории
          </div>
          <div v-else class="products-grid">
            <article v-for="product in productList" :key="product.id" class="product-card">
              <img
                v-if="product.image"
                :src="product.image"
                :alt="product.name"
                class="product-image"
              />
              <div v-else class="product-image-placeholder">
                Нет изображения
              </div>
              <div class="product-info">
                <h3 class="product-name">{{ product.name }}</h3>
                <span class="product-category">{{ product.category }}</span>
                <div class="product-footer">
                  <span class="product-price">
                    {{ formatPrice(product.price) }} {{ shopCurrency }}
                  </span>
                  <button
                    type="button"
                    class="btn-buy"
                    :disabled="isBuying || !paymentMethod"
                    @click="buy(product)"
                  >
                    {{ isBuying ? 'Создание...' : 'Купить' }}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>

      <footer class="footer">
        <p>&copy; {{ new Date().getFullYear() }} {{ shopName }}</p>
      </footer>
    </template>
  </div>
</template>
