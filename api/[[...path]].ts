// Универсальный прокси: /api/** -> ${API_BASE_URL}/**
import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { IncomingHttpHeaders } from 'http'
import { URL } from 'url'

function dropHopByHop(headers: IncomingHttpHeaders) {
  const copy: Record<string, string> = {}
  const banned = new Set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade',
    'host',
    'content-length',
  ])
  for (const [key, value] of Object.entries(headers)) {
    if (!value || banned.has(key.toLowerCase())) {
      continue
    }
    copy[key] = Array.isArray(value) ? value.join(', ') : value
  }
  return copy
}

function rewriteSetCookie(setCookies: string[] | null, host: string): string[] {
  if (!setCookies || !setCookies.length) return []
  const domain = host?.split(':')[0]?.trim() ?? ''
  return setCookies.map((cookie) => {
    let next = cookie.replace(/;\s*Domain=[^;]+/i, '')
    if (domain) next += `; Domain=${domain}`
    if (!/;\s*SameSite=/i.test(next)) next += '; SameSite=None'
    if (!/;\s*Secure/i.test(next)) next += '; Secure'
    if (!/;\s*Path=/i.test(next)) next += '; Path=/'
    return next
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const base = process.env.API_BASE_URL
  if (!base) {
    res.status(500).json({ error: 'Missing API_BASE_URL env' })
    return
  }

  const url = new URL(req.url || '', `http://${req.headers.host}`)
  const subPath = url.pathname.replace(/^\/api\/?/, '')
  const target = new URL(subPath || '', base)
  target.search = url.search

  const method = (req.method || 'GET').toUpperCase()
  const hasBody = !['GET', 'HEAD'].includes(method)
  const body = hasBody
    ? typeof req.body === 'string'
      ? req.body
      : JSON.stringify(req.body ?? {})
    : undefined

  const headers = dropHopByHop(req.headers)
  if (hasBody && !headers['content-type']) headers['content-type'] = 'application/json'

  const response = await fetch(target.toString(), {
    method,
    headers,
    body,
  })

  res.status(response.status)
  const contentType = response.headers.get('content-type') || 'application/octet-stream'
  res.setHeader('content-type', contentType)

  const setCookies = response.headers.getSetCookie?.() ?? (response.headers as any).raw?.()['set-cookie'] ?? null
  const rewritten = rewriteSetCookie(setCookies, req.headers.host || '')
  if (rewritten.length) res.setHeader('set-cookie', rewritten)

  const text = await response.text()
  res.send(text)
}
