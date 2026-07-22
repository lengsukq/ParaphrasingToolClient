<template>
  <!--  整体容器 -->
  <div class="w-full">
    <div class="">
      <!-- 上传区域 -->
      <div class="mb-6">
        <CustomUpload
            :isHTML="isHTML"
            :isLocalParse="true"
            @upload-success="handleUploadSuccess"
            @upload-error="handleUploadError"
        />
      </div>

      <!--  表格区域 -->
      <div v-if="analyzeResults.length > 0" class="">
        <TableHeader>
          <TableRow>
            <TableHead style="width: 35%;">原文</TableHead>
            <TableHead style="width: 35%;">相似源</TableHead>
            <TableHead style="width: 20%;">修改建议</TableHead>
            <TableHead style="width: 10%;">AI降重</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="row in analyzeResults" :key="row.original_text">
            <TableCell>
                <Textarea
                    style="width: 100%; word-break: break-word; max-height: 10em; overflow: auto;"
                    :title="row.original_text"
                    v-model="row.original_text"
                    readonly
                />
            </TableCell>
            <TableCell>
                <Textarea
                    style="width: 100%; word-break: break-word; max-height: 10em; overflow: auto;"
                    :title="row.similar_source"
                    v-model="row.similar_source"
                    readonly
                />
            </TableCell>
            <TableCell>
                <Textarea
                    style="width: 100%; word-break: break-word; max-height: 10em; overflow: auto;"
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
import { ref, onMounted } from 'vue';
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
import { Textarea } from '@/components/ui/textarea';
import AIParaphraseDialog from './AIParaphraseDialog.vue';
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
  aiResult?: { paraphrased_text: string };
  original_html?: string; 
  similar_source_html?: string;
}

const { config } = useConfig();
const { paraphrase } = useParaphrase(config);
const isHTML = ref<boolean>(false)

const analyzeResults = ref<AnalyzeResult[]>([]);

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
