<template>
  <div class="w-full">
    <!-- 顶部操作栏 -->
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-lg font-semibold">AI 智能解析</h2>
      <div class="flex gap-2">
        <Button variant="outline" @click="openConfigDialog">系统配置</Button>
        <ConfigDialog
          :open="isConfigDialogOpen"
          @close="closeConfigDialog"
          @config-change="handleConfigChange"
          :config="config"
        />
      </div>
    </div>

    <div class="flex gap-6">
      <!-- 左侧主区域 -->
      <div class="flex-1 min-w-0">
        <!-- 上传区域 -->
        <div class="mb-6">
          <div
            class="w-full border-2 border-dashed border-gray-300 rounded-lg transition-all duration-300"
            :class="{ 'border-blue-500 bg-blue-50': isDragging, 'hover:border-blue-400': !isDragging }"
            @dragenter.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @dragover.prevent
            @drop.prevent="handleDrop"
          >
            <div class="p-8 text-center">
              <div class="flex flex-col items-center justify-center space-y-4">
                <div class="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center"
                  :class="{ 'animate-bounce': isDragging }">
                  <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div class="space-y-2">
                  <h3 class="text-lg font-medium text-gray-900">
                    拖拽文件到此处或
                    <Button variant="outline" @click="triggerFileInput">点击上传</Button>
                  </h3>
                  <p class="text-sm text-gray-500">支持上传 HTML 查重报告文件</p>
                </div>
              </div>
            </div>
            <input ref="fileInput" type="file" accept=".html" class="hidden" @change="handleFileSelect" />
          </div>
        </div>

        <!-- 片段预览区域 -->
        <div v-if="snippets.head" class="mb-6 border rounded-lg">
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-t-lg cursor-pointer"
            @click="showSnippet = !showSnippet">
            <span class="text-sm font-medium text-gray-700">
              截取片段预览
              <span class="text-gray-400 ml-2">{{ snippetSummary }}</span>
            </span>
            <span class="text-gray-400">{{ showSnippet ? '收起' : '展开' }}</span>
          </div>
          <div v-if="showSnippet" class="p-3 space-y-3 max-h-80 overflow-auto">
            <div v-if="snippets.head">
              <p class="text-xs font-semibold text-blue-600 mb-1">头部片段</p>
              <pre class="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32 whitespace-pre-wrap">{{ snippets.head.slice(0, 2000) }}{{ snippets.head.length > 2000 ? '...' : '' }}</pre>
            </div>
            <div v-if="snippets.middle">
              <p class="text-xs font-semibold text-green-600 mb-1">中间片段</p>
              <pre class="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32 whitespace-pre-wrap">{{ snippets.middle.slice(0, 2000) }}{{ snippets.middle.length > 2000 ? '...' : '' }}</pre>
            </div>
            <div v-if="snippets.tail">
              <p class="text-xs font-semibold text-orange-600 mb-1">底部片段</p>
              <pre class="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32 whitespace-pre-wrap">{{ snippets.tail.slice(0, 2000) }}{{ snippets.tail.length > 2000 ? '...' : '' }}</pre>
            </div>
          </div>
        </div>

        <!-- 规则选择 + AI 生成 -->
        <div v-if="snippets.head" class="mb-6 flex items-center gap-3 flex-wrap">
          <select v-model="selectedRuleId" class="border rounded-md px-3 py-2 text-sm min-w-[200px]">
            <option value="">-- 选择已有规则 --</option>
            <option v-for="rule in savedRules" :key="rule.id" :value="rule.id">{{ rule.name }}</option>
          </select>
          <Button variant="outline" @click="applySelectedRule" :disabled="!selectedRuleId">使用选中规则</Button>
          <Button @click="generateRuleByAI" :loading="isGenerating">AI 生成规则</Button>
        </div>

        <!-- 解析结果表格 -->
        <div v-if="analyzeResults.length > 0" class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-gray-700">解析结果（{{ analyzeResults.length }} 条）</h3>
            <Button v-if="currentRule && currentRule.id.startsWith('temp_')" variant="outline" size="sm"
              @click="handleSaveRule">
              保存当前规则
            </Button>
          </div>
          <TableHeader>
            <TableRow>
              <TableHead style="width: 35%;">原文</TableHead>
              <TableHead style="width: 35%;">相似源</TableHead>
              <TableHead style="width: 20%;">修改建议</TableHead>
              <TableHead style="width: 10%;">AI降重</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="(row, idx) in analyzeResults" :key="idx">
              <TableCell>
                <Textarea style="width: 100%; word-break: break-word; max-height: 10em; overflow: auto;"
                  :title="row.original_text" v-model="row.original_text" readonly />
              </TableCell>
              <TableCell>
                <Textarea style="width: 100%; word-break: break-word; max-height: 10em; overflow: auto;"
                  :title="row.similar_source" v-model="row.similar_source" readonly />
              </TableCell>
              <TableCell>
                <Textarea style="width: 100%; word-break: break-word; max-height: 10em; overflow: auto;"
                  :title="row.correction_advice" v-model="row.correction_advice" readonly />
              </TableCell>
              <TableCell>
                <Button variant="outline" @click="handleAIParaphrase(row)" :loading="row.isLoading">AI降重</Button>
                <div v-if="row.aiResult && row.aiResult.paraphrased_text" class="mt-2">
                  <HoverCard>
                    <HoverCardTrigger>
                      <Button variant="outline" @click="openParaphraseDialog(row)">查看结果</Button>
                    </HoverCardTrigger>
                    <HoverCardContent>{{ row.aiResult.paraphrased_text }}</HoverCardContent>
                  </HoverCard>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </div>
      </div>

      <!-- 右侧规则管理 -->
      <div class="w-72 shrink-0">
        <div class="border rounded-lg p-4">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold">规则管理</h3>
            <div class="flex gap-1">
              <Button variant="outline" size="sm" @click="triggerImport">导入</Button>
              <Button variant="outline" size="sm" @click="handleExportAll" :disabled="savedRules.length === 0">导出ZIP</Button>
            </div>
          </div>
          <input ref="importInput" type="file" accept=".zip,.json" class="hidden" @change="handleImportFile" />

          <div v-if="savedRules.length === 0" class="text-sm text-gray-400 text-center py-4">暂无保存的规则</div>
          <div v-else class="space-y-2 max-h-96 overflow-auto">
            <div v-for="rule in savedRules" :key="rule.id"
              class="flex items-center gap-2 p-2 rounded border text-sm hover:bg-gray-50">
              <input type="checkbox" v-model="rule._selected" class="shrink-0" />
              <div class="flex-1 min-w-0">
                <template v-if="editingRuleId === rule.id">
                  <input v-model="editingName" class="border rounded px-1 py-0.5 w-full text-sm"
                    @keyup.enter="confirmRename(rule)" @blur="confirmRename(rule)" ref="renameInput" />
                </template>
                <template v-else>
                  <p class="truncate font-medium">{{ rule.name }}</p>
                  <p class="text-xs text-gray-400">{{ formatDate(rule.createdAt) }}</p>
                </template>
              </div>
              <div class="flex gap-1 shrink-0">
                <button class="text-xs text-blue-500 hover:underline" @click="startRename(rule)">重命名</button>
                <button class="text-xs text-red-500 hover:underline" @click="handleDeleteRule(rule.id)">删除</button>
              </div>
            </div>
          </div>

          <!-- 批量操作 -->
          <div v-if="savedRules.length > 0" class="mt-3 pt-3 border-t flex gap-2">
            <Button variant="outline" size="sm" @click="handleExportSelected" :disabled="!hasSelected">导出选中</Button>
          </div>
        </div>
      </div>
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
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { toast } from 'vue-sonner';
import { openAIAct, post } from '@/lib/request';
import {
  extractSnippet,
  executeRule,
  generateRulePrompt,
  buildUserContent,
  parseRuleFromAIResponse,
  type ParseRule,
  type AnalyzeResult,
  type SnippetParts,
} from '@/lib/rule-parser';
import {
  getRules,
  saveRule,
  deleteRule,
  renameRule,
  generateId,
  exportRulesAsZip,
  importRules,
} from '@/lib/rule-store';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import ConfigDialog from './ConfigDialog.vue';
import AIParaphraseDialog from './AIParaphraseDialog.vue';

// ==================== 配置相关 ====================
interface Config {
  api_key?: string;
  base_url?: string;
  model?: string;
  prompt?: string;
  localAi?: boolean;
}

const config = reactive<Config>({});
const isConfigDialogOpen = ref(false);

onMounted(() => {
  const savedConfig = localStorage.getItem('ai_config');
  if (savedConfig) Object.assign(config, JSON.parse(savedConfig));
  savedRules.value = getRules().map((r) => ({ ...r, _selected: false }));
});

const openConfigDialog = () => { isConfigDialogOpen.value = true; };
const closeConfigDialog = () => { isConfigDialogOpen.value = false; };
const handleConfigChange = (newConfig: Config) => {
  Object.assign(config, newConfig);
  localStorage.setItem('ai_config', JSON.stringify(newConfig));
};

// ==================== 文件上传 ====================
const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const fullHtml = ref('');
const snippets = reactive<SnippetParts>({ head: '', middle: '', tail: '' });
const showSnippet = ref(false);

const snippetSummary = computed(() => {
  if (!snippets.head) return '';
  if (!snippets.middle && !snippets.tail) return `全文 ${snippets.head.length} 字符`;
  return `头 ${snippets.head.length} + 中 ${snippets.middle.length} + 尾 ${snippets.tail.length} 字符`;
});

const triggerFileInput = () => fileInput.value?.click();

const handleDrop = (e: DragEvent) => {
  isDragging.value = false;
  const file = e.dataTransfer?.files[0];
  if (file) processFile(file);
};

const handleFileSelect = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) processFile(file);
};

const processFile = (file: File) => {
  if (file.type !== 'text/html' && !file.name.endsWith('.html')) {
    toast.error('只能上传 HTML 文件！');
    return;
  }
  const reader = new FileReader();
  reader.onload = (event) => {
    const html = event.target?.result as string;
    fullHtml.value = html;
    const parts = extractSnippet(html);
    snippets.head = parts.head;
    snippets.middle = parts.middle;
    snippets.tail = parts.tail;
    showSnippet.value = false;
    analyzeResults.value = [];
    currentRule.value = null;
    toast.success('文件读取成功，已截取片段');
  };
  reader.readAsText(file);
};

// ==================== 规则生成与应用 ====================
const isGenerating = ref(false);
const analyzeResults = ref<AnalyzeResult[]>([]);
const currentRule = ref<ParseRule | null>(null);
const selectedRuleId = ref('');

const generateRuleByAI = async () => {
  if (!snippets.head) {
    toast.error('请先上传文件');
    return;
  }
  if (!config.api_key && !config.base_url) {
    toast.warning('请先在系统配置中设置 AI 参数');
    return;
  }

  isGenerating.value = true;
  try {
    const systemPrompt = generateRulePrompt(snippets);
    const userContent = buildUserContent(snippets);

    const response = await openAIAct(
      config.api_key,
      config.base_url,
      config.model,
      systemPrompt,
      userContent
    );

    if (response.code === 200 && response.content) {
      const ruleData = parseRuleFromAIResponse(response.content);
      const rule: ParseRule = {
        ...ruleData,
        id: 'temp_' + generateId(),
        createdAt: new Date().toISOString(),
      };
      currentRule.value = rule;

      // 立即执行规则
      const results = executeRule(fullHtml.value, rule);
      if (results.length === 0) {
        toast.warning('规则已生成，但未解析到数据，请检查规则或重试');
      } else {
        toast.success(`规则生成成功，解析到 ${results.length} 条数据`);
      }
      analyzeResults.value = results;
    } else {
      throw new Error(response.message || 'AI 生成规则失败');
    }
  } catch (error: any) {
    toast.error(error.message || 'AI 生成规则失败');
  } finally {
    isGenerating.value = false;
  }
};

const applySelectedRule = () => {
  const rule = savedRules.value.find((r) => r.id === selectedRuleId.value);
  if (!rule) {
    toast.error('请选择一个规则');
    return;
  }
  if (!fullHtml.value) {
    toast.error('请先上传文件');
    return;
  }
  currentRule.value = rule;
  const results = executeRule(fullHtml.value, rule);
  if (results.length === 0) {
    toast.warning('使用该规则未解析到数据');
  } else {
    toast.success(`解析成功，共 ${results.length} 条数据`);
  }
  analyzeResults.value = results;
};

const handleSaveRule = () => {
  if (!currentRule.value) return;
  const ruleToSave: ParseRule = {
    ...currentRule.value,
    id: currentRule.value.id.startsWith('temp_') ? generateId() : currentRule.value.id,
  };
  saveRule(ruleToSave);
  currentRule.value = ruleToSave;
  refreshRules();
  toast.success('规则已保存');
};

// ==================== 规则管理 ====================
const savedRules = ref<(ParseRule & { _selected?: boolean })[]>([]);
const editingRuleId = ref('');
const editingName = ref('');
const renameInput = ref<HTMLInputElement[] | null>(null);
const importInput = ref<HTMLInputElement | null>(null);

const hasSelected = computed(() => savedRules.value.some((r) => r._selected));

const refreshRules = () => {
  savedRules.value = getRules().map((r) => ({ ...r, _selected: false }));
};

const startRename = (rule: ParseRule) => {
  editingRuleId.value = rule.id;
  editingName.value = rule.name;
  nextTick(() => {
    if (renameInput.value && renameInput.value.length > 0) {
      renameInput.value[0].focus();
    }
  });
};

const confirmRename = (rule: ParseRule) => {
  if (editingName.value.trim() && editingName.value !== rule.name) {
    renameRule(rule.id, editingName.value.trim());
    refreshRules();
    toast.success('重命名成功');
  }
  editingRuleId.value = '';
};

const handleDeleteRule = (id: string) => {
  deleteRule(id);
  refreshRules();
  toast.success('规则已删除');
};

const triggerImport = () => importInput.value?.click();

const handleImportFile = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const imported = await importRules(file);
    if (imported.length > 0) {
      refreshRules();
      toast.success(`成功导入 ${imported.length} 条规则`);
    } else {
      toast.warning('未找到有效规则');
    }
  } catch (err: any) {
    toast.error('导入失败：' + (err.message || '未知错误'));
  }
  // 清空 input 以允许重复选择同一文件
  (e.target as HTMLInputElement).value = '';
};

const handleExportAll = async () => {
  try {
    await exportRulesAsZip(savedRules.value);
    toast.success('导出成功');
  } catch {
    toast.error('导出失败');
  }
};

const handleExportSelected = async () => {
  const selected = savedRules.value.filter((r) => r._selected);
  if (selected.length === 0) return;
  try {
    await exportRulesAsZip(selected);
    toast.success(`已导出 ${selected.length} 条规则`);
  } catch {
    toast.error('导出失败');
  }
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('zh-CN');
  } catch {
    return '';
  }
};

// ==================== AI 降重 ====================
const isParaphraseDialogOpen = ref(false);
const dialogOriginalText = ref('');
const dialogParaphrasedText = ref('');

const handleAIParaphrase = async (row: AnalyzeResult) => {
  const index = analyzeResults.value.findIndex((item) => item === row);
  if (index === -1) return;

  analyzeResults.value[index].isLoading = true;
  try {
    let response;
    if (config.localAi) {
      response = await openAIAct(
        config.api_key,
        config.base_url,
        config.model,
        config.prompt,
        row.original_text
      );
    } else {
      response = await post('/ai_paraphrase', {
        content: row.original_text,
        ...config,
      });
    }

    if (response.code === 200) {
      analyzeResults.value[index].aiResult = {
        paraphrased_text: response.content || response.data?.paraphrased_text || '',
      };
      toast.success('AI降重成功');
    } else {
      throw new Error(response.message || 'AI处理失败');
    }
  } catch (error: any) {
    toast.error(error.message || 'AI处理失败');
  } finally {
    analyzeResults.value[index].isLoading = false;
  }
};

const openParaphraseDialog = (row: AnalyzeResult) => {
  dialogOriginalText.value = row.original_text;
  dialogParaphrasedText.value = row.aiResult?.paraphrased_text || '';
  isParaphraseDialogOpen.value = true;
};

const closeParaphraseDialog = () => {
  isParaphraseDialogOpen.value = false;
};
</script>
