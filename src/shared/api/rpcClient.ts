/** Файл: src/shared/api/rpcClient.ts
 *  Назначение: единая точка вызова RPC-методов; прокси к существующему callRpc из '@/lib/api'.
 *  Использование: репозитории сущностей импортируют rpc() и вызывают методы бэкенда.
 *  Плюсы: один клиент на весь проект (интерсепторы, заголовки, базовый URL), нет дублирования axios-кода.
 */
import { callRpc } from '@/lib/api'

export async function rpc<T = unknown>(method: string, params?: unknown[]): Promise<T> {
  try {
    // callRpc уже знает, как правильно формировать запросы к вашему бэкенду
    const result = await callRpc<T>(method, params ?? [])
    return result as T
  } catch (e: any) {
    // Чуть более говорящая ошибка для отладки
    const msg = e?.message ? String(e.message) : String(e)
    throw new Error(`RPC ${method} failed: ${msg}`)
  }
}
