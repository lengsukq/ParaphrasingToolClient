<template>
  <div
    class="w-full border-2 border-dashed border-gray-300 rounded-lg transition-all duration-300"
    :class="{
      'border-blue-500 bg-blue-50': isDragging,
      'hover:border-blue-400': !isDragging
    }"
    @dragenter.prevent="handleDragEnter"
    @dragleave.prevent="handleDragLeave"
    @dragover.prevent
    @drop.prevent="handleDrop"
  >
    <div class="p-8 text-center">
      <div class="flex flex-col items-center justify-center space-y-4">
        <!-- 上传图标 -->
        <div
          class="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center"
          :class="{ 'animate-bounce': isDragging }"
        >
          <svg
            class="w-8 h-8 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        <!-- 上传提示文本 -->
        <div class="space-y-2">
          <h3 class="text-lg font-medium text-gray-900">
            拖拽文件到此处或
            <Button variant="outline"
              @click="triggerFileInput"
            >
              点击上传
            </Button>
          </h3>
          <p class="text-sm text-gray-500">支持上传HTML文件</p>
        </div>

        <!-- 文件上传进度 -->
        <div v-if="isUploading" class="w-full max-w-md">
          <div class="relative pt-1">
            <div class="flex mb-2 items-center justify-between">
              <div>
                <span class="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                  上传中
                </span>
              </div>
              <div class="text-right">
                <span class="text-xs font-semibold inline-block text-blue-600">
                  {{ uploadProgress }}%
                </span>
              </div>
            </div>
            <div class="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
              <div
                :style="{ width: `${uploadProgress}%` }"
                class="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-300"
              ></div>
            </div>
          </div>
        </div>

        <!-- 错误提示 -->
        <div v-if="error" class="text-red-500 text-sm">
          {{ error }}
        </div>
      </div>
    </div>

    <!-- 隐藏的文件输入框 -->
    <input
      ref="fileInput"
      type="file"
      accept=".html"
      class="hidden"
      @change="handleFileSelect"
    >
  </div>
</template>

<script lang="ts" setup>
import { ref, onBeforeUnmount, defineProps, defineEmits } from 'vue';
// import { ElMessage } from 'element-plus';
import { upload} from '@/lib/request';
import {Button} from "@/components/ui/button"; // 导入 post 函数

const emit = defineEmits(['upload-success', 'upload-error']);
const props = defineProps({
  isLocalParse: {
    type: Boolean,
    default: false,
  },
  isHTML: {
    type: Boolean,
    default: false,
  },
});


const isDragging = ref(false);
const isUploading = ref(false); // 添加上传状态
const uploadProgress = ref(0);
const error = ref('');
const fileInput = ref<HTMLInputElement | null>(null);
let timer: number | null = null; // 用于存储定时器

const handleDragEnter = () => {
  isDragging.value = true;
};

const handleDragLeave = () => {
  isDragging.value = false;
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const validateFile = (file: File): boolean => {
  if (file.type !== 'text/html') {
    error.value = '只能上传HTML文件！';
    return false;
  }
  return true;
};

const uploadFile = async (file: File) => {
  if (isUploading.value) {
    return;
  }

  if (!validateFile(file)) return;

  if (props.isLocalParse) {
    emit('upload-success', file); // 传递文件给父组件
    return;
  }

  const formData = new FormData();
  formData.append('file', file);
  // 传递 isHTML 参数
  formData.append('isHTML', props.isHTML.toString()); // 将布尔值转换为字符串

  isUploading.value = true;
  error.value = '';
  uploadProgress.value = 0;

  timer = window.setInterval(() => {
    if (uploadProgress.value < 95) {
      uploadProgress.value += 5;
    } else {
      uploadProgress.value = 95;
    }
  }, 300);

  try {
    const result = await upload('/analyze', formData);

    if (result.code === 200) {
      uploadProgress.value = 100; // 确保进度条达到100%
      emit('upload-success', result);
    } else {
      throw new Error(result.message || '上传失败');
    }
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    isUploading.value = false;

  } catch (err: any) {
    error.value = err.message || '文件上传失败';
    emit('upload-error', error.value);
    // ElMessage.error(error.value);
    isUploading.value = false;
  } finally {
    isDragging.value = false;
  }
};


const handleDrop = (e: DragEvent) => {
  isDragging.value = false;
  const file = e.dataTransfer?.files[0];
  if (file) {
    uploadFile(file);
  }
};

const handleFileSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    uploadFile(file);
  }
};

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
});
</script>

