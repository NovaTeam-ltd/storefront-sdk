import { createApp } from 'vue'
import { createNova } from '@novahub/storefront-sdk/vue'
import App from './App.vue'
import './style.css'

const app = createApp(App)
app.use(createNova())
app.mount('#app')
