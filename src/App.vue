<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { useRouter } from 'vue-router'

const router = useRouter()

const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <div class="container mx-auto p-4">
    <Toaster />
    <div class="flex gap-4 mb-6">
      <Button variant="outline" :class="{ 'active': $route.path === '/' }" @click="navigateTo('/')">论文降重</Button>
      <Button variant="outline" :class="{ 'active': $route.path === '/ai-detection' }" @click="navigateTo('/ai-detection')">AIGC检测</Button>

    </div>
    <router-view />
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
.active {
  background-color: #2563eb; /* 更鲜艳的背景色 */
  color: white; /* 白色文字 */
  border-color: #2563eb; /* 保持边框颜色一致 */
}
</style>
