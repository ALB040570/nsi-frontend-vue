// api/[...path].ts
// ЕДИНСТВЕННАЯ функция, проксирует /api/* и /auth/* на BACKEND_BASE
export const config = { runtime: 'edge' }

const BACKEND_BASE = process.env.BACKEND_BASE
if (!BACKEND_BASE) {
  // Явная ошибка, чтобы в логах было понятно
  console.error('Missing env BACKEND_BASE')
}

function rewriteSetCookie(setCookieHeaders: string[], hostForCookie: string) {
  return setCookieHeaders.map((h) => {
    let nh = h
      .replace(/Domain=[^;]+/i, `Domain=${hostForCookie}`)
      .replace(/;\s*SameSite=Lax/i, '')
      .replace(/;\s*SameSite=Strict/i, '')
    if (!/;\s*SameSite=/i.test(nh)) nh += '; SameSite=None'
    if (!/;\s*Secure/i.test(nh)) nh += '; Secure'
    return nh
  })
}

export default async function handler(req: Request) {
  try {
    if (!BACKEND_BASE) {
      return new Response(JSON.stringify({ error: 'BACKEND_BASE is not set' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }

    const url = new URL(req.url) // ...vercel.app/api/<ТО, ЧТО ПОСЛЕ /api/>
    const incomingPath = url.pathname
      .replace(/^\/api\/?/, '') // срежем ведущий /api
      .replace(/^\/auth\/?/, 'auth/') // а если пришло /auth/... (переписанное) — оставим "auth/..."

    // Соберём целевой URL: <BACKEND_BASE>/<incomingPath>
    const base = new URL(BACKEND_BASE)
    const target = new URL(base.toString())
    target.pathname = `${base.pathname.replace(/\/+$/, '')}/${incomingPath}`
    target.search = url.search

    // Сформируем проксируемый запрос
    const headers = new Headers(req.headers)
    headers.delete('host')
    headers.set('origin', target.origin)
    headers.set('referer', target.origin + '/')

    const backendReq = new Request(target.toString(), {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      redirect: 'manual',
    })

    const resp = await fetch(backendReq)

    const respHeaders = new Headers(resp.headers)
    // Перепакуем Set-Cookie под фронтовый домен
    const setCookies = (resp.headers as any).getSetCookie?.() ?? []
    if (setCookies.length) {
      respHeaders.delete('set-cookie')
      const hostForCookie = url.host
      const rewritten = rewriteSetCookie(setCookies, hostForCookie)
      for (const c of rewritten) respHeaders.append('set-cookie', c)
    }
    respHeaders.set('access-control-allow-origin', url.origin)
    respHeaders.set('access-control-allow-credentials', 'true')

    return new Response(resp.body, {
      status: resp.status,
      statusText: resp.statusText,
      headers: respHeaders,
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'Bad Gateway', detail: String(e?.message || e) }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    })
  }
}
