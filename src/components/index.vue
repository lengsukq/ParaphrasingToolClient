<template>
  <!--  整体容器 -->
  <div class="">
    <div class="">
      <!-- 顶部操作栏 -->
      <div class="flex justify-end mb-6">
        <Button variant="outline" @click="openConfigDialog">系统配置</Button>
        <ConfigDialog
            :open="isConfigDialogOpen"
            @close="closeConfigDialog"
            @config-change="handleConfigChange"
            :config="config"
        />
      </div>

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
            <TableHead style="width: 50%;">原文</TableHead>
            <TableHead style="width: 20%;">相似源</TableHead>
            <TableHead style="width: 20%;">修改建议</TableHead>
            <TableHead style="width: 10%;">AI降重</TableHead>
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
                  variant="outline"
                  @click="handleAIParaphrase(row)"
                  :loading="row.isLoading"
              >
                AI降重
              </Button>
              <div v-if="row.aiResult && row.aiResult.paraphrased_text" class="mt-2 text-sm text-green-600">
                  <!-- 按钮点击后，显示AIParaphraseDialog -->
                <HoverCard>
                  <HoverCardTrigger>
                    <Button variant="outline" @click="openParaphraseDialog(row)">查看降重结果</Button>
                  </HoverCardTrigger>
                  <HoverCardContent>
                    {{ row.aiResult.paraphrased_text }}
                  </HoverCardContent>
                </HoverCard>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </div>

      <!-- AI降重结果对话框 -->
      <AIParaphraseDialog
        :open="isParaphraseDialogOpen"
        :originalText="dialogOriginalText"
        :paraphrasedText="dialogParaphrasedText"
        @close="closeParaphraseDialog"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue';
import { toast } from 'vue-sonner'
import CustomUpload from '@/components/CustomUpload.vue';
import { post } from '@/lib/request';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"  // 假设这些组件仍然可用
import { Button } from "@/components/ui/button"
import { Textarea } from '@/components/ui/textarea'; // 导入 Textarea 组件
import ConfigDialog from './ConfigDialog.vue'; // 导入ConfigDialog组件
import AIParaphraseDialog from './AIParaphraseDialog.vue'; // 导入新组件
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'

interface AnalyzeResult {
  original_text: string;
  similar_source: string;
  correction_advice: string;
  isLoading?: boolean;
  aiResult?: { paraphrased_text: string }; //  修改aiResult的类型
}

interface Config {
  api_key?: string;
  base_url?: string;
  model?: string;
  prompt?: string;
}

const analyzeResults = ref<AnalyzeResult[]>([]);
const isConfigDialogOpen = ref(false);
const config = reactive<Config>({});

// AI降重对话框相关状态
const isParaphraseDialogOpen = ref(false);
const dialogOriginalText = ref('');
const dialogParaphrasedText = ref('');

// 在页面加载时读取配置信息
onMounted(() => {
  const savedConfig = localStorage.getItem('ai_config');
  if (savedConfig) {
    Object.assign(config, JSON.parse(savedConfig));
  }
});


const openConfigDialog = () => {
  isConfigDialogOpen.value = true;
};

const closeConfigDialog = () => {
  isConfigDialogOpen.value = false;
};

const handleConfigChange = (newConfig: Config) => {
  Object.assign(config, newConfig);
  // 保存配置信息到 localStorage
  localStorage.setItem('ai_config', JSON.stringify(newConfig));
};

const handleUploadSuccess = (response: any) => {
  if (response.code === 200) {
    analyzeResults.value = response.data.map((item: AnalyzeResult) => ({
      ...item,
      isLoading: false,
      aiResult: { paraphrased_text: '' } // 初始化 aiResult.paraphrased_text
    }));
    toast.success('文件上传成功')
  }
};

const handleUploadError = (error: string) => {
  toast.error(error)
};

const handleAIParaphrase = async (row: AnalyzeResult) => {
  const index = analyzeResults.value.findIndex(item => item === row);
  if (index === -1) return;

  analyzeResults.value[index].isLoading = true;

  try {
    const response = await post('/ai_paraphrase', { // 使用 post 函数
      text: row.original_text,
      ...config, // 将配置合并到请求中
    });
    if (response.code === 200) {
      analyzeResults.value[index].aiResult = { paraphrased_text: response.data.paraphrased_text }; // 确保正确赋值
      toast.success('AI降重成功')
    } else {
      throw new Error(response.message || 'AI处理失败');
    }
  } catch (error: any) {
    toast.error("error.message || 'AI处理失败'")
  } finally {
    analyzeResults.value[index].isLoading = false;
  }
};

// 打开AI降重结果对话框
const openParaphraseDialog = (row: AnalyzeResult) => {
    dialogOriginalText.value = row.original_text;
    dialogParaphrasedText.value = row.aiResult?.paraphrased_text || ''; // 确保在没有降重结果时，paraphrasedText为空字符串
    isParaphraseDialogOpen.value = true;
};

// 关闭AI降重结果对话框
const closeParaphraseDialog = () => {
    isParaphraseDialogOpen.value = false;
};
</script>
