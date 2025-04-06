/**
 * 封装的HTTP请求工具
 */

// 默认配置
const DEFAULT_CONFIG = {
  baseURL: '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
};

// 请求拦截器
const requestInterceptors = [];

// 响应拦截器
const responseInterceptors = [];

// 错误重试配置
const RETRY_CONFIG = {
  maxRetries: 2,
  retryDelay: 1000
};

/**
 * 超时控制函数
 */
const timeoutPromise = (timeout) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeout);
  });
};

/**
 * 请求重试函数
 */
const retryRequest = async (fetchPromise, retryCount = 0) => {
  try {
    return await fetchPromise();
  } catch (error) {
    if (retryCount < RETRY_CONFIG.maxRetries) {
      await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.retryDelay));
      return retryRequest(fetchPromise, retryCount + 1);
    }
    throw error;
  }
};

/**
 * HTTP请求类
 */
class HttpClient {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 添加请求拦截器
   */
  addRequestInterceptor(interceptor) {
    requestInterceptors.push(interceptor);
  }

  /**
   * 添加响应拦截器
   */
  addResponseInterceptor(interceptor) {
    responseInterceptors.push(interceptor);
  }

  /**
   * 处理请求配置
   */
  async processRequestConfig(config) {
    let processedConfig = { ...config };
    for (const interceptor of requestInterceptors) {
      processedConfig = await interceptor(processedConfig);
    }
    return processedConfig;
  }

  /**
   * 处理响应数据
   */
  async processResponse(response) {
    let processedResponse = response;
    for (const interceptor of responseInterceptors) {
      processedResponse = await interceptor(processedResponse);
    }
    return processedResponse;
  }

  /**
   * 发送请求
   */
  async request(url, config = {}) {
    const finalConfig = await this.processRequestConfig({
      ...this.config,
      ...config,
      url: this.config.baseURL + url
    });

    const fetchPromise = () => {
      return Promise.race([
        fetch(finalConfig.url, finalConfig),
        timeoutPromise(finalConfig.timeout)
      ]);
    };

    try {
      const response = await retryRequest(fetchPromise);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return this.processResponse(data);
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  // GET请求
  get(url, config = {}) {
    return this.request(url, { ...config, method: 'GET' });
  }

  // POST请求
  post(url, data, config = {}) {
    return this.request(url, {
      ...config,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // PUT请求
  put(url, data, config = {}) {
    return this.request(url, {
      ...config,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // DELETE请求
  delete(url, config = {}) {
    return this.request(url, { ...config, method: 'DELETE' });
  }
}

// 创建默认实例
const http = new HttpClient();

export default http;
export { HttpClient };