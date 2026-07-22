<template>
  <div class="w-full space-y-6">
    <!-- 上传区域 -->
    <CustomUpload
        :isLocalParse="true"
      @upload-success="handleUploadSuccess"
    />

    <!-- 空状态 -->
    <div v-if="analyzeResults.length === 0" class="text-center py-12 text-muted-foreground">
      <p class="text-sm">上传 AIGC 检测报告后，系统将自动解析并展示结果</p>
    </div>

    <!-- 表格区域 -->
    <div v-if="analyzeResults.length > 0" class="space-y-4">
      <p class="text-sm text-muted-foreground">共 {{ analyzeResults.length }} 条检测结果</p>
      <TableHeader>
        <TableRow>
          <TableHead style="width: 55%;">原文</TableHead>
          <TableHead style="width: 20%;">AI生成可能率</TableHead>
          <TableHead style="width: 25%;">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="(row, idx) in analyzeResults" :key="idx">
          <TableCell>
            <CollapsibleText :text="row.text" />
          </TableCell>
          <TableCell>
            <div class="flex flex-col items-start gap-2">
              <div class="text-lg font-medium">
                <span :class="getAIScoreClass(row.aiScore)">{{ row.aiScore }}%</span>
              </div>
              <div class="text-sm text-muted-foreground">
                {{ getAIScoreDescription(row.aiScore) }}
              </div>
              <div class="w-full h-2 bg-muted rounded-full">
                <div
                  class="h-full rounded-full transition-all"
                  :class="getAIScoreBarClass(row.aiScore)"
                  :style="{ width: `${row.aiScore}%` }"
                ></div>
              </div>
            </div>
          </TableCell>
          <TableCell>
            <div class="space-y-2">
              <Button
                variant="outline"
                size="sm"
                @click="handleAIParaphrase(row)"
                :loading="row.isLoading"
              >
                AI降重
              </Button>
              <div v-if="row.aiResult && row.aiResult.paraphrased_text" class="rounded-md border border-green-200 bg-green-50 p-2">
                <p class="text-xs text-green-700 whitespace-pre-wrap break-words line-clamp-4">{{ row.aiResult.paraphrased_text }}</p>
                <div class="flex gap-2 mt-1">
                  <button class="text-xs text-green-600 hover:underline" @click="copyText(row.aiResult!.paraphrased_text)">复制</button>
                  <button class="text-xs text-muted-foreground hover:underline" @click="openParaphraseDialog(row)">查看全文</button>
                </div>
              </div>
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
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { toast } from 'vue-sonner';
import CustomUpload from '@/components/CustomUpload.vue';
import { useConfig } from '@/composables/useConfig';
import { useParaphrase } from '@/composables/useParaphrase';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CollapsibleText } from '@/components/ui/collapsible-text';
import AIParaphraseDialog from './AIParaphraseDialog.vue';

interface AnalyzeResult {
  text: string;
  aiScore: number;
  isLoading?: boolean;
  aiResult?: { paraphrased_text: string };
}

const { config } = useConfig();
const { paraphrase } = useParaphrase(config);

const analyzeResults = ref<AnalyzeResult[]>([]);

// AI降重对话框相关状态
const isParaphraseDialogOpen = ref(false);
const dialogOriginalText = ref('');
const dialogParaphrasedText = ref('');

const handleUploadSuccess = (file: File) => { // 接收File对象作为参数
  const reader = new FileReader();

  reader.onload = (event: ProgressEvent<FileReader>) => {
    //  当文件读取完成时，`event.target.result` 包含了 HTML 内容
    const content = event.target?.result as string; // 获取HTML内容
    // 解析HTML内容
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    console.log('handleUploadSuccess',doc)

    const elements = doc.querySelectorAll('.aigc-box-detection-content-list-lis');

    const results: AnalyzeResult[] = [];
    elements.forEach(element => {
      const textElement = element.querySelector('.aigc-box-detection-content-list-lis-txt em');
      const scoreElement = element.querySelector('.aigc-detection-chance-popover-top i');

      if (textElement && scoreElement) {
        const text = textElement.textContent || '';
        const score = parseFloat(scoreElement.textContent || '0');

        results.push({
          text,
          aiScore: score,
          isLoading: false,
          aiResult: { paraphrased_text: '' }
        });
      }
    });

    analyzeResults.value = results;
    toast.success('文件解析成功');
  };

  reader.readAsText(file); //  读取文件内容
};


const handleAIParaphrase = async (row: AnalyzeResult) => {
  const index = analyzeResults.value.findIndex(item => item === row);
  if (index === -1) return;

  analyzeResults.value[index].isLoading = true;
  try {
    const result = await paraphrase(row.text);
    analyzeResults.value[index].aiResult = { paraphrased_text: result };
    toast.success('AI降重成功');
  } catch (error: any) {
    toast.error(error.message || '降重请求失败');
  } finally {
    analyzeResults.value[index].isLoading = false;
  }
};

const openParaphraseDialog = (row: AnalyzeResult) => {
  if (row.aiResult?.paraphrased_text) {
    dialogOriginalText.value = row.text;
    dialogParaphrasedText.value = row.aiResult.paraphrased_text;
    isParaphraseDialogOpen.value = true;
  }
};

const closeParaphraseDialog = () => {
  isParaphraseDialogOpen.value = false;
};

const copyText = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    toast.success('已复制到剪贴板');
  }).catch(() => {
    toast.error('复制失败');
  });
};

const getAIScoreClass = (score: number) => {
  if (score < 40) return 'text-green-600';
  if (score < 60) return 'text-yellow-600';
  return 'text-red-600';
};

const getAIScoreBarClass = (score: number) => {
  if (score < 40) return 'bg-green-600';
  if (score < 60) return 'bg-yellow-600';
  return 'bg-red-600';
};

const getAIScoreDescription = (score: number) => {
  if (score < 40) return '可能为人类创作';
  if (score < 60) return '疑似AI生成';
  return 'AI生成';
};
</script>