import { post, openAIAct } from '@/lib/request';
import type { AIConfig } from './useConfig';

/**
 * 统一 AI 降重逻辑（双通道：localAi 直连 / Worker 代理）
 */
export function useParaphrase(config: AIConfig) {
  /**
   * 对文本执行 AI 降重
   * @returns 降重后的文本
   * @throws Error 当 AI 处理失败时
   */
  async function paraphrase(text: string): Promise<string> {
    let response;
    if (config.localAi) {
      response = await openAIAct(
        config.api_key,
        config.base_url,
        config.model,
        config.prompt,
        text
      );
    } else {
      response = await post('/ai_paraphrase', {
        content: text,
        ...config,
      });
    }

    if (response.code === 200) {
      return response.content || response.data?.paraphrased_text || '';
    } else {
      throw new Error(response.message || 'AI处理失败');
    }
  }

  return { paraphrase };
}
