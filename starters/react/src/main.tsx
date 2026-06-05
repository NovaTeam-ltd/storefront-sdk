import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { NovaProvider } from '@novasynx/storefront-sdk/react'
import { App } from './App'
import './style.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

createRoot(root).render(
  <StrictMode>
    <NovaProvider>
      <App />
    </NovaProvider>
  </StrictMode>,
)
