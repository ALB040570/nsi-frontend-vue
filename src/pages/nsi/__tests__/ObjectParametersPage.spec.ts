import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import type { LoadedObjectParameter } from '@entities/object-parameter'

type TestParameterRow = LoadedObjectParameter

const messageMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
}))

const createResetMock = vi.hoisted(() => vi.fn())
const updateResetMock = vi.hoisted(() => vi.fn())
const removeResetMock = vi.hoisted(() => vi.fn())

const snapshotRef = vi.hoisted(() => ({
  value: {
    items: [] as TestParameterRow[],
    unitOptions: [] as Array<{ id: string; name: string }>,
    groupOptions: [] as Array<{ id: string; name: string }>,
  },
}))

function createComponentStub(name: string) {
  return defineComponent({
    name,
    props: ['value', 'modelValue', 'show'],
    setup(_, { slots }) {
      return () =>
        h('div', { class: name }, [
          slots.trigger ? h('div', { class: `${name}__trigger` }, slots.trigger()) : null,
          slots.default ? slots.default() : null,
          slots.footer ? h('div', { class: `${name}__footer` }, slots.footer()) : null,
        ])
    },
  })
}

vi.mock('naive-ui', () => ({
  NButton: createComponentStub('NButton'),
  NCard: createComponentStub('NCard'),
  NDataTable: createComponentStub('NDataTable'),
  NIcon: createComponentStub('NIcon'),
  NInput: createComponentStub('NInput'),
  NModal: createComponentStub('NModal'),
  NPagination: createComponentStub('NPagination'),
  NPopconfirm: createComponentStub('NPopconfirm'),
  NTag: createComponentStub('NTag'),
  useMessage: () => messageMock,
}))

vi.mock('@features/object-parameter-crud', () => ({
  useObjectParametersQuery: () => ({
    data: snapshotRef,
    isLoading: { value: false },
    isFetching: { value: false },
    error: { value: null },
  }),
  useObjectParameterMutations: () => ({
    create: { reset: createResetMock },
    update: { reset: updateResetMock },
    remove: { reset: removeResetMock },
  }),
}))

import ObjectParametersPage from '../ObjectParametersPage.vue'

describe('ObjectParametersPage actions placeholders', () => {
  beforeAll(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  beforeEach(() => {
    snapshotRef.value = {
      items: [
        {
          id: '1',
          name: 'Температура теплоносителя',
          code: 'TMP-001',
          valueType: 'float',
          unitId: 'deg',
          groupId: 'heating',
          minValue: 45,
          maxValue: 95,
          isRequired: true,
          note: 'Контроль подачи',
          unitName: '°C',
          groupName: 'Отопление',
        },
      ],
      unitOptions: [],
      groupOptions: [],
    }

    messageMock.success.mockReset()
    messageMock.error.mockReset()
    messageMock.info.mockReset()
    messageMock.warning.mockReset()

    createResetMock.mockReset()
    updateResetMock.mockReset()
    removeResetMock.mockReset()
  })

  it('shows info message and resets create mutation when openCreate is called', () => {
    const wrapper = mount(ObjectParametersPage)
    const vm = wrapper.vm as unknown as {
      openCreate: () => void
    }

    vm.openCreate()

    expect(createResetMock).toHaveBeenCalledTimes(1)
    expect(messageMock.info).toHaveBeenCalledWith('Создание параметра будет доступно позднее')
    expect(updateResetMock).not.toHaveBeenCalled()
    expect(removeResetMock).not.toHaveBeenCalled()
  })

  it('shows info message with parameter name and resets update mutation when openEdit is called', () => {
    const wrapper = mount(ObjectParametersPage)
    const vm = wrapper.vm as unknown as {
      openEdit: (row: TestParameterRow) => void
    }

    vm.openEdit(snapshotRef.value.items[0])

    expect(updateResetMock).toHaveBeenCalledTimes(1)
    expect(messageMock.info).toHaveBeenCalledWith(
      'Редактирование параметра «Температура теплоносителя» пока недоступно',
    )
    expect(createResetMock).not.toHaveBeenCalled()
    expect(removeResetMock).not.toHaveBeenCalled()
  })

  it('shows warning message and resets remove mutation when deleteParameter is called', () => {
    const wrapper = mount(ObjectParametersPage)
    const vm = wrapper.vm as unknown as {
      deleteParameter: (row: TestParameterRow) => void
    }

    vm.deleteParameter(snapshotRef.value.items[0])

    expect(removeResetMock).toHaveBeenCalledTimes(1)
    expect(messageMock.warning).toHaveBeenCalledWith(
      'Удаление параметра «Температура теплоносителя» временно недоступно',
    )
    expect(createResetMock).not.toHaveBeenCalled()
    expect(updateResetMock).not.toHaveBeenCalled()
  })
})

describe('ObjectParametersPage mobile card fields', () => {
  let originalMatchMedia: typeof window.matchMedia

  beforeAll(() => {
    originalMatchMedia = window.matchMedia
  })

  afterAll(() => {
    window.matchMedia = originalMatchMedia
  })

  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    snapshotRef.value = {
      items: [
        {
          id: '1',
          name: 'Температура теплоносителя',
          code: 'TMP-001',
          valueType: 'float',
          unitId: 'deg',
          groupId: 'heating',
          minValue: 45,
          maxValue: 95,
          isRequired: true,
          note: 'Контроль подачи',
          unitName: '°C',
          groupName: 'Отопление',
        },
      ],
      unitOptions: [],
      groupOptions: [],
    }
  })

  it('renders expected list of card fields on mobile', () => {
    const wrapper = mount(ObjectParametersPage)

    const card = wrapper.find('.card')
    const fieldLabels = card.findAll('dt').map((node) => node.text())

    expect(fieldLabels).toEqual([
      'Единица измерения',
      'Компонент',
      'Диапазон',
      'Комментарии по диапазонам',
      'Источник',
      'Описание',
    ])
  })
})

describe('ObjectParametersPage sorting logic', () => {
  beforeEach(() => {
    snapshotRef.value = {
      items: [],
      unitOptions: [],
      groupOptions: [],
    }

    createResetMock.mockReset()
    updateResetMock.mockReset()
    removeResetMock.mockReset()
    messageMock.info.mockReset()
    messageMock.warning.mockReset()
  })

  it('sorts by name using localeCompare', () => {
    const wrapper = mount(ObjectParametersPage)
    const vm = wrapper.vm as unknown as {
      columns: Array<{ key?: string; sorter?: (a: TestParameterRow, b: TestParameterRow) => number }>
    }

    const nameColumn = vm.columns.find((column) => column.key === 'name')
    expect(nameColumn?.sorter).toBeTypeOf('function')

    const a: TestParameterRow = {
      id: '1',
      name: 'Агрегат',
      code: null,
      valueType: 'string',
      unitId: null,
      groupId: null,
      minValue: null,
      maxValue: null,
      isRequired: false,
      note: null,
      unitName: null,
      groupName: null,
    }

    const b: TestParameterRow = { ...a, id: '2', name: 'Блок' }

    expect(nameColumn?.sorter?.(a, b) ?? 0).toBeLessThan(0)
    expect(nameColumn?.sorter?.(b, a) ?? 0).toBeGreaterThan(0)
  })

  it('sorts by unitName treating empty values as empty strings', () => {
    const wrapper = mount(ObjectParametersPage)
    const vm = wrapper.vm as unknown as {
      columns: Array<{ key?: string; sorter?: (a: TestParameterRow, b: TestParameterRow) => number }>
    }

    const unitColumn = vm.columns.find((column) => column.key === 'unitName')
    expect(unitColumn?.sorter).toBeTypeOf('function')

    const withUnit: TestParameterRow = {
      id: '1',
      name: 'Параметр',
      code: null,
      valueType: 'string',
      unitId: null,
      groupId: null,
      minValue: null,
      maxValue: null,
      isRequired: false,
      note: null,
      unitName: 'Ампер',
      groupName: null,
    }

    const withAnotherUnit: TestParameterRow = { ...withUnit, id: '2', unitName: 'Вольт' }
    const withoutUnit: TestParameterRow = { ...withUnit, id: '3', unitName: null }

    expect(unitColumn?.sorter?.(withUnit, withAnotherUnit) ?? 0).toBeLessThan(0)
    expect(unitColumn?.sorter?.(withAnotherUnit, withUnit) ?? 0).toBeGreaterThan(0)
    expect(unitColumn?.sorter?.(withoutUnit, withUnit) ?? 0).toBeLessThan(0)
    expect(unitColumn?.sorter?.(withUnit, withoutUnit) ?? 0).toBeGreaterThan(0)
  })
})
