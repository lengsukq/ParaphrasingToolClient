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

export default request;
