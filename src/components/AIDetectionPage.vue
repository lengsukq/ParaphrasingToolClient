<template>
  <div class="w-full">
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

      <!-- 上传区域 -->
      <div class="mb-6">
        <CustomUpload
            :isLocalParse="true"
          @upload-success="handleUploadSuccess"
        />
      </div>

      <!-- 表格区域 -->
      <div v-if="analyzeResults.length > 0" class="">
        <TableHeader>
          <TableRow>
            <TableHead style="width: 60%;">原文</TableHead>
            <TableHead style="width: 20%;">AI生成可能率</TableHead>
            <TableHead style="width: 20%;">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="row in analyzeResults" :key="row.text">
            <TableCell>
              <Textarea
                style="width: 100%; word-break: break-word; max-height: 10em; overflow: auto;"
                :title="row.text"
                v-model="row.text"
                readonly
              />
            </TableCell>
            <TableCell>
              <div class="flex flex-col items-start gap-2">
                <div class="text-lg font-medium">
                  <span :class="getAIScoreClass(row.aiScore)">{{ row.aiScore }}%</span>
                </div>
                <div class="text-sm text-gray-500">
                  {{ getAIScoreDescription(row.aiScore) }}
                </div>
                <div class="w-full h-2 bg-gray-200 rounded-full">
                  <div
                    class="h-full rounded-full transition-all"
                    :class="getAIScoreBarClass(row.aiScore)"
                    :style="{ width: `${row.aiScore}%` }"
                  ></div>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Button
                variant="outline"
                @click="handleAIParaphrase(row)"
                :loading="row.isLoading"
              >
                AI降重
              </Button>
              <div v-if="row.aiResult && row.aiResult.paraphrased_text" class="mt-2">
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
import { toast } from 'vue-sonner';
import CustomUpload from '@/components/CustomUpload.vue';
import { post, openAIAct } from '@/lib/request';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from '@/components/ui/textarea';
import ConfigDialog from './ConfigDialog.vue';
import AIParaphraseDialog from './AIParaphraseDialog.vue';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface AnalyzeResult {
  text: string;
  aiScore: number;
  isLoading?: boolean;
  aiResult?: { paraphrased_text: string };
}

interface Config {
  api_key?: string;
  base_url?: string;
  model?: string;
  prompt?: string;
  localAi?: boolean;
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
  localStorage.setItem('ai_config', JSON.stringify(newConfig));
};

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
    let response;
    if (config.localAi) {
      response = await openAIAct(config.api_key, config.base_url, config.model, config.prompt, row.text);
    } else {
      response = await post('/ai_paraphrase', {
        content: row.text,
        ...config,
      });
    }

    if (response.code === 200) {
      analyzeResults.value[index].aiResult = { paraphrased_text: response.content || response.data.paraphrased_text };
      toast.success('AI降重成功');
    } else {
      toast.error(response.message || '降重失败');
    }
  } catch (error) {
    toast.error('降重请求失败');
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