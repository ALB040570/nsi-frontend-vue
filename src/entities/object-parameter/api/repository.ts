/** Файл: src/entities/object-parameter/api/repository.ts
 *  Назначение: временные мок-репозитории для справочника параметров обслуживаемых объектов.
 *  Использование: импортируйте функции в фичах и страницах до подключения реального API.
 */
import type {
  LoadedObjectParameter,
  ObjectParameter,
  ObjectParametersSnapshot,
} from '../model/types'

type DirectoryOption = { id: string; name: string }

const UNIT_OPTIONS: DirectoryOption[] = [
  { id: 'temperature', name: '°C' },
  { id: 'length', name: 'мм' },
  { id: 'percent', name: '%' },
]

const GROUP_OPTIONS: DirectoryOption[] = [
  { id: 'environment', name: 'Параметры среды' },
  { id: 'geometry', name: 'Геометрические параметры' },
  { id: 'quality', name: 'Показатели качества' },
]

const MOCK_PARAMETERS: LoadedObjectParameter[] = [
  {
    id: '1',
    name: 'Температура эксплуатации',
    code: 'TEMP_WORK',
    valueType: 'number',
    unitId: 'temperature',
    unitName: '°C',
    groupId: 'environment',
    groupName: 'Параметры среды',
    minValue: -60,
    maxValue: 120,
    isRequired: true,
    note: 'Должна контролироваться при запуске оборудования',
  },
  {
    id: '2',
    name: 'Допустимое отклонение по высоте',
    code: 'HEIGHT_DELTA',
    valueType: 'number',
    unitId: 'length',
    unitName: 'мм',
    groupId: 'geometry',
    groupName: 'Геометрические параметры',
    minValue: -5,
    maxValue: 5,
    isRequired: false,
    note: null,
  },
  {
    id: '3',
    name: 'Уровень износа',
    code: 'WEAR_LEVEL',
    valueType: 'percent',
    unitId: 'percent',
    unitName: '%',
    groupId: 'quality',
    groupName: 'Показатели качества',
    minValue: 0,
    maxValue: 100,
    isRequired: false,
    note: 'Считается по итогам диагностики',
  },
]

function mapDirectories(
  parameter: ObjectParameter,
  options: {
    units: DirectoryOption[]
    groups: DirectoryOption[]
  },
): LoadedObjectParameter {
  const unitName = options.units.find((unit) => unit.id === parameter.unitId)?.name ?? null
  const groupName = options.groups.find((group) => group.id === parameter.groupId)?.name ?? null

  return {
    ...parameter,
    unitName,
    groupName,
  }
}

export async function fetchObjectParametersSnapshot(): Promise<ObjectParametersSnapshot> {
  return Promise.resolve({
    items: MOCK_PARAMETERS.map((item) => ({ ...item })),
    unitOptions: UNIT_OPTIONS.map((unit) => ({ ...unit })),
    groupOptions: GROUP_OPTIONS.map((group) => ({ ...group })),
  })
}

export async function createParameter(
  payload: Omit<ObjectParameter, 'id'> & { id?: string },
): Promise<LoadedObjectParameter> {
  const id = payload.id ?? String(Date.now())
  const parameter: ObjectParameter = { ...payload, id }
  return Promise.resolve(
    mapDirectories(parameter, { units: UNIT_OPTIONS, groups: GROUP_OPTIONS }),
  )
}

export async function updateParameter(payload: ObjectParameter): Promise<LoadedObjectParameter> {
  return Promise.resolve(mapDirectories(payload, { units: UNIT_OPTIONS, groups: GROUP_OPTIONS }))
}

export async function deleteParameter(id: string): Promise<void> {
  void id
  return Promise.resolve()
}
