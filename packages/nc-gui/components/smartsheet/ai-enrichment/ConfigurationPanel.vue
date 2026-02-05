<script setup lang="ts">
import type { ColumnType } from 'nocodb-sdk'
import type { CreateJobParams } from '~/composables/useAiEnrichment'

const props = defineProps<{
  visible: boolean
  meta: any
  columns: ColumnType[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'create', params: CreateJobParams): void
}>()

const { t } = useI18n()

const prompt = ref('')
const selectedModel = ref('gpt-4o')
const temperature = ref(0.3)
const maxTokens = ref(4000)

const outputFields = ref<Record<string, { type: string; description: string }>>({})
const fieldMappings = ref<Array<{ outputFieldName: string; columnId: string }>>([])

const newFieldName = ref('')
const newFieldType = ref('string')
const newFieldDescription = ref('')

const addOutputField = () => {
  if (!newFieldName.value.trim()) return
  
  outputFields.value[newFieldName.value] = {
    type: newFieldType.value,
    description: newFieldDescription.value,
  }
  
  newFieldName.value = ''
  newFieldDescription.value = ''
}

const removeOutputField = (fieldName: string) => {
  delete outputFields.value[fieldName]
  fieldMappings.value = fieldMappings.value.filter((m) => m.outputFieldName !== fieldName)
}

const addFieldMapping = (fieldName: string, columnId: string) => {
  const existing = fieldMappings.value.find((m) => m.outputFieldName === fieldName)
  if (existing) {
    existing.columnId = columnId
  } else {
    fieldMappings.value.push({ outputFieldName: fieldName, columnId })
  }
}

const handleCreate = () => {
  if (!prompt.value.trim()) {
    message.warning(t('msg.pleaseFillRequiredFields'))
    return
  }

  emit('create', {
    tableId: props.meta.id,
    prompt: prompt.value,
    promptConfig: {
      model: selectedModel.value,
      outputFields: outputFields.value,
      fieldMappings: fieldMappings.value,
      temperature: temperature.value,
      maxTokens: maxTokens.value,
    },
  })
}

const availableColumns = computed(() => {
  return props.columns.filter((col) => !col.system && col.uidt !== 'ID')
})
</script>

<template>
  <div
    v-if="visible"
    class="nc-ai-enrichment-config-panel fixed right-0 top-0 h-full w-[400px] bg-nc-bg-default border-l-1 border-nc-border-gray-medium z-50 shadow-lg"
  >
    <div class="flex flex-col h-full">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b-1 border-nc-border-gray-medium">
        <h3 class="text-lg font-semibold">{{ $t('title.aiEnrichment') }}</h3>
        <NcButton type="text" size="xs" @click="emit('close')">
          <GeneralIcon icon="close" />
        </NcButton>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4 space-y-6">
        <!-- Prompt -->
        <div>
          <label class="block text-sm font-medium mb-2">
            {{ $t('title.prompt') }} <span class="text-red-500">*</span>
          </label>
          <a-textarea
            v-model:value="prompt"
            :rows="4"
            :placeholder="$t('placeholder.enterEnrichmentPrompt')"
            class="w-full"
          />
        </div>

        <!-- Model Selection -->
        <div>
          <label class="block text-sm font-medium mb-2">{{ $t('title.model') }}</label>
          <a-select v-model:value="selectedModel" class="w-full">
            <a-select-option value="gpt-4o">GPT-4o</a-select-option>
            <a-select-option value="gpt-4-turbo">GPT-4 Turbo</a-select-option>
            <a-select-option value="gpt-3.5-turbo">GPT-3.5 Turbo</a-select-option>
          </a-select>
        </div>

        <!-- Output Fields -->
        <div>
          <label class="block text-sm font-medium mb-2">{{ $t('title.outputFields') }}</label>
          <div class="space-y-2 mb-2">
            <div v-for="(field, fieldName) in outputFields" :key="fieldName" class="flex items-center gap-2 p-2 bg-nc-bg-gray-extralight rounded">
              <span class="flex-1 font-medium">{{ fieldName }}</span>
              <span class="text-xs text-nc-content-gray-subtle">{{ field.type }}</span>
              <NcButton type="text" size="xs" @click="removeOutputField(fieldName)">
                <GeneralIcon icon="delete" />
              </NcButton>
            </div>
          </div>
          <div class="flex gap-2">
            <a-input v-model:value="newFieldName" :placeholder="$t('placeholder.fieldName')" class="flex-1" />
            <a-select v-model:value="newFieldType" class="w-24">
              <a-select-option value="string">String</a-select-option>
              <a-select-option value="number">Number</a-select-option>
              <a-select-option value="boolean">Boolean</a-select-option>
            </a-select>
            <NcButton @click="addOutputField">
              <GeneralIcon icon="plus" />
            </NcButton>
          </div>
        </div>

        <!-- Field Mappings -->
        <div>
          <label class="block text-sm font-medium mb-2">{{ $t('title.columnMappings') }}</label>
          <div class="space-y-2">
            <div
              v-for="fieldName in Object.keys(outputFields)"
              :key="fieldName"
              class="flex items-center gap-2"
            >
              <span class="w-32 text-sm">{{ fieldName }}</span>
              <a-select
                :value="fieldMappings.find((m) => m.outputFieldName === fieldName)?.columnId"
                :placeholder="$t('placeholder.selectColumn')"
                class="flex-1"
                @change="(val) => addFieldMapping(fieldName, val)"
              >
                <a-select-option
                  v-for="col in availableColumns"
                  :key="col.id"
                  :value="col.id"
                >
                  {{ col.title }}
                </a-select-option>
              </a-select>
            </div>
          </div>
        </div>

        <!-- Advanced Settings -->
        <div class="border-t-1 border-nc-border-gray-medium pt-4">
          <label class="block text-sm font-medium mb-2">{{ $t('title.advancedSettings') }}</label>
          <div class="space-y-3">
            <div>
              <label class="block text-xs text-nc-content-gray-subtle mb-1">{{ $t('title.temperature') }}</label>
              <a-slider v-model:value="temperature" :min="0" :max="1" :step="0.1" />
            </div>
            <div>
              <label class="block text-xs text-nc-content-gray-subtle mb-1">{{ $t('title.maxTokens') }}</label>
              <a-input-number v-model:value="maxTokens" :min="100" :max="8000" class="w-full" />
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t-1 border-nc-border-gray-medium flex gap-2">
        <NcButton type="secondary" class="flex-1" @click="emit('close')">
          {{ $t('general.cancel') }}
        </NcButton>
        <NcButton type="primary" class="flex-1" @click="handleCreate">
          {{ $t('general.start') }}
        </NcButton>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.nc-ai-enrichment-config-panel {
  @apply shadow-xl;
}
</style>
