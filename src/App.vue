<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { useRouter } from 'vue-router'
import { provideConfig } from '@/composables/useConfig'
import ConfigDialog from '@/components/ConfigDialog.vue'

const router = useRouter()

// 全局提供配置
const { config, isConfigDialogOpen, openConfigDialog, closeConfigDialog, handleConfigChange } = provideConfig()

const navigateTo = (path: string) => {
  router.push(path)
}

const navItems = [
  { path: '/', label: '论文降重' },
  { path: '/ai-detection', label: 'AIGC检测' },
  { path: '/ai-smart-parse', label: 'AI智能解析' },
]
</script>

<template>
  <div class="min-h-screen bg-background">
    <Toaster />

    <!-- 顶部导航栏 -->
    <header class="border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div class="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <!-- 左侧品牌 -->
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-base font-bold tracking-tight">PaperRewrite</span>
        </div>

        <!-- 中间导航 -->
        <nav class="flex items-center gap-1">
          <Button
            v-for="item in navItems"
            :key="item.path"
            variant="ghost"
            size="sm"
            class="relative"
            :class="{ 'nav-active': $route.path === item.path }"
            @click="navigateTo(item.path)"
          >
            {{ item.label }}
          </Button>
        </nav>

        <!-- 右侧操作 -->
        <div class="shrink-0">
          <Button variant="outline" size="sm" @click="openConfigDialog">系统配置</Button>
        </div>
      </div>
    </header>

    <!-- 内容区 -->
    <main class="max-w-7xl mx-auto px-4 py-6">
      <router-view />
    </main>

    <!-- 全局配置对话框 -->
    <ConfigDialog
      :open="isConfigDialogOpen"
      @close="closeConfigDialog"
      @config-change="handleConfigChange"
      :config="config"
    />
  </div>
</template>

<style scoped>
.nav-active {
  background-color: var(--accent);
  font-weight: 600;
}
.nav-active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 2px;
  background-color: var(--primary);
  border-radius: 1px;
}
</style>
