import type { NovaShop } from './types'

export function applyTheme(shop: NovaShop) {
  const root = document.documentElement
  root.style.setProperty('--nova-primary', shop.primaryColor)

  const rgb = hexToRgb(shop.primaryColor)
  if (rgb) {
    root.style.setProperty('--nova-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`)
  }

  const title = shop.seoTitle || shop.name
  if (title) document.title = title

  if (shop.seoDescription) {
    upsertMeta({ name: 'description' }, shop.seoDescription)
  }

  if (title) {
    upsertMeta({ property: 'og:title' }, title)
    upsertMeta({ name: 'twitter:title' }, title)
  }
  if (shop.seoDescription) {
    upsertMeta({ property: 'og:description' }, shop.seoDescription)
    upsertMeta({ name: 'twitter:description' }, shop.seoDescription)
  }
  if (shop.name) upsertMeta({ property: 'og:site_name' }, shop.name)
  upsertMeta({ property: 'og:type' }, 'website')
  upsertMeta({ name: 'twitter:card' }, 'summary')
  if (typeof window !== 'undefined' && window.location?.href) {
    upsertMeta({ property: 'og:url' }, window.location.href)
  }
}

function upsertMeta(attrs: Record<string, string>, content: string) {
  if (typeof document === 'undefined') return
  const selector = Object.entries(attrs).map(([k, v]) => `[${k}="${v}"]`).join('')
  let el = document.head.querySelector<HTMLMetaElement>(`meta${selector}`)
  if (!el) {
    el = document.createElement('meta')
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
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
