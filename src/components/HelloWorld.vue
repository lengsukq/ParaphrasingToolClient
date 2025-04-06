<template>
  <div class="z-10 flex h-56 w-full flex-col items-center justify-center">
    <GradientButton :bg-color="bgColor">好吧</GradientButton>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useColorMode } from "@vueuse/core";
import GradientButton from "@/components/GradientButton.vue";

const isDark = computed(() => useColorMode().value == "dark");
const bgColor = computed(() => (isDark.value ? "#000" : "#fff"));
</script>