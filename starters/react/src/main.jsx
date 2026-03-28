import { createRoot } from 'react-dom/client'
import { NovaProvider } from '@novasynx/storefront-sdk/react'
import { App } from './App'
import './style.css'

createRoot(document.getElementById('root')).render(
  <NovaProvider>
    <App />
  </NovaProvider>
)
