<script setup lang="ts">
import type { EnrichmentResult } from '~/composables/useAiEnrichment'

const props = defineProps<{
  results: EnrichmentResult[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'viewReasoning', resultId: string): void
  (e: 'edit', resultId: string, data: Record<string, any>): void
  (e: 'approve', resultIds: string[]): void
  (e: 'reject', resultIds: string[]): void
}>()

const { t } = useI18n()

const selectedRows = ref<string[]>([])

const getConfidenceColor = (confidence: string) => {
  switch (confidence) {
    case 'high':
      return 'text-green-600'
    case 'medium':
      return 'text-orange-600'
    case 'low':
      return 'text-red-600'
    default:
      return 'text-gray-600'
  }
}

const getConfidenceIcon = (confidence: string) => {
  switch (confidence) {
    case 'high':
      return 'checkCircle'
    case 'medium':
      return 'alertTriangle'
    case 'low':
      return 'xCircle'
    default:
      return 'helpCircle'
  }
}

const handleEdit = (result: EnrichmentResult, field: string, value: any) => {
  const updatedData = {
    ...(result.edited_data || result.output_data),
    [field]: value,
  }
  emit('edit', result.id, updatedData)
}

const handleApprove = (resultIds?: string[]) => {
  emit('approve', resultIds || selectedRows.value)
}

const handleReject = (resultIds?: string[]) => {
  emit('reject', resultIds || selectedRows.value)
}
</script>

<template>
  <div class="nc-ai-enrichment-preview-table">
    <div v-if="loading" class="flex items-center justify-center p-8">
      <a-spin size="large" />
    </div>

    <div v-else-if="results.length === 0" class="flex items-center justify-center p-8 text-nc-content-gray-subtle">
      {{ $t('msg.noResultsFound') }}
    </div>

    <div v-else class="space-y-4">
      <!-- Actions Bar -->
      <div class="flex items-center justify-between p-2 bg-nc-bg-gray-extralight rounded">
        <div class="flex items-center gap-2">
          <span class="text-sm text-nc-content-gray-subtle">
            {{ $t('title.selected') }}: {{ selectedRows.length }}
          </span>
        </div>
        <div class="flex gap-2">
          <NcButton size="xs" type="primary" @click="handleApprove()">
            {{ $t('general.approve') }}
          </NcButton>
          <NcButton size="xs" type="secondary" @click="handleReject()">
            {{ $t('general.reject') }}
          </NcButton>
        </div>
      </div>

      <!-- Results Table -->
      <div class="border-1 border-nc-border-gray-medium rounded overflow-hidden">
        <table class="w-full">
          <thead class="bg-nc-bg-gray-extralight">
            <tr>
              <th class="p-2 text-left">
                <a-checkbox
                  :checked="selectedRows.length === results.length"
                  :indeterminate="selectedRows.length > 0 && selectedRows.length < results.length"
                  @change="(e) => selectedRows = e.target.checked ? results.map(r => r.id) : []"
                />
              </th>
              <th class="p-2 text-left text-sm font-medium">{{ $t('title.rowId') }}</th>
              <th class="p-2 text-left text-sm font-medium">{{ $t('title.outputData') }}</th>
              <th class="p-2 text-left text-sm font-medium">{{ $t('title.confidence') }}</th>
              <th class="p-2 text-left text-sm font-medium">{{ $t('title.status') }}</th>
              <th class="p-2 text-left text-sm font-medium">{{ $t('general.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="result in results"
              :key="result.id"
              class="border-t-1 border-nc-border-gray-medium hover:bg-nc-bg-gray-extralight"
            >
              <td class="p-2">
                <a-checkbox
                  :checked="selectedRows.includes(result.id)"
                  @change="(e) => {
                    if (e.target.checked) {
                      selectedRows.push(result.id)
                    } else {
                      selectedRows = selectedRows.filter(id => id !== result.id)
                    }
                  }"
                />
              </td>
              <td class="p-2 text-sm">{{ result.row_id }}</td>
              <td class="p-2">
                <div class="space-y-1 max-w-md">
                  <div
                    v-for="(value, key) in (result.edited_data || result.output_data)"
                    :key="key"
                    class="flex items-center gap-2"
                  >
                    <span class="text-xs text-nc-content-gray-subtle w-24 truncate">{{ key }}:</span>
                    <a-input
                      :value="value"
                      size="small"
                      class="flex-1"
                      @change="(e) => handleEdit(result, key, e.target.value)"
                    />
                  </div>
                </div>
              </td>
              <td class="p-2">
                <div class="flex items-center gap-1" :class="getConfidenceColor(result.confidence)">
                  <GeneralIcon :icon="getConfidenceIcon(result.confidence)" class="h-4 w-4" />
                  <span class="text-xs capitalize">{{ result.confidence }}</span>
                </div>
              </td>
              <td class="p-2">
                <span class="text-xs capitalize">{{ result.approval_status }}</span>
              </td>
              <td class="p-2">
                <div class="flex gap-1">
                  <NcButton
                    type="text"
                    size="xs"
                    @click="emit('viewReasoning', result.id)"
                  >
                    <GeneralIcon icon="info" />
                  </NcButton>
                  <NcButton
                    type="text"
                    size="xs"
                    @click="handleApprove([result.id])"
                  >
                    <GeneralIcon icon="check" />
                  </NcButton>
                  <NcButton
                    type="text"
                    size="xs"
                    @click="handleReject([result.id])"
                  >
                    <GeneralIcon icon="close" />
                  </NcButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.nc-ai-enrichment-preview-table {
  @apply w-full;
}
</style>
