/**
 * @file 基于 fetch 的通用请求函数封装
 *       支持：
 *         - 常见请求类型 (GET, POST, PUT, DELETE, 等)
 *         - 文件上传
 *         - 统一错误处理
 *         - 可配置的超时
 */

/**
 * 默认配置项
 */
const defaultOptions = {
  baseURL: import.meta.env.VITE_API_BASE_URL || '', // 从环境变量获取 baseURL，如果环境变量不存在，则默认为空字符串
  timeout: 180000, // 超时时间，单位：毫秒
  headers: {}, // 移除默认的 Content-Type
};

/**
 * 检查响应状态
 * @param {Response} response fetch 的 Response 对象
 * @returns {Response} 如果状态码在 200-299 范围内，返回 Response 对象；否则抛出错误
 */
async function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  } else {
    const error = new Error(response.statusText || `HTTP Error: ${response.status}`);
    error.response = response;
    try {
      // 尝试解析 JSON 格式的错误信息
      error.data = await response.json();
      // 如果错误信息有 message 字段，则使用该字段作为错误信息
      if (error.data && error.data.message) {
        error.message = error.data.message;
      }
    } catch (e) {
      // 如果不是 JSON 格式，尝试获取文本格式的错误信息
      error.data = await response.text();
    }
    throw error;
  }
}

/**
 * 发起请求的通用函数
 * @param {string} url 请求的URL
 * @param {object} options fetch 的配置项
 * @returns {Promise<any>} 返回 Promise，resolve 的值为 JSON 格式的响应数据
 */
async function request(url, options = {}) {
  const finalOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };

  const { baseURL, timeout, ...fetchOptions } = finalOptions;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(baseURL + url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    await checkStatus(response); // 检查状态码

    // 处理 No Content 响应
    if (response.status === 204) {
      return null;
    }

    // 尝试解析为 JSON
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      error.message = 'Request timed out';
    }
    // 重新抛出错误，让调用者处理
    throw error;
  }
}

/**
 * GET 请求
 * @param {string} url 请求的URL
 * @param {object} params  URL 参数
 * @param {object} options fetch 的配置项
 * @returns {Promise<any>}
 */
export async function get(url, params = {}, options = {}) {
  const query = new URLSearchParams(params).toString();
  const requestUrl = query ? `${url}?${query}` : url;
  return request(requestUrl, {
    method: 'GET',
    ...options,
  });
}

/**
 * POST 请求
 * @param {string} url 请求的URL
 * @param {object} data 请求体
 * @param {object} options fetch 的配置项
 * @returns {Promise<any>}
 */
export async function post(url, data = {}, options = {}) {
  const finalOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', // 默认 Content-Type
      ...options.headers, // 合并用户自定义的 header，确保自定义的 header 优先级更高
    },
    ...options,
  };

  // 根据 Content-Type 设置 body
  if (data instanceof FormData) {
    finalOptions.body = data;
  } else if (
      !finalOptions.headers ||
      !finalOptions.headers['Content-Type'] ||
      finalOptions.headers['Content-Type'].includes('application/json')
  ) {
    finalOptions.body = JSON.stringify(data); // 默认 JSON 格式
  } else {
    // 其他 Content-Type，例如 'application/x-www-form-urlencoded' 或 'multipart/form-data'
    finalOptions.body = data; // 直接使用 data
  }

  return request(url, finalOptions);
}

/**
 * PUT 请求
 * @param {string} url 请求的URL
 * @param {object} data 请求体
 * @param {object} options fetch 的配置项
 * @returns {Promise<any>}
 */
export async function put(url, data = {}, options = {}) {
  return request(url, {
    method: 'PUT',
    body: JSON.stringify(data),
    ...options,
  });
}

/**
 * DELETE 请求
 * @param {string} url 请求的URL
 * @param {object} options fetch 的配置项
 * @returns {Promise<any>}
 */
export async function del(url, options = {}) {
  return request(url, {
    method: 'DELETE',
    ...options,
  });
}

/**
 * 文件上传
 * @param {string} url 请求的URL
 * @param {FormData} formData FormData 对象
 * @param {object} options fetch 的配置项
 * @returns {Promise<any>}
 */
export async function upload(url, formData, options = {}) {
  return request(url, {
    method: 'POST',
    body: formData,
    ...options,
  });
}

// 新增 OpenAI 请求函数 (通过 Cloudflare Worker 代理)

export async function openAIAct(api_key, base_url, model, prompt, content) {
  // 注意：请将 YOUR_CLOUDFLARE_WORKER_URL 替换为您部署的 Cloudflare Worker 的实际 URL
  // 例如: https://your-worker-name.your-subdomain.workers.dev
  // 您可以在 Cloudflare Dashboard 中找到您的 Worker URL
  // 或者，如果您使用 wrangler cli 部署，它会在部署成功后显示 URL
  const workerUrl = import.meta.env.VITE_API_BASE_URL;

  if (!workerUrl) {
    console.error('VITE_API_BASE_URL 环境变量未配置。请在 .env 文件中配置 VITE_API_BASE_URL 指向您的 AI 服务代理 URL。');
    // 对于用户界面，返回一个更友好的提示
    return { code: 500, message: 'AI服务代理URL未配置，请检查环境变量设置或联系管理员。' };
  }

  // content 是必需的
  if (!content) {
    return { code: 400, message: '请求内容不能为空。' };
  }

  const requestBody = {
    api_key: api_key,     // 可选，Worker 有默认值
    base_url: base_url,   // 可选，Worker 有默认值
    model: model,         // 可选，Worker 有默认值
    prompt: prompt,       // 可选，Worker 有默认值
    content: content      // 必需
  };

  try {
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json(); // 总是尝试解析JSON

    if (!response.ok) {
      console.error('Cloudflare Worker 请求失败:', response.status, responseData);
      // 优先使用 Worker 返回的错误信息
      const message = responseData?.error?.message || responseData?.message || `AI服务请求失败，状态码: ${response.status}`;
      return { code: response.status, message };
    }

    // 兼容直接返回 content 的情况，以及 OpenAI SDK 风格的返回
    if (responseData.content) {
        return {
            code: 200,
            content: responseData.content,
        };
    } else if (responseData.choices && responseData.choices[0] && responseData.choices[0].message && responseData.choices[0].message.content) {
        return {
            code: 200,
            content: responseData.choices[0].message.content,
        };
    } else {
        console.error('Cloudflare Worker 返回数据格式不符合预期:', responseData);
        return { code: 500, message: 'AI服务返回数据格式不符合预期。' };
    }

  } catch (err) {
    console.error('调用 Cloudflare Worker 时发生网络错误:', err);
    // 对于网络错误等，提供通用提示
    return { code: 500, message: '调用AI服务失败，请检查网络连接或联系管理员。' };
  }
}


export default request;
