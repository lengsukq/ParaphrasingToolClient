<template>
  <div class="w-full space-y-6">
    <!-- 上传区域 -->
    <CustomUpload
        :isHTML="isHTML"
        :isLocalParse="true"
        @upload-success="handleUploadSuccess"
        @upload-error="handleUploadError"
    />

    <!-- 空状态引导 -->
    <div v-if="analyzeResults.length === 0" class="text-center py-12 text-muted-foreground">
      <p class="text-sm">上传 HTML 查重报告后，系统将自动解析并展示结果</p>
      <p class="text-xs mt-2">支持大雅、PaperYY 等查重系统的 HTML 报告</p>
      <!-- 推荐 AI 智能解析 -->
      <div class="mt-6 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-left">
        <svg class="w-5 h-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <div>
          <p class="text-sm font-medium text-blue-800">报告格式不支持？试试 AI 智能解析</p>
          <p class="text-xs text-blue-600 mt-0.5">AI 自动生成解析规则，兼容任意来源的查重报告</p>
        </div>
        <button class="ml-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline shrink-0" @click="goToSmartParse">去使用 →</button>
      </div>
    </div>

    <!-- 结果区域 -->
    <div v-if="analyzeResults.length > 0" class="space-y-4">
      <!-- 统计栏 -->
      <div class="flex items-center justify-between">
        <p class="text-sm text-muted-foreground">
          共 {{ analyzeResults.length }} 条结果，已降重 {{ paraphrasedCount }} 条
        </p>
        <Button size="sm" @click="handleBatchParaphrase" :loading="isBatchLoading">
          全部降重
        </Button>
      </div>

      <!-- 表格 -->
      <TableHeader>
        <TableRow>
          <TableHead style="width: 35%;">原文</TableHead>
          <TableHead style="width: 30%;">相似源</TableHead>
          <TableHead style="width: 15%;">修改建议</TableHead>
          <TableHead style="width: 20%;">AI降重</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="(row, idx) in analyzeResults" :key="idx">
          <TableCell>
            <CollapsibleText :text="row.original_text" />
          </TableCell>
          <TableCell>
            <CollapsibleText :text="row.similar_source || '—'" />
          </TableCell>
          <TableCell>
            <CollapsibleText :text="row.correction_advice || '—'" />
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
              <!-- 降重结果内联展示 -->
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
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner'
import CustomUpload from '@/components/CustomUpload.vue';
import { useConfig } from '@/composables/useConfig';
import { useParaphrase } from '@/composables/useParaphrase';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { CollapsibleText } from '@/components/ui/collapsible-text';
import AIParaphraseDialog from './AIParaphraseDialog.vue';

const router = useRouter();
const goToSmartParse = () => router.push('/ai-smart-parse');

interface AnalyzeResult {
  original_text: string;
  similar_source: string;
  correction_advice: string;
  isLoading?: boolean;
  aiResult?: { paraphrased_text: string };
  original_html?: string; 
  similar_source_html?: string;
}

const { config } = useConfig();
const { paraphrase } = useParaphrase(config);
const isHTML = ref<boolean>(false)

const analyzeResults = ref<AnalyzeResult[]>([]);
const isBatchLoading = ref(false);

const paraphrasedCount = computed(() =>
  analyzeResults.value.filter(r => r.aiResult?.paraphrased_text).length
);

// AI降重对话框相关状态
const isParaphraseDialogOpen = ref(false);
const dialogOriginalText = ref('');
const dialogParaphrasedText = ref('');

const handleUploadSuccess = (file: File) => {
  const reader = new FileReader();
  reader.onload = (event: ProgressEvent<FileReader>) => {
    const htmlContent = event.target?.result as string;
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const results: AnalyzeResult[] = [];

    if (htmlContent.includes("检测报告由大雅相似度分析检测系统生成")) {
      doc.querySelectorAll('div.piece').forEach(pieceDiv => {
        const pieceId = pieceDiv.getAttribute('id');
        if (!pieceId) return;

        let original_text = "";
        let original_html = "";
        const redFont = pieceDiv.querySelector('font[color="red"]');
        if (redFont) {
          original_text = pieceDiv.textContent?.trim() || "";
          if (isHTML.value) {
            original_html = pieceDiv.outerHTML;
          }
        }

        let similar_source = "";
        let similar_source_html = "";
        const rightDivId = `right_${pieceId}`;
        const rightDiv = doc.querySelector(`div#${rightDivId}.right_list`);
        if (rightDiv) {
          if (isHTML.value) {
            similar_source_html = rightDiv.outerHTML;
          } else {
            const similarParagraphs: string[] = [];
            rightDiv.querySelectorAll('div.similar_paragraph').forEach(p => {
              similarParagraphs.push(p.textContent?.trim() || "");
            });
            similar_source = similarParagraphs.join('\n');
          }
        }
        const result: AnalyzeResult = {
          original_text,
          similar_source,
          correction_advice: "", // 新逻辑中没有修改建议
          isLoading: false,
          aiResult: { paraphrased_text: '' }
        };
        if (isHTML.value) {
          result.original_html = original_html;
          result.similar_source_html = similar_source_html;
        }
        results.push(result);
      });
    } else {
      doc.querySelectorAll('tr').forEach(tr => {
        const originTextDiv = tr.querySelector('td.Origin_text p');
        const original_text = originTextDiv?.textContent?.trim() || "";

        const similarSourceDiv = tr.querySelector('div.siminfo');
        let similar_source = "";
        if (similarSourceDiv) {
          const paragraphs: string[] = [];
          similarSourceDiv.querySelectorAll('p').forEach(p => {
            const text = p.textContent?.trim();
            if (text) paragraphs.push(text);
          });
          similar_source = paragraphs.join('\n');
        }

        const correctionAdviceDiv = tr.querySelector('div.correct_advice');
        let correction_advice = "";
        if (correctionAdviceDiv) {
          const spans: string[] = [];
          correctionAdviceDiv.querySelectorAll('span').forEach(span => {
            spans.push(span.textContent?.trim() || "");
          });
          correction_advice = spans.join('\n');
        }
        if (original_text) { // Only add if original_text is not empty
            results.push({
                original_text,
                similar_source,
                correction_advice,
                isLoading: false,
                aiResult: { paraphrased_text: '' }
            });
        }
      });
    }
    analyzeResults.value = results;
    toast.success('文件解析成功');
  };
  reader.readAsText(file);
};

const handleUploadError = (error: string) => {
  toast.error(error)
};

const handleAIParaphrase = async (row: AnalyzeResult) => {
  const index = analyzeResults.value.findIndex(item => item === row);
  if (index === -1) return;

  analyzeResults.value[index].isLoading = true;
  try {
    const result = await paraphrase(row.original_text);
    analyzeResults.value[index].aiResult = { paraphrased_text: result };
    toast.success('AI降重成功');
  } catch (error: any) {
    toast.error(error.message || 'AI处理失败');
  } finally {
    analyzeResults.value[index].isLoading = false;
  }
};

const handleBatchParaphrase = async () => {
  isBatchLoading.value = true;
  let success = 0;
  for (let i = 0; i < analyzeResults.value.length; i++) {
    if (analyzeResults.value[i].aiResult?.paraphrased_text) continue;
    analyzeResults.value[i].isLoading = true;
    try {
      const result = await paraphrase(analyzeResults.value[i].original_text);
      analyzeResults.value[i].aiResult = { paraphrased_text: result };
      success++;
    } catch { /* skip */ }
    finally { analyzeResults.value[i].isLoading = false; }
  }
  isBatchLoading.value = false;
  toast.success(`批量降重完成，成功 ${success} 条`);
};

const copyText = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    toast.success('已复制到剪贴板');
  }).catch(() => {
    toast.error('复制失败');
  });
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
