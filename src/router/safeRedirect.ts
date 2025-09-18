import type { Router } from 'vue-router'

export const DEFAULT_REDIRECT_PATH = '/'

const LOGIN_PATH = '/login'

function normalizeCandidate(redirect: unknown): string | undefined {
  if (Array.isArray(redirect)) {
    const [first] = redirect
    return typeof first === 'string' ? first : undefined
  }

  return typeof redirect === 'string' ? redirect : undefined
}

export function resolveSafeRedirect(
  router: Router,
  redirect: unknown,
  fallback: string = DEFAULT_REDIRECT_PATH,
): string {
  const fallbackValue = fallback.startsWith('/') ? fallback : DEFAULT_REDIRECT_PATH
  const candidate = normalizeCandidate(redirect)?.trim()

  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallbackValue
  }

  try {
    const resolved = router.resolve(candidate)
    if (resolved.matched.length === 0) {
      return fallbackValue
    }

    const fullPath = resolved.fullPath || fallbackValue
    const resolvedPath = resolved.path || fullPath

    if (resolvedPath === LOGIN_PATH) {
      return DEFAULT_REDIRECT_PATH
    }

    return fullPath
  } catch (error) {
    return fallbackValue
  }
}
