import { Buffer } from 'node:buffer'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const hopByHop = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
])

function readBody(req: VercelRequest): Promise<Buffer | undefined> {
  return new Promise((resolve, reject) => {
    const method = (req.method || '').toUpperCase()
    if (method === 'GET' || method === 'HEAD') {
      resolve(undefined)
      return
    }

    if (req.body !== undefined && req.body !== null) {
      if (Buffer.isBuffer(req.body)) {
        resolve(req.body)
        return
      }

      if (typeof req.body === 'string') {
        resolve(Buffer.from(req.body))
        return
      }

      try {
        resolve(Buffer.from(JSON.stringify(req.body)))
      } catch (error) {
        reject(error)
      }
      return
    }

    const chunks: Buffer[] = []
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    })
    req.on('end', () => {
      resolve(chunks.length ? Buffer.concat(chunks) : undefined)
    })
    req.on('error', (error) => {
      reject(error)
    })
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const base = process.env.API_BASE_URL
    if (!base) {
      res.status(500).send('Missing API_BASE_URL')
      return
    }

    const origin = `http://${req.headers.host || 'localhost'}`
    const incomingUrl = new URL(req.url || '', origin)
    const pathname = incomingUrl.pathname

    if (!(pathname.startsWith('/api') || pathname.startsWith('/auth'))) {
      res.status(404).send('Not found')
      return
    }

    const upstreamBase = base.endsWith('/') ? base : `${base}/`
    const relativePath = pathname.replace(/^\/+/, '')
    const targetUrl = new URL(relativePath + incomingUrl.search, upstreamBase)

    const headers: Record<string, string> = {}
    for (const [key, value] of Object.entries(req.headers)) {
      if (!value) continue
      if (hopByHop.has(key.toLowerCase())) continue
      headers[key] = Array.isArray(value) ? value.join(', ') : value
    }

    const body = await readBody(req)
    if (body && !headers['content-type']) {
      headers['content-type'] = 'application/json'
    }

    const response = await fetch(targetUrl.toString(), {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
    } as RequestInit)

    res.status(response.status)

    const setCookies = response.headers.getSetCookie?.() ?? []
    if (setCookies.length) {
      res.setHeader('set-cookie', setCookies)
    }

    response.headers.forEach((value, key) => {
      const lower = key.toLowerCase()
      if (hopByHop.has(lower) || lower === 'set-cookie') {
        return
      }
      res.setHeader(key, value)
    })

    const buffer = Buffer.from(await response.arrayBuffer())
    res.send(buffer)
  } catch (error) {
    res.status(502).send('Proxy error')
  }
}
