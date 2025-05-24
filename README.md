## 功能更新说明

### 文件解析方式变更

论文查重模块的文件解析功能现在完全在用户的前端（浏览器）本地进行处理。这意味着您的文档数据不会上传到任何服务器进行解析，增强了数据隐私和安全性。

### AI 降重功能说明

AI 降重功能通过一个 Cloudflare Worker 代理进行请求。这意味着：

- **数据流向**：当您使用 AI 降重功能时，您的文本内容会发送到我们部署的 Cloudflare Worker。该 Worker 随后会根据配置（您在应用内设置的 API Key、Base URL、Model 等，或 Worker 中配置的默认值）向相应的 AI 服务提供商（例如 SiliconFlow 或其他 OpenAI 兼容的 API）发起请求。
- **本地 AI 降重选项**：即使您在应用界面中勾选了“本地 AI 降重”或类似的选项，请求**仍然会通过 Cloudflare Worker**。此时，Worker 会使用您在应用中配置的本地参数（如果提供）或其内置的默认参数来请求 AI 服务。这确保了请求的统一处理和跨域问题的解决。
- **配置灵活性**：您可以在应用中配置自己的 OpenAI API Key、Base URL 和模型。如果未提供这些配置，系统将使用 Cloudflare Worker 中预设的默认值进行请求。

**Cloudflare Worker 默认配置（仅在前端未提供相应配置时使用）：**

-   `OPENAI_API_KEY`: `sk-nohwayoqctuijqcxmfhpmauuavpwskqxjnwmavxsdokqiqft`
-   `OPENAI_MODEL`: `Qwen/Qwen2.5-7B-Instruct`
-   `OPENAI_BASE_URL`: `https://api.siliconflow.cn`
-   `DEFAULT_PROMPT`: `You are a text paraphrasing assistant. Your task is to rewrite the text while maintaining the same meaning but using different expressions. Maintain professionalism and fluency while ensuring accuracy.`

请确保您已在项目根目录下的 `.env.local` 文件中正确配置了 `VITE_API_BASE_URL` 环境变量，使其指向您部署的 Cloudflare Worker 或其他 AI 服务代理的实际 URL。
