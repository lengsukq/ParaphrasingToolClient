<template>
  <Dialog :open="open" @update:open="close">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>系统配置</DialogTitle>
        <DialogDescription>
          配置你的 OpenAI API 设置。
        </DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="api_key" class="text-right">API Key</Label>
          <Input id="api_key" v-model="apiKey" class="col-span-3" :placeholder="apiKeyPlaceholder" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="base_url" class="text-right">Base URL</Label>
          <Input id="base_url" v-model="baseUrl" class="col-span-3" :placeholder="baseUrlPlaceholder" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="model" class="text-right">Model</Label>
          <Input id="model" v-model="model" class="col-span-3" :placeholder="modelPlaceholder" />
        </div>
        <div class="grid grid-cols-4 items-center gap-4">
          <Label for="prompt" class="text-right">Prompt</Label>
          <Textarea id="prompt" v-model="prompt" class="col-span-3" :placeholder="promptPlaceholder" />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" @click="close">取消</Button>
        <Button type="submit" @click="handleSave">保存</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script lang="ts" setup>
import { ref, defineEmits, defineProps, watch} from 'vue';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'vue-sonner'; // 导入 toast

interface Config {
  api_key?: string;
  base_url?: string;
  model?: string;
  prompt?: string;
}

const props = defineProps<{
  open: boolean;
  config?: Config;  // 使用 Config 类型，并设置为可选
}>()

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'config-change', config: Config): void;
}>();

// 使用 computed 属性根据 props.config 的值来初始化 ref
const apiKey = ref(props.config?.api_key || '');
const baseUrl = ref(props.config?.base_url || '');
const model = ref(props.config?.model || '');
const prompt = ref(props.config?.prompt || '');

// 默认提示信息
const apiKeyPlaceholder = '请输入 API Key';
const baseUrlPlaceholder = '请输入 Base URL';
const modelPlaceholder = '请输入 Model';
const promptPlaceholder = '请输入 Prompt';

// 监听 config 变化，更新输入框的值
watch(
    () => props.config,
    (newConfig) => {
      if (newConfig) {
        apiKey.value = newConfig.api_key || '';
        baseUrl.value = newConfig.base_url || '';
        model.value = newConfig.model || '';
        prompt.value = newConfig.prompt || '';
      } else {
        // 如果父组件没有传递config，则清空输入框
        apiKey.value = '';
        baseUrl.value = '';
        model.value = '';
        prompt.value = '';
      }
    },
    { deep: true } // 深度监听，确保对象内部属性的变化也能被检测到
);

const close = () => {
  emit('close');
};

const validateConfig = () => {
  const hasApiKey = !!apiKey.value;
  const hasBaseUrl = !!baseUrl.value;
  const hasModel = !!model.value;

  // 校验前三项要么都填要么都不填
  if ((hasApiKey && !hasBaseUrl) || (!hasApiKey && hasBaseUrl) || (hasApiKey && !hasModel) || (!hasApiKey && hasModel) || (hasBaseUrl && !hasModel) || (!hasBaseUrl && hasModel)) {
    toast.warning('API Key, Base URL, 和 Model 必须同时填写或同时为空。');
    return false;
  }
  return true;
};

const handleSave = () => {
  if (!validateConfig()) {
    return; // 如果校验失败，阻止保存
  }
  emit('config-change', {
    api_key: apiKey.value,
    base_url: baseUrl.value,
    model: model.value,
    prompt: prompt.value,
  });
  close();
};

</script>
