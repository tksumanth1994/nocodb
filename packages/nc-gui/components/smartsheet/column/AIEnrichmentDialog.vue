<script setup lang="ts">
import type { ColumnType } from 'nocodb-sdk'
import { UITypes } from 'nocodb-sdk'

const props = defineProps<{
  visible: boolean
  columns: ColumnType[]
  editingColumn?: ColumnType
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (
    e: 'save',
    config: { prompt: string; outputColumns: Array<{ name: string; type: UITypes }>; runOption?: '1' | '10' | 'all' | 'none' },
  ): void
  (e: 'cancel'): void
}>()

const prompt = ref('')
const outputColumns = ref<Array<{ id: string; name: string; type: string }>>([{ id: '1', name: '', type: 'Text' }])

const visible = useVModel(props, 'visible', emit)

const columnTypeOptions = ['Text', 'Number', 'Date', 'URL', 'Checkbox']

// Map simple type names to UITypes
const typeToUIType: Record<string, UITypes> = {
  Text: UITypes.SingleLineText,
  Number: UITypes.Number,
  Date: UITypes.Date,
  URL: UITypes.URL,
  Checkbox: UITypes.Checkbox,
  Link: UITypes.URL,
  Boolean: UITypes.Checkbox,
}

// Reverse mapping from UITypes to simple type names (partial mapping)
const uiTypeToType: Partial<Record<UITypes, string>> = {
  [UITypes.SingleLineText]: 'Text',
  [UITypes.Number]: 'Number',
  [UITypes.Date]: 'Date',
  [UITypes.URL]: 'URL',
  [UITypes.Checkbox]: 'Checkbox',
}

// Helper function to convert UIType to simple type name
const getTypeFromUIType = (uidt: UITypes): string => {
  return uiTypeToType[uidt] || 'Text'
}

// Check if we're in edit mode
const isEditMode = computed(() => !!props.editingColumn)

// Watch for dialog opening to pre-populate data in edit mode
watch(visible, (newVal) => {
  if (newVal && isEditMode.value && props.editingColumn) {
    // Pre-populate prompt from existing column metadata
    const columnMeta = parseProp(props.editingColumn.meta || {})
    if (columnMeta.prompt?.prompt_text) {
      prompt.value = columnMeta.prompt.prompt_text
    } else {
      prompt.value = ''
    }

    // Pre-populate output columns with the existing column
    const columnType = getTypeFromUIType(props.editingColumn.uidt as UITypes)
    outputColumns.value = [
      {
        id: '1',
        name: props.editingColumn.title || '',
        type: columnType,
      },
    ]
  } else if (newVal && !isEditMode.value) {
    // Reset to default for create mode
    prompt.value = ''
    outputColumns.value = [{ id: '1', name: '', type: 'Text' }]
  }
})

const addColumn = () => {
  outputColumns.value.push({
    id: Date.now().toString(),
    name: '',
    type: 'Text',
  })
}

const removeColumn = (id: string) => {
  outputColumns.value = outputColumns.value.filter((col) => col.id !== id)
}

const saveDropdownVisible = ref(false)

const handleSave = (runOption?: '1' | '10' | 'all' | 'none') => {
  const validColumns = outputColumns.value.filter((col) => col.name.trim())
  if (validColumns.length === 0) {
    message.warning('Please add at least one column with a name')
    return
  }

  emit('save', {
    prompt: prompt.value,
    outputColumns: validColumns.map((col) => ({
      name: col.name,
      type: typeToUIType[col.type] || UITypes.SingleLineText,
    })),
    runOption,
  })

  visible.value = false
  saveDropdownVisible.value = false
}

const handleCancel = () => {
  visible.value = false
  emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <GeneralModal v-model:visible="visible" size="medium" :mask-closable="false" class="!z-[1100]" @keydown.esc="handleCancel">
      <div class="space-y-6 p-6">
        <!-- Title -->
        <div>
          <div class="font-semibold text-nc-content-gray">
            {{ isEditMode ? $t('title.editAIField') || 'Edit AI Field' : $t('title.whatIsYourPrompt') }}
          </div>
          <!-- Prompt Input -->
          <div class="mt-2">
            <a-textarea
              v-model:value="prompt"
              :rows="4"
              :placeholder="$t('placeholder.userCanSelectColumnsByUsingSlash')"
              class="w-full rounded-lg"
              size="large"
            />
          </div>
        </div>

        <!-- Add Column Section -->
        <div>
          <div class="text-base font-medium mb-3">
            {{ isEditMode ? $t('title.editColumn') || 'Edit Column' : $t('title.addColumn') }}
          </div>

          <div class="space-y-3">
            <div v-for="col in outputColumns" :key="col.id" class="flex items-center gap-2">
              <a-input v-model:value="col.name" :placeholder="$t('placeholder.columnName')" class="flex-1" />
              <a-select v-model:value="col.type" class="w-32">
                <a-select-option v-for="type in columnTypeOptions" :key="type" :value="type" height="40">
                  {{ type }}
                </a-select-option>
              </a-select>
              <NcButton type="text" size="xs" class="!w-8 !h-8" @click="removeColumn(col.id)">
                <GeneralIcon icon="close" class="w-4 h-4" />
              </NcButton>
            </div>
          </div>
<template v-if="!isEditMode">
          <NcButton  type="secondary" size="small" class="mt-3 w-40" @click="addColumn">
            <GeneralIcon icon="plus" class="w-4 h-4 mr-2" />
            {{ $t('title.addColumn') }}
          </NcButton>
        </template>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end gap-2 pt-4 border-t-1 border-nc-border-gray-medium">
          <NcButton type="secondary" @click="handleCancel">
            {{ $t('general.cancel') }}
          </NcButton>

          <NcDropdown v-model:visible="saveDropdownVisible" :trigger="['click']">
            <NcButton type="primary">
              <GeneralIcon icon="plus" class="w-4 h-4 mr-1" />
              {{ $t('general.save') }}
              <GeneralIcon icon="arrowDown" class="w-4 h-4 ml-1" />
            </NcButton>
            <template #overlay>
              <div class="bg-nc-bg-default rounded-lg shadow-lg py-1 min-w-[200px]">
                <div class="px-4 py-2 hover:bg-nc-bg-gray-extralight cursor-pointer" @click="handleSave('none')">
                  <GeneralIcon icon="plus" class="w-4 h-4 mr-2 inline" />
                  {{ $t('title.saveAndDontRun') }}
                </div>
                <div class="px-4 py-2 hover:bg-nc-bg-gray-extralight cursor-pointer" @click="handleSave('1')">
                  <GeneralIcon icon="plus" class="w-4 h-4 mr-2 inline" />
                  {{ $t('title.saveAndRunOn1Row') }}
                </div>
                <div class="px-4 py-2 hover:bg-nc-bg-gray-extralight cursor-pointer" @click="handleSave('10')">
                  <GeneralIcon icon="plus" class="w-4 h-4 mr-2 inline" />
                  {{ $t('title.saveAndRunOn10Rows') }}
                </div>
                <div class="px-4 py-2 hover:bg-nc-bg-gray-extralight cursor-pointer" @click="handleSave('all')">
                  <GeneralIcon icon="plus" class="w-4 h-4 mr-2 inline" />
                  {{ $t('title.saveAndRunOnAllRows') }}
                </div>
              </div>
            </template>
          </NcDropdown>
        </div>
      </div>
    </GeneralModal>
  </Teleport>
</template>

<style scoped>
:deep(.nc-modal-wrapper) {
  z-index: 1100 !important;
}
</style>
