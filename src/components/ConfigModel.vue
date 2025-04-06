<template>
  <el-dialog
    v-model="modelVisible"
    title="系统配置"
    width="500px"
    class="rounded-lg"
  >
    <div class="space-y-6">
      <!-- OpenAI配置区域 -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-gray-900">OpenAI配置</h3>
        <div class="space-y-3">
          <div>
            <label for="apiKey" class="block text-sm font-medium text-gray-700">API Key</label>
            <el-input
              id="apiKey"
              v-model="config.apiKey"
              type="password"
              placeholder="输入OpenAI API Key"
              class="mt-1"
            />
          </div>
          <div>
            <label for="baseUrl" class="block text-sm font-medium text-gray-700">Base URL</label>
            <el-input
              id="baseUrl"
              v-model="config.baseUrl"
              placeholder="输入OpenAI Base URL"
              class="mt-1"
            />
          </div>
          <div>
            <label for="model" class="block text-sm font-medium text-gray-700">Model</label>
            <el-input
              id="model"
              v-model="config.model"
              placeholder="输入模型名称"
              class="mt-1"
            />
          </div>
        </div>
      </div>

      <!-- 提示词配置区域 -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-gray-900">提示词配置</h3>
        <div>
          <el-input
            v-model="config.prompt"
            type="textarea"
            placeholder="输入自定义提示词来指导AI降重"
            :rows="3"
            class="mt-1"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end space-x-3">
        <el-button @click="modelVisible = false">取消</el-button>
        <el-button type="primary" @click="saveConfig" class="bg-blue-600 hover:bg-blue-700">
          保存配置
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ref, defineExpose } from 'vue';
import { ElMessage } from 'element-plus';

interface Config {
  apiKey: string;
  baseUrl: string;
  model: string;
  prompt: string;
}

const modelVisible = ref(false);
const config = ref<Config>({
  apiKey: localStorage.getItem('openai_api_key') || '',
  baseUrl: localStorage.getItem('openai_base_url') || '',
  model: localStorage.getItem('openai_model') || '',
  prompt: localStorage.getItem('ai_prompt') || ''
});

const validateConfig = (config: Config): boolean => {
  // 检查apiKey，baseUrl，model是否都为空
  const openaiConfigEmpty = !config.apiKey.trim() && !config.baseUrl.trim() && !config.model.trim();

  // 检查apiKey，baseUrl，model是否都不为空
  const openaiConfigNotEmpty = config.apiKey.trim() && config.baseUrl.trim() && config.model.trim();

  // 如果 OpenAI 配置既不都为空也不都不为空，则提示错误
  if (!(openaiConfigEmpty || openaiConfigNotEmpty)) {
    ElMessage.error('OpenAI配置（API Key, Base URL, Model）要么都为空，要么都不为空');
    return false;
  }
  return true;
};


const saveConfig = () => {
  if (!validateConfig(config.value)) {
    return;
  }
  localStorage.setItem('openai_api_key', config.value.apiKey);
  localStorage.setItem('openai_base_url', config.value.baseUrl);
  localStorage.setItem('openai_model', config.value.model);
  localStorage.setItem('ai_prompt', config.value.prompt);
  ElMessage.success('配置已保存');
  modelVisible.value = false;
};

const showModel = () => {
  // 重新加载本地存储的配置
  config.value = {
    apiKey: localStorage.getItem('openai_api_key') || '',
    baseUrl: localStorage.getItem('openai_base_url') || '',
    model: localStorage.getItem('openai_model') || '',
    prompt: localStorage.getItem('ai_prompt') || ''
  };
  modelVisible.value = true;
};

const getConfig = (): Config => {
  return {
    apiKey: config.value.apiKey,
    baseUrl: config.value.baseUrl,
    model: config.value.model,
    prompt: config.value.prompt
  };
};

defineExpose({
  showModel,
  getConfig
});
</script>