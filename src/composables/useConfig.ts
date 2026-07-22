import { reactive, ref, onMounted, type InjectionKey, inject, provide } from 'vue';

export interface AIConfig {
  api_key?: string;
  base_url?: string;
  model?: string;
  prompt?: string;
  localAi?: boolean;
}

const CONFIG_STORAGE_KEY = 'ai_config';

export const ConfigKey: InjectionKey<ReturnType<typeof createConfig>> = Symbol('AIConfig');

/**
 * 创建全局配置实例（在 App.vue 中调用一次）
 */
export function createConfig() {
  const config = reactive<AIConfig>({});
  const isConfigDialogOpen = ref(false);

  onMounted(() => {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      try {
        Object.assign(config, JSON.parse(saved));
      } catch { /* ignore */ }
    }
  });

  const openConfigDialog = () => { isConfigDialogOpen.value = true; };
  const closeConfigDialog = () => { isConfigDialogOpen.value = false; };

  const handleConfigChange = (newConfig: AIConfig) => {
    Object.assign(config, newConfig);
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
  };

  return {
    config,
    isConfigDialogOpen,
    openConfigDialog,
    closeConfigDialog,
    handleConfigChange,
  };
}

/**
 * 在子组件中注入全局配置
 */
export function useConfig() {
  const ctx = inject(ConfigKey);
  if (!ctx) {
    throw new Error('useConfig must be used within a component that provides ConfigKey');
  }
  return ctx;
}

/**
 * 提供配置（App.vue 中调用）
 */
export function provideConfig() {
  const ctx = createConfig();
  provide(ConfigKey, ctx);
  return ctx;
}
