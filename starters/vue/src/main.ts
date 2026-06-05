import { createApp } from 'vue'
import type { Plugin } from 'vue'
import { createNova } from '@novasynx/storefront-sdk/vue'
import App from './App.vue'
import './style.css'

createApp(App)
  .use(createNova() as Plugin)
  .mount('#app')
