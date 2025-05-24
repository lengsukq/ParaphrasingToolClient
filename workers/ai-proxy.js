// @ts-ignore
// (Cloudflare Worker 环境中没有完整的 Node.js 类型定义，所以有时需要 @ts-ignore)

export default {
  /**
   * Worker 的主处理函数
   * @param {Request} request - 收到的请求对象
   * @param {object} env - 环境变量 (如果在 Cloudflare Dashboard 中设置了)
   * @param {object} ctx - 执行上下文
   * @returns {Promise<Response>} - 返回给客户端的响应
   */
  async fetch(request, env, ctx) {
    // --- CORS 预检请求处理 ---
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    // --- 仅允许 POST 请求 ---
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({
        code: 405, // Method Not Allowed
        message: '方法不允许，仅支持 POST 请求。'
      }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    try {
      // --- 解析请求体 ---
      const requestBody = await request.json();

      // --- 获取参数 ---
      // 直接使用用户提供的值。如果用户未提供，则使用后备的默认值。
      // 注意：这里不对用户提供的值进行验证。
      const apiKey = requestBody.api_key || 'sk-xxxx'; // 后备 API 密钥
      const baseUrl = requestBody.base_url || 'https://api.siliconflow.cn/v1/chat/completions'; // 后备基础 URL
      const model = requestBody.model || 'Qwen/Qwen2.5-7B-Instruct'; // 后备模型
      const userPrompt = requestBody.prompt || '你是一个文本改写助手。你的任务是在保持原意不变的前提下，用不同的表达方式重写文本。请保持专业和流畅，并确保准确性。'; // 后备系统提示
      const userContent = requestBody.content; // 需要AI处理的文本内容

      // --- 检查必要参数 'content' ---
      if (!userContent) {
        return new Response(JSON.stringify({
          code: 400, // Bad Request
          message: '请求体中缺少必要的 "content" 参数。'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      // --- 构造发送给AI服务的请求体 ---
      const aiRequestBody = {
        model: model,
        messages: [
          { role: 'system', content: userPrompt },
          { role: 'user', content: userContent },
        ],
        // stream: false, // 根据需要设置
      };


      // --- 调用AI服务 ---
      const aiResponse = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aiRequestBody),
      });

      // --- 解析AI服务的响应 ---
      const aiResponseData = await aiResponse.json();

      // --- 处理AI服务响应并适配前端 ---
      if (aiResponse.ok && aiResponseData.choices && aiResponseData.choices[0] && aiResponseData.choices[0].message && aiResponseData.choices[0].message.content) {
        // AI 服务成功返回，并且结构符合预期
        const paraphrasedText = aiResponseData.choices[0].message.content;
        return new Response(JSON.stringify({
          code: 200,
          content: paraphrasedText, // 前端期望的改写后文本
          message: 'AI降重成功。'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      } else {
        // AI 服务返回错误或非预期结构
        console.error('AI API 调用错误:', aiResponse.status, JSON.stringify(aiResponseData));
        const errorMessage = (aiResponseData.error && aiResponseData.error.message)
            || aiResponseData.message
            || `AI服务调用失败，状态码: ${aiResponse.status}`;
        return new Response(JSON.stringify({
          code: aiResponse.status || 500, // 使用AI服务的状态码，若无则用500
          message: errorMessage,
        }), {
          status: aiResponse.status || 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

    } catch (error) {
      // --- Worker 内部错误处理 ---
      console.error('Worker 内部发生错误:', error);
      let errorMessage = '服务器内部错误。';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      // 检查是否是 JSON 解析错误
      if (error.message && error.message.toLowerCase().includes('json')) {
        errorMessage = "请求体不是有效的JSON格式。"
      }

      return new Response(JSON.stringify({
        code: 500, // Internal Server Error
        message: `处理AI请求时发生错误: ${errorMessage}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};

// --- CORS 响应头配置 ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // 允许所有来源 (生产环境请指定具体域名)
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // 允许的方法
  'Access-Control-Allow-Headers': 'Content-Type, Authorization', // 允许的请求头
};

/**
 * 处理 OPTIONS 预检请求的辅助函数
 * @param {Request} request
 * @returns {Response}
 */
function handleOptions(request) {
  if (
      request.headers.get('Origin') !== null &&
      request.headers.get('Access-Control-Request-Method') !== null &&
      request.headers.get('Access-Control-Request-Headers') !== null
  ) {
    // 对于有效的CORS预检请求，返回CORS头部
    return new Response(null, {
      headers: corsHeaders,
    });
  } else {
    // 对于其他OPTIONS请求
    return new Response(null, {
      headers: {
        Allow: 'POST, OPTIONS',
      },
    });
  }
}