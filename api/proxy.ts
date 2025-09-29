// Edge Runtime
export const config = { runtime: 'edge' }

const BACKEND_BASE = process.env.BACKEND_BASE!

function rewriteSetCookie(setCookieHeaders: string[], hostForCookie: string) {
  // Меняем Domain=backend.kz -> Domain=nsi-frontend-vue.vercel.app
  // и добавляем SameSite=None; Secure для междоменной работы
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
  // Путь после /api/... проксируем на BACKEND_BASE
  const url = new URL(req.url)
  const backendUrl = new URL(BACKEND_BASE)
  // удаляем ведущий /api
  const path = url.pathname.replace(/^\/api\/?/, '')
  backendUrl.pathname = backendUrl.pathname.replace(/\/+$/, '') + '/' + path
  backendUrl.search = url.search

  // Пробрасываем метод/тело/заголовки
  const headers = new Headers(req.headers)
  // Не пересылаем хост и некоторые служебные заголовки
  headers.delete('host')
  headers.set('origin', backendUrl.origin)
  headers.set('referer', backendUrl.origin + '/')

  // ВЕРНУТЬ куки бэкенду (браузер прислал куки для vercel.app)
  // мы их пробросим как есть — бэкенду важны имена/значения
  const backendReq = new Request(backendUrl.toString(), {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    redirect: 'manual',
  })

  let resp: Response
  try {
    resp = await fetch(backendReq)
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e)
    return new Response(
      JSON.stringify({ message: 'Bad Gateway', detail }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    )
  }

  // Копируем тело/статус/хедеры
  const respHeaders = new Headers(resp.headers)

  // Перепакуем Set-Cookie → на домен vercel (чтобы кука сохранилась у браузера)
  const setCookies = resp.headers.getSetCookie?.() ?? []
  if (setCookies.length) {
    respHeaders.delete('set-cookie')
    const hostForCookie = url.host // nsi-frontend-vue.vercel.app
    const rewritten = rewriteSetCookie(setCookies, hostForCookie)
    for (const c of rewritten) respHeaders.append('set-cookie', c)
  }

  // Безопасные CORS-хедеры на всякий (но на одном домене они не критичны)
  respHeaders.set('access-control-allow-origin', url.origin)
  respHeaders.set('access-control-allow-credentials', 'true')

  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: respHeaders,
  })
}
