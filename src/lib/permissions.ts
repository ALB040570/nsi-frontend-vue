export type Permission = string

export function parseTargets(target?: string | null): Set<Permission> {
  const s = (target ?? '').trim()
  if (!s) return new Set()
  return new Set(
    s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
  )
}

export const can = (perms: Set<Permission>, p: Permission) => perms.has(p)
export const canAny = (perms: Set<Permission>, list: Permission[]) => list.some((p) => perms.has(p))
