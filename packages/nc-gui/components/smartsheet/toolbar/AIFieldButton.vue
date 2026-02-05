<script setup lang="ts">
const emit = defineEmits<{
  (e: 'click'): void
}>()

const handleClick = () => {
  emit('click')
}
</script>

<template>
  <NcButton type="secondary" size="small" class="!px-2" @click="handleClick">
    <GeneralIcon icon="ncAutoAwesome" class="!w-4 !h-4 mr-1 text-nc-content-purple-dark" />
    <span class="text-nc-content-purple-dark font-semibold">AI</span>
  </NcButton>
</template>
