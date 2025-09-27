/** Файл: src/shared/lib/rpc.ts
 *  Назначение: удобные функции для работы с ответами RPC (достать записи, извлечь первую).
 *  Использование: использовать в репозиториях сущностей при маппинге данных.
 */
export function extractRecords<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[]
  if (payload && typeof payload === 'object') {
    const env = payload as any
    const records = env?.result?.records ?? env?.result?.data ?? env?.records ?? env?.data
    if (Array.isArray(records)) return records as T[]
  }
  return []
}

export function firstRecord<T>(payload: unknown): T | null {
  const records = extractRecords<T>(payload)
  if (records.length > 0) return records[0]
  const candidate = (payload as any)?.result?.records?.[0] ?? null
  return (candidate ?? null) as T | null
}

export function getErrorMessage(error: unknown): string {
  if (!error) return ''
  if (error instanceof Error) return error.message
  return String(error)
}
