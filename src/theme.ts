import type { NovaShop } from './types'

export function applyTheme(shop: NovaShop) {
  const root = document.documentElement
  root.style.setProperty('--nova-primary', shop.primaryColor)

  const rgb = hexToRgb(shop.primaryColor)
  if (rgb) {
    root.style.setProperty('--nova-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`)
  }

  if (shop.seoTitle) document.title = shop.seoTitle
  else if (shop.name) document.title = shop.name

  const metaDesc = document.querySelector('meta[name="description"]')
  if (metaDesc && shop.seoDescription) {
    metaDesc.setAttribute('content', shop.seoDescription)
  }
}

function hexToRgb(hex: string) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!match) return null
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
  }
}
