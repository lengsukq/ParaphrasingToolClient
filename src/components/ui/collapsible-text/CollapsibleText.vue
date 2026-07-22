<template>
  <div class="collapsible-text">
    <div
      ref="textRef"
      class="text-sm leading-relaxed whitespace-pre-wrap break-words transition-all"
      :class="{ 'line-clamp-3': !expanded && isOverflow }"
    >
      {{ text }}
    </div>
    <button
      v-if="isOverflow"
      class="text-xs text-muted-foreground hover:text-foreground mt-1 transition-colors"
      @click="expanded = !expanded"
    >
      {{ expanded ? '收起' : '展开全文' }}
    </button>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';

defineProps<{
  text: string;
}>();

const expanded = ref(false);
const isOverflow = ref(false);
const textRef = ref<HTMLElement | null>(null);

onMounted(() => {
  if (textRef.value) {
    isOverflow.value = textRef.value.scrollHeight > textRef.value.clientHeight + 2;
  }
});
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
