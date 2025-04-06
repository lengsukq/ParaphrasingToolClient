<template>
  <!--  整体容器 -->
  <div class="">
    <div class="">
      <!-- 顶部操作栏 -->
      <!--      <div class="flex justify-end mb-6">-->
      <!--        <Button variant="default" @click="openConfig">系统配置</Button>-->
      <!--        <ConfigModel ref="configModelRef" />-->
      <!--      </div>-->

      <!--  上传区域 -->
      <div class="mb-6">
        <CustomUpload
            @upload-success="handleUploadSuccess"
            @upload-error="handleUploadError"
        />
      </div>

      <!--  表格区域 -->
      <div v-if="analyzeResults.length > 0" class="">
          <TableHeader>
            <TableRow>
              <TableHead style="width: 30%;">原文</TableHead>
              <TableHead style="width: 20%;">相似源</TableHead>
              <TableHead style="width: 20%;">修改建议</TableHead>
              <TableHead style="width: 30%;">AI降重</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="row in analyzeResults" :key="row.original_text">
              <TableCell>
                <Textarea
                    style="width: 100%; word-break: break-word; max-height: 7em; overflow: auto;"
                    :title="row.original_text"
                    v-model="row.original_text"
                    readonly
                />
              </TableCell>
              <TableCell>
                <Textarea
                    style="width: 100%; word-break: break-word; max-height: 7em; overflow: auto;"
                    :title="row.similar_source"
                    v-model="row.similar_source"
                    readonly
                />
              </TableCell>
              <TableCell>
                <Textarea
                    style="width: 100%; word-break: break-word; max-height: 7em; overflow: auto;"
                    :title="row.correction_advice"
                    v-model="row.correction_advice"
                    readonly
                />
              </TableCell>
              <TableCell>
                <Button
                    variant="secondary"
                    size="sm"
                    @click="handleAIParaphrase(row)"
                    :loading="row.isLoading"
                >
                  AI降重
                </Button>
                <div v-if="row.aiResult && row.aiResult.paraphrased_text" class="mt-2 text-sm text-green-600">
                  <Textarea
                      style="width: 100%; word-break: break-word; max-height: 7em; overflow: auto;"
                      v-model="row.aiResult.paraphrased_text"
                      readonly
                  />
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { toast } from 'vue-sonner'
import CustomUpload from '@/components/CustomUpload.vue';
// import ConfigModel from './ConfigModel.vue';
import { post } from '@/lib/request.js';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"  // 假设这些组件仍然可用
import { Button } from "@/components/ui/button"
import { Textarea } from '@/components/ui/textarea'; // 导入 Textarea 组件


interface AnalyzeResult {
  original_text: string;
  similar_source: string;
  correction_advice: string;
  isLoading?: boolean;
  aiResult?: any; // 考虑到aiResult可能包含paraphrased_text，这里修改了类型
}

// const configModelRef = ref<InstanceType<typeof ConfigModel> | null>(null);
const analyzeResults = ref<AnalyzeResult[]>([]);

// const openConfig = () => {
//   configModelRef.value?.showModel();
// };

const handleUploadSuccess = (response: any) => {
  if (response.code === 200) {
    analyzeResults.value = response.data.map((item: AnalyzeResult) => ({
      ...item,
      isLoading: false,
      aiResult: ''
    }));
    toast("成功",{
      description: "文件上传成功",
    })
  }
};

const handleUploadError = (error: string) => {
  toast("错误",{
    description: error,
  })
};

const handleAIParaphrase = async (row: AnalyzeResult) => {
  const index = analyzeResults.value.findIndex(item => item === row);
  if (index === -1) return;

  analyzeResults.value[index].isLoading = true;

  try {
    // const config = configModelRef.value?.getConfig();

    const response = await post('/ai_paraphrase', { // 使用 post 函数
      text: row.original_text,
      // prompt: config?.prompt,
      // model: config?.model,
    });
    if (response.code === 200) {
      analyzeResults.value[index].aiResult = response.data;
      toast("成功",{
        description: "AI降重成功",
      })
    } else {
      throw new Error(response.message || 'AI处理失败');
    }
  } catch (error: any) {
    toast("错误",{
      description: error.message || 'AI处理失败',
    })
  } finally {
    analyzeResults.value[index].isLoading = false;
  }
};
</script>
