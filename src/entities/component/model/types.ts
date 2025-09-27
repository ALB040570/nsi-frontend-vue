/** Файл: src/entities/component/model/types.ts
 *  Назначение: доменные типы для компонентов инфраструктуры и их опций.
 *  Использование: импортировать в фичах (селект компонентов) и репозиториях.
 */
export interface Component {
  id: string
  name: string
}

export interface ComponentOption {
  id: string
  name: string
}
