from pathlib import Path
import re

path = Path('src/pages/nsi/ObjectTypesPage.vue')
text = path.read_text(encoding='utf-8').replace('\r\n', '\n')

match = re.search(r'(<template>[\s\S]*?</template>)\s*(<script[\s\S]*?</script>)\s*(<style[\s\S]*?</style>)', text)
if not match:
    raise RuntimeError('SFC blocks not found')
old_template, script_block, style_block = match.groups()

script_open, script_content, script_close = re.match(r'(<script[^>]*>)([\s\S]*)(</script>)', script_block).groups()
style_open, style_content, style_close = re.match(r'(<style[^>]*>)([\s\S]*)(</style>)', style_block).groups()

template_new = """<template>
  <section class=\"object-types-page\">
    <header class=\"page-header\">
      <div class=\"page-title\">
        <h2 class=\"h2\">Справочник «Типы обслуживаемых объектов»</h2>
        <p class=\"text-small\">
          Здесь отображаются типы обслуживаемых объектов и связанные с ними компоненты. Пользуйтесь
          поиском и списком для навигации и обновляйте данные при необходимости.
        </p>
      </div>

      <div class=\"page-actions\">
        <NInput v-model:value=\"q\" placeholder=\"Поиск…\" clearable style=\"width: 260px\" />
        <NButton type=\"primary\" class=\"btn-primary\" @click=\"openCreate\">+ Создать</NButton>
      </div>
    </header>

    <p class=\"text-body\">
      Чтобы ускорить работу, фильтруйте записи, уточняйте геометрию и следите за уникальностью
      комбинаций. Это поможет избежать конфликтов и сделает каталог более полезным для коллег.
    </p>

    <div class=\"table-area\">
      <NSpin :show=\"tableLoading\">
        <table class=\"object-table\">
          <thead>
            <tr>
              <th class=\"col-name\">Типы объектов</th>
              <th class=\"col-geometry\">Геометрия</th>
              <th class=\"col-components\">Компоненты</th>
              <th class=\"col-actions\">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for=\"row in paginatedRows\" :key=\"row.id\">
              <td class=\"col-name\">
                <p class=\"cell-text\">{{ row.name }}</p>
              </td>
              <td class=\"col-geometry\">
                <NTag size=\"small\" type=\"success\">{{ geometryLabel(row.geometry) }}</NTag>
              </td>
              <td class=\"col-components\">
                <div class=\"components-cell-wrap\">
                  <div
                    class=\"components-cell\"
                    :id=\"`components-${row.id}`\"
                    :class=\"{ 'is-expanded': expandedRows.has(row.id) }\"
                    :ref=\"setCellRef(row.id)\"
                  >
                    <NTag
                      v-for=\"name in row.component\"
                      :key=\"name\"
                      class=\"component-tag\"
                      size=\"small\"
                      type=\"default\"
                    >
                      <span class=\"tag-text\">{{ name }}</span>
                    </NTag>
                  </div>

                  <button
                    v-if=\"hasMore[row.id]\"
                    type=\"button\"
                    class=\"components-toggle\"
                    :aria-label=\"
                      expandedRows.has(row.id)
                        ? 'Свернуть список компонентов'
                        : 'Показать все компоненты'
                    \"
                    :aria-pressed=\"expandedRows.has(row.id)\"
                    :aria-controls=\"`components-${row.id}`\"
                    @click=\"toggleRow(row.id)\"
                  >
                    <NIcon v-if=\"expandedRows.has(row.id)\" :component=\"ChevronUpOutline\" />
                    <NIcon v-else :component=\"EllipsisHorizontal\" />
                  </button>
                </div>
              </td>
              <td class=\"col-actions\">
                <div class=\"actions\">
                  <NTooltip placement=\"top\">
                    <template #trigger>
                      <NButton circle quaternary size=\"small\" @click=\"openEdit(row)\">
                        <template #icon>
                          <NIcon :component=\"CreateOutline\" />
                        </template>
                      </NButton>
                    </template>
                    Изменить
                  </NTooltip>
                  <NTooltip placement=\"top\">
                    <template #trigger>
                      <NButton
                        circle
                        quaternary
                        type=\"error\"
                        size=\"small\"
                        @click=\"removeRow(row.id)\"
                      >
                        <template #icon>
                          <NIcon :component=\"TrashOutline\" />
                        </template>
                      </NButton>
                    </template>
                    Удалить
                  </NTooltip>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </NSpin>

      <div class=\"pagination-bar\">
        <NPagination
          v-model:page=\"pagination.page\"
          v-model:page-size=\"pagination.pageSize\"
          :item-count=\"total\"
          :page-sizes=\"[10, 20, 50, 100]\"
          show-size-picker
          show-quick-jumper
        />
      </div>
    </div>

    <NModal
      v-model:show=\"dialog\"
      preset=\"dialog\"
      :title=\"editing ? 'Изменить тип' : 'Создать тип'\"
      :mask-closable=\"false\"
      :style=\"{ width: '560px' }\"
    >
      <NForm :model=\"form\" label-placement=\"left\" label-width=\"120\">
        <NFormItem
          label=\"Тип обслуживаемого объекта\"
          :feedback=\"errors.name\"
          :validation-status=\"errors.name ? 'error' : undefined\"
        >
          <NInput v-model:value=\"form.name\" />
          <div v-if=\"nameWarning\" class=\"warning-text\" style=\"margin-top: 4px\">{{ nameWarning }}</div>
        </NFormItem>

        <NFormItem label=\"Геометрия\">
          <NRadioGroup v-model:value=\"form.geometry\">
            <NRadioButton value=\"точка\">Точка</NRadioButton>
            <NRadioButton value=\"линия\">Линия</NRadioButton>
            <NRadioButton value=\"полигон\">Полигон</NRadioButton>
          </NRadioGroup>
        </NFormItem>

        <NFormItem label=\"Компоненты\">
          <NSelect
            v-model:value=\"form.component\"
            multiple
            filterable
            tag
            :options=\"componentSelectOptions\"
            placeholder=\"Добавьте или выберите существующие компоненты\"
            @blur=\"handleComponentBlur\"
          />
          <p class=\"text-small\" style=\"margin-top: 6px\">
            Новые значения сохраняются автоматически. Для добавления нажмите Enter.
          </p>
        </NFormItem>
      </NForm>

      <template #action>
        <NButton @click=\"dialog = false\">Отмена</NButton>
        <NButton type=\"primary\" :loading=\"saving\" @click=\"save\">Сохранить</NButton>
      </template>
    </NModal>
  </section>
</template>"""

style_new = """
.object-types-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.table-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.object-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}

.object-table thead {
  background: #f7fbfb;
}

.object-table th,
.object-table td {
  padding: 12px 16px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid #e6eaea;
}

.object-table th {
  font-weight: 600;
  color: #0f3e44;
}

.object-table tbody tr:last-of-type td {
  border-bottom: none;
}

.col-geometry {
  width: 120px;
  text-align: center;
}

.col-actions {
  width: 120px;
  text-align: center;
}

.cell-text {
  margin: 0;
  white-space: normal;
  word-break: break-word;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.components-cell-wrap {
  position: relative;
  padding-right: 28px;
}

.components-cell {
  display: block;
  line-height: 24px;
  max-height: 24px;
  overflow: hidden;
  mask-image: linear-gradient(to right, black 85%, transparent 100%);
  -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
}

.components-cell.is-expanded {
  max-height: none;
  mask-image: none;
  -webkit-mask-image: none;
}

.component-tag {
  margin: 2px 6px 2px 0;
}

.components-toggle {
  position: absolute;
  top: 0;
  right: 2px;
  height: 24px;
  width: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 9999px;
  background: #fff;
  cursor: pointer;
  color: #0f3e44;
}

.components-toggle:hover {
  background: #e6f2f2;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding: 4px 0 0;
}

:deep(.component-tag .n-tag__content) {
  white-space: normal;
  word-break: break-word;
}

.page-header {
  display: flex;
  alignments111111
