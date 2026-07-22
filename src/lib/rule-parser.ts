/**
 * @file 结构化解析规则引擎
 * 负责：规则类型定义、规则执行、HTML片段截取、AI Prompt 生成
 */

// ==================== 类型定义 ====================

export interface FieldRule {
  /** 相对于容器元素的选择器，":scope" 表示容器自身 */
  selector: string;
  /** 提取方式：text=textContent, html=innerHTML, attr=getAttribute */
  method: 'text' | 'html' | 'attr';
  /** 可选：仅当容器内存在匹配此选择器的元素时才提取（条件过滤） */
  condition?: string;
  /** 可选：在 selector 匹配到的元素内，再查找子元素逐个提取 */
  childSelector?: string;
  /** 可选：多个子元素提取结果的连接符 */
  join?: string;
  /** 可选：当 method=attr 时指定属性名 */
  attribute?: string;
  /** 可选：提取失败时的默认值 */
  default?: string;
}

export interface ParseRule {
  /** 规则唯一 ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 规则描述 */
  description: string;
  /** 创建时间 ISO 字符串 */
  createdAt: string;
  /** 格式特征样本（用于快速匹配） */
  formatSample?: string;
  /** 重复数据单元的容器选择器 */
  containerSelector: string;
  /** 字段提取规则映射 */
  fields: {
    original_text: FieldRule;
    similar_source: FieldRule;
    correction_advice?: FieldRule;
  };
}

export interface AnalyzeResult {
  original_text: string;
  similar_source: string;
  correction_advice: string;
  isLoading?: boolean;
  aiResult?: { paraphrased_text: string };
}

export interface SnippetParts {
  head: string;
  middle: string;
  tail: string;
}

// ==================== 规则执行引擎 ====================

/**
 * 根据结构化规则解析 HTML 文档
 */
export function executeRule(html: string, rule: ParseRule): AnalyzeResult[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const containers = doc.querySelectorAll(rule.containerSelector);
  const results: AnalyzeResult[] = [];

  containers.forEach((container) => {
    const original_text = extractField(container, rule.fields.original_text);
    const similar_source = extractField(container, rule.fields.similar_source);
    const correction_advice = rule.fields.correction_advice
      ? extractField(container, rule.fields.correction_advice)
      : '';

    // 只保留有原文内容的条目
    if (original_text) {
      results.push({
        original_text,
        similar_source,
        correction_advice,
        isLoading: false,
        aiResult: { paraphrased_text: '' },
      });
    }
  });

  return results;
}

/**
 * 从容器元素中按字段规则提取文本
 */
function extractField(container: Element, field: FieldRule): string {
  if (!field || !field.selector) {
    return field?.default || '';
  }

  // 条件过滤：如果设置了 condition，容器内必须存在匹配元素才继续
  if (field.condition) {
    const condEl = container.querySelector(field.condition);
    if (!condEl) return field.default || '';
  }

  // 确定目标元素
  let targetEl: Element | null;
  if (field.selector === ':scope') {
    targetEl = container;
  } else {
    targetEl = container.querySelector(field.selector);
  }

  if (!targetEl) {
    return field.default || '';
  }

  // 如果有 childSelector，在目标元素内查找多个子元素
  if (field.childSelector) {
    const children = targetEl.querySelectorAll(field.childSelector);
    const texts: string[] = [];
    children.forEach((child) => {
      const text = extractByMethod(child, field);
      if (text) texts.push(text);
    });
    return texts.join(field.join || '\n');
  }

  return extractByMethod(targetEl, field);
}

/**
 * 按 method 从单个元素提取内容
 */
function extractByMethod(el: Element, field: FieldRule): string {
  switch (field.method) {
    case 'html':
      return el.innerHTML.trim();
    case 'attr':
      return (el.getAttribute(field.attribute || '') || field.default || '').trim();
    case 'text':
    default:
      return el.textContent?.trim() || field.default || '';
  }
}

// ==================== 三段式片段截取 ====================

const HEAD_SIZE = 15000;
const MIDDLE_SIZE = 15000;
const TAIL_SIZE = 10000;
const TOTAL_THRESHOLD = HEAD_SIZE + MIDDLE_SIZE + TAIL_SIZE; // 40000

/**
 * 三段式截取 HTML 片段：头部、中间、底部
 * 若文档总长度不足阈值，直接返回全文（三段相同）
 */
export function extractSnippet(html: string): SnippetParts {
  const len = html.length;

  // 短文档直接发全文
  if (len <= TOTAL_THRESHOLD) {
    return { head: html, middle: '', tail: '' };
  }

  const head = sliceAtTagBoundary(html, 0, HEAD_SIZE, 'end');
  const midStart = Math.floor(len / 2) - Math.floor(MIDDLE_SIZE / 2);
  const middle = sliceAtTagBoundary(html, midStart, midStart + MIDDLE_SIZE, 'both');
  const tail = sliceAtTagBoundary(html, len - TAIL_SIZE, len, 'start');

  return { head, middle, tail };
}

/**
 * 在标签边界处截断，避免截断 HTML 标签
 * @param html 完整 HTML
 * @param start 起始位置
 * @param end 结束位置
 * @param adjust 调整哪一端：'start' 调整起始, 'end' 调整结束, 'both' 两端都调整
 */
function sliceAtTagBoundary(html: string, start: number, end: number, adjust: 'start' | 'end' | 'both'): string {
  let s = Math.max(0, start);
  let e = Math.min(html.length, end);

  if (adjust === 'start' || adjust === 'both') {
    // 向后找到第一个 '>' 之后的位置，确保不从标签中间开始
    const nextGt = html.indexOf('>', s);
    if (nextGt !== -1 && nextGt - s < 200) {
      s = nextGt + 1;
    }
  }

  if (adjust === 'end' || adjust === 'both') {
    // 向前找到最后一个 '<' 之前的位置，确保不在标签中间结束
    const prevLt = html.lastIndexOf('<', e);
    if (prevLt !== -1 && e - prevLt < 200) {
      e = prevLt;
    }
  }

  return html.slice(s, e);
}

// ==================== AI Prompt 生成 ====================

/**
 * 构建发给 AI 的规则生成 prompt
 * @returns system prompt 和 user content 的组合字符串（供 openAIAct 的 prompt 参数使用）
 */
export function generateRulePrompt(_snippets: SnippetParts): string {
  return `你是一个 HTML 文档结构分析专家。用户会给你一份 HTML 查重报告的片段样本，你需要分析其 DOM 结构并生成一份结构化解析规则（JSON 格式）。

## 输出要求

请严格输出以下 JSON 格式（不要输出其他内容，不要用 markdown 代码块包裹）：

{
  "name": "规则名称（根据报告来源/格式命名）",
  "description": "简要描述该规则适用的报告格式",
  "formatSample": "文档中最具辨识度的特征文本（如版权声明、系统名称等，用于快速匹配）",
  "containerSelector": "重复数据单元的 CSS 选择器（如 div.piece, tr, div.result-item 等）",
  "fields": {
    "original_text": {
      "selector": "相对于容器的选择器，:scope 表示容器自身",
      "method": "text 或 html 或 attr",
      "condition": "可选，仅当容器内存在匹配此选择器的元素时才提取",
      "childSelector": "可选，在目标元素内再查找子元素逐个提取",
      "join": "可选，多个子元素结果的连接符",
      "attribute": "可选，method=attr 时的属性名",
      "default": "可选，提取失败时的默认值"
    },
    "similar_source": {
      "selector": "相似源/对比源的选择器",
      "method": "text",
      "childSelector": "可选",
      "join": "可选",
      "default": ""
    },
    "correction_advice": {
      "selector": "修改建议的选择器（如果没有则留空字符串）",
      "method": "text",
      "default": ""
    }
  }
}

## 分析要点

1. 找到文档中**重复出现的数据单元**（每条查重结果对应一个容器）
2. 在容器内定位"原文"、"相似源"、"修改建议"三个字段对应的 DOM 节点
3. 选择器要精确且通用，能匹配文档中所有同类容器
4. 如果某字段不存在（如没有修改建议），selector 留空字符串
5. 注意利用 id、class、属性选择器来精确定位`;
}

/**
 * 将三段片段拼接为发送给 AI 的 user content
 */
export function buildUserContent(snippets: SnippetParts): string {
  // 短文档情况：head 就是全文
  if (!snippets.middle && !snippets.tail) {
    return `以下是完整的 HTML 查重报告：\n\n${snippets.head}`;
  }

  return `以下是一份 HTML 查重报告的三个片段（头部、中间、底部）：

===== 头部片段 =====
${snippets.head}

===== 中间片段 =====
${snippets.middle}

===== 底部片段 =====
${snippets.tail}

请分析以上 HTML 结构，生成解析规则 JSON。`;
}

/**
 * 从 AI 返回的文本中解析出 ParseRule JSON
 */
export function parseRuleFromAIResponse(responseText: string): Omit<ParseRule, 'id' | 'createdAt'> {
  // 尝试直接解析
  let jsonStr = responseText.trim();

  // 去除可能的 markdown 代码块包裹
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  // 尝试提取 JSON 对象
  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  const parsed = JSON.parse(jsonStr);

  // 校验必要字段
  if (!parsed.containerSelector) {
    throw new Error('AI 返回的规则缺少 containerSelector 字段');
  }
  if (!parsed.fields || !parsed.fields.original_text) {
    throw new Error('AI 返回的规则缺少 fields.original_text 字段');
  }

  return {
    name: parsed.name || '未命名规则',
    description: parsed.description || '',
    formatSample: parsed.formatSample || '',
    containerSelector: parsed.containerSelector,
    fields: {
      original_text: parsed.fields.original_text,
      similar_source: parsed.fields.similar_source || { selector: '', method: 'text', default: '' },
      correction_advice: parsed.fields.correction_advice || { selector: '', method: 'text', default: '' },
    },
  };
}
