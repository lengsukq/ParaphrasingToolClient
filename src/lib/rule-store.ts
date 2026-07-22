/**
 * @file 规则管理模块
 * 基于 localStorage 的规则持久化，支持导入导出
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { ParseRule } from './rule-parser';

const STORAGE_KEY = 'ai_parse_rules';

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * 获取所有已保存的规则
 */
export function getRules(): ParseRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ParseRule[];
  } catch {
    return [];
  }
}

/**
 * 保存规则（新增或更新）
 */
export function saveRule(rule: ParseRule): void {
  const rules = getRules();
  const index = rules.findIndex((r) => r.id === rule.id);
  if (index >= 0) {
    rules[index] = rule;
  } else {
    rules.push(rule);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

/**
 * 删除规则
 */
export function deleteRule(id: string): void {
  const rules = getRules().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

/**
 * 重命名规则
 */
export function renameRule(id: string, newName: string): void {
  const rules = getRules();
  const rule = rules.find((r) => r.id === id);
  if (rule) {
    rule.name = newName;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  }
}

/**
 * 批量导出规则为 ZIP 并触发下载
 */
export async function exportRulesAsZip(rules: ParseRule[], fileName = 'parse-rules.zip'): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('rules');
  if (!folder) throw new Error('无法创建 ZIP 文件夹');

  rules.forEach((rule) => {
    const safeName = rule.name.replace(/[\\/:*?"<>|]/g, '_');
    folder.file(`${safeName}_${rule.id}.json`, JSON.stringify(rule, null, 2));
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, fileName);
}

/**
 * 导出单个规则为 JSON 文件
 */
export function exportRuleAsJson(rule: ParseRule): void {
  const safeName = rule.name.replace(/[\\/:*?"<>|]/g, '_');
  const blob = new Blob([JSON.stringify(rule, null, 2)], { type: 'application/json' });
  saveAs(blob, `${safeName}.json`);
}

/**
 * 导入规则（支持 ZIP 或单个 JSON 文件）
 * @returns 导入成功的规则列表
 */
export async function importRules(file: File): Promise<ParseRule[]> {
  const imported: ParseRule[] = [];

  if (file.name.endsWith('.zip')) {
    const zip = await JSZip.loadAsync(file);
    const jsonFiles = Object.values(zip.files).filter(
      (f) => f.name.endsWith('.json') && !f.dir
    );

    for (const zipEntry of jsonFiles) {
      try {
        const content = await zipEntry.async('text');
        const rule = JSON.parse(content) as ParseRule;
        if (isValidRule(rule)) {
          // 重新生成 ID 避免冲突
          rule.id = generateId();
          imported.push(rule);
        }
      } catch {
        // 跳过解析失败的文件
      }
    }
  } else if (file.name.endsWith('.json')) {
    const content = await file.text();
    const parsed = JSON.parse(content);

    // 支持单个规则或规则数组
    if (Array.isArray(parsed)) {
      parsed.forEach((rule) => {
        if (isValidRule(rule)) {
          rule.id = generateId();
          imported.push(rule);
        }
      });
    } else if (isValidRule(parsed)) {
      parsed.id = generateId();
      imported.push(parsed);
    }
  }

  // 批量保存
  if (imported.length > 0) {
    const existing = getRules();
    const merged = [...existing, ...imported];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }

  return imported;
}

/**
 * 校验规则对象是否有效
 */
function isValidRule(rule: any): rule is ParseRule {
  return (
    rule &&
    typeof rule.name === 'string' &&
    typeof rule.containerSelector === 'string' &&
    rule.containerSelector.length > 0 &&
    rule.fields &&
    rule.fields.original_text &&
    typeof rule.fields.original_text.selector === 'string'
  );
}
