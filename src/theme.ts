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

  // Favicon продавца. Если не задан — используем нейтральную SVG-иконку
  // (буква проекта на фоне primaryColor), чтобы не показывать NS-логотип.
  if (shop.favicon) {
    upsertFavicon(shop.favicon)
  } else if (shop.name) {
    upsertFavicon(buildLetterFavicon(shop.name, shop.primaryColor || '#6366F1'))
  }
  if (shop.ogImage) {
    upsertMeta({ property: 'og:image' }, shop.ogImage)
    upsertMeta({ name: 'twitter:image' }, shop.ogImage)
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

function upsertFavicon(href: string) {
  if (typeof document === 'undefined') return
  // Удаляем все существующие <link rel*="icon"> (включая SVG-дефолт шаблона
  // и любые apple-touch-icon с NS-логотипом), чтобы браузер не подхватил
  // тот, что грузится первым.
  const oldLinks = document.head.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]')
  oldLinks.forEach((el) => el.parentNode?.removeChild(el))

  const link = document.createElement('link')
  link.rel = 'icon'
  link.href = href
  const lower = href.toLowerCase()
  if (lower.startsWith('data:image/svg')) link.type = 'image/svg+xml'
  else if (lower.includes('.svg')) link.type = 'image/svg+xml'
  else if (lower.includes('.png')) link.type = 'image/png'
  else if (lower.includes('.jpg') || lower.includes('.jpeg')) link.type = 'image/jpeg'
  else if (lower.startsWith('data:image/png')) link.type = 'image/png'
  else link.type = 'image/x-icon'
  document.head.appendChild(link)
}

function buildLetterFavicon(name: string, color: string): string {
  const letter = (name.trim().charAt(0) || '?').toUpperCase()
  const safeColor = color.startsWith('#') ? color : '#6366F1'
  // SVG из инициала проекта на фоне primaryColor — чистый дефолт без брендинга платформы.
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="${safeColor}"/>` +
    `<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" ` +
    `font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#fff">${escapeXml(letter)}</text>` +
    `</svg>`
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function hexToRgb(hex: string) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!match) return null
  return {
    r: parseInt(match[1]!, 16),
    g: parseInt(match[2]!, 16),
    b: parseInt(match[3]!, 16),
  }
}
