<template>
  <!--  整体容器 -->
  <div class="bg-gray-100 min-h-screen py-8">
    <div class="container mx-auto px-4">
      <!-- 顶部操作栏 -->
      <div class="flex justify-end mb-6">
        <el-button
          type="primary"
          @click="openConfig"
          class="bg-blue-600 hover:bg-blue-700 transition-colors duration-200"
        >
          系统配置
        </el-button>
        <ConfigModel ref="configModelRef"/>
      </div>

      <!--  上传区域 -->
      <div class="mb-6">
        <CustomUpload
          @upload-success="handleUploadSuccess"
          @upload-error="handleUploadError"
        />
      </div>

      <!--  表格区域 -->
      <div v-if="analyzeResults.length > 0" class="mt-4 rounded-lg shadow-md overflow-hidden bg-white">
        <el-table :data="analyzeResults" border style="width: 100%" stripe>
          <el-table-column prop="original_text" label="原文" />
          <el-table-column prop="similar_source" label="相似源" />
          <el-table-column prop="correction_advice" label="修改建议" />
          <el-table-column label="AI降重" width="200">
            <template #default="{ row }">
              <el-button
                  type="primary"
                  size="small"
                  @click="handleAIParaphrase(row)"
                  :loading="row.isLoading"
                  class="bg-green-500 hover:bg-green-700 transition-colors duration-200"
              >
                AI降重
              </el-button>
              <div v-if="row.aiResult" class="mt-2 text-sm text-green-600">
                {{ row.aiResult?.paraphrased_text }}
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { ElMessage } from 'element-plus';
import CustomUpload from './CustomUpload.vue';
import ConfigModel from './ConfigModel.vue';
import { post } from '@/lib/request'; // 引入 post 函数

interface AnalyzeResult {
  original_text: string;
  similar_source: string;
  correction_advice: string;
  isLoading?: boolean;
  aiResult?: any; // 考虑到aiResult可能包含paraphrased_text，这里修改了类型
}

const configModelRef = ref<InstanceType<typeof ConfigModel> | null>(null);
const analyzeResults = ref<AnalyzeResult[]>([]);

const openConfig = () => {
  configModelRef.value?.showModel();
};

const handleUploadSuccess = (response: any) => {
  if (response.code === 200) {
    analyzeResults.value = response.data.map((item: AnalyzeResult) => ({
      ...item,
      isLoading: false,
      aiResult: ''
    }));
    ElMessage.success('文件上传成功');
  }
};

const handleUploadError = (error: string) => {
  ElMessage.error(error);
};

const handleAIParaphrase = async (row: AnalyzeResult) => {
  const index = analyzeResults.value.findIndex(item => item === row);
  if (index === -1) return;

  analyzeResults.value[index].isLoading = true;

  try {
    const config = configModelRef.value?.getConfig();

    const response = await post('/ai_paraphrase', { // 使用 post 函数
      text: row.original_text,
      prompt: config?.prompt,
      model: config?.model,
    });
    if (response.code === 200) {
      analyzeResults.value[index].aiResult = response.data;
      ElMessage.success('AI降重成功');
    } else {
      throw new Error(response.message || 'AI处理失败');
    }
  } catch (error: any) {
    ElMessage.error(error.message || 'AI处理失败');
  } finally {
    analyzeResults.value[index].isLoading = false;
  }
};
</script>

<style scoped>
/*  移除原有的container样式  */
</style>
