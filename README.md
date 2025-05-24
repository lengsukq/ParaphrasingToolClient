# 文本查重与AI降重工具 

## 项目简介 

这是一个基于Vue 3和TypeScript开发的文本查重与AI降重工具，主要用于上传paperyy查重报告和AIGC查重报告，并支持用户自定义大模型和prompt进行文本降重。该工具提供了友好的用户界面和高效的文本处理功能，帮助用户快速降低文本的重复率。 

**前端在线体验地址是 `https://parap.lengsu.top/` 。** 

## 主要功能特点 

### 1. 多种查重报告支持 

-   **论文降重功能**：支持上传paperyy查重报告，自动解析报告内容，展示原文、相似源和修改建议 
-   **AIGC检测功能**：支持上传AIGC查重报告，分析AI生成内容的可能性，帮助用户识别AI生成的文本 

### 2. 智能AI降重 

-   **一键降重**：对检测出的高重复率文本，提供一键AI降重功能 
-   **实时结果展示**：降重后的文本会立即显示，并提供复制功能 
-   **交互式界面**：通过悬浮卡片预览降重结果，点击查看详情 

### 3. 高度自定义设置 

-   **自定义API配置**：支持配置OpenAI API Key和Base URL 
-   **模型选择**：可自由选择使用的大模型 
-   **自定义Prompt**：支持用户自定义降重提示词，实现个性化降重效果 
-   **本地AI降重选项**：可选择是否使用本地AI进行降重处理 

### 4. 用户友好界面 

-   **拖拽上传**：支持文件拖拽上传，操作简便 
-   **进度显示**：上传过程中显示进度条 
-   **响应式设计**：适配不同设备屏幕大小 
-   **现代UI**：采用现代化UI设计，界面美观简洁 

## 功能更新说明

### 文件解析方式变更

论文查重模块的文件解析功能现在完全在用户的前端（浏览器）本地进行处理，实现毫秒级解析。这意味着您的文档数据不会上传到任何服务器进行解析，增强了数据隐私和安全性。

### AI 降重功能说明

Cloudflare Worker 服务现在仅作为调用大模型服务的中转。当启用本地 AI 降重后，将由前端直接调用大模型，不过可能会遇到跨域问题，请提前做好相关配置。

Python 后端代码已不再更新，项目主要依赖 Cloudflare Worker 进行 AI 服务的请求处理。

#### Cloudflare Worker 默认配置（仅在前端未提供相应配置时使用）：

-   `OPENAI_API_KEY`: `sk-xxxxxxxxxxx`
-   `OPENAI_MODEL`: `Qwen/Qwen2.5-7B-Instruct`
-   `OPENAI_BASE_URL`: `https://api.siliconflow.cn`
-   `DEFAULT_PROMPT`: `You are a text paraphrasing assistant. Your task is to rewrite the text while maintaining the same meaning but using different expressions. Maintain professionalism and fluency while ensuring accuracy.`

## 技术细节 

*   **前端:** Vue 3, TypeScript 
*   **后端:** Python (开源地址: `https://github.com/lengsukq/ParaphrasingToolServer` ) ，已弃用不再更新，改用 Cloudflare Worker。
*   **后端说明:** 原 Python 后端因为是个人维护的，随时可能失效，现已不再维护。 
*   **默认模型:**  如果未在系统配置中配置大模型参数，后端将默认使用 Qwen-7B 模型进行文本处理。 

## 使用说明 

### 1. 系统配置 

1.  点击界面右上角的「系统配置」按钮 
2.  在弹出的配置对话框中设置以下内容： 
     -   **API Key**：输入您的OpenAI API密钥 
     -   **Base URL**：输入API的基础URL。如果未勾选「本地AI降重」，请填写完整的 `/v1/chat/completions` 路径，例如 `https://api.siliconflow.cn/v1/chat/completions`。（可使用官方URL或自定义代理） 
     -   **Model**：选择您想使用的AI模型（如gpt-3.5-turbo、gpt-4等） 
     -   **Prompt**：自定义降重提示词，指导AI如何改写文本 
     -   **本地AI降重**：勾选是否使用本地AI进行降重，启用后可能会遇到跨域问题，请提前做好相关配置。
3.  点击「保存」按钮应用设置 

### 2. 上传查重报告 

1.  在主界面选择「论文降重」或「AIGC检测」功能标签 
2.  将查重报告文件（HTML格式）拖拽到上传区域，或点击「点击上传」按钮选择文件 
3.  系统会自动在前端进行毫秒级解析报告内容并在表格中显示结果 

### 3. 使用AI降重 

1.  在解析结果表格中，找到需要降重的文本行 
2.  点击对应行的「AI降重」按钮 
3.  系统会调用配置的AI模型进行文本改写 
4.  降重完成后，可以点击「查看降重结果」按钮查看详情 
5.  在降重结果对话框中，可以查看原文和降重后的文本，并可以复制降重结果 

## 注意事项 

1.  首次使用前，请务必在「系统配置」中设置正确的API信息 (如果需要使用非默认模型)。 
2.  目前仅支持上传HTML格式的查重报告 
3.  AI降重效果受到所选模型和自定义prompt的影响，可以通过调整prompt来优化降重效果 
4.  使用OpenAI API需要确保网络环境能够正常访问API服务器 
5.  请确保您已在项目根目录下的 `.env.local` 文件中正确配置了 `VITE_API_BASE_URL` 环境变量，使其指向您部署的 Cloudflare Worker 或其他 AI 服务代理的实际 URL。
6.  启用本地 AI 降重时，可能会遇到跨域问题，请提前做好相关配置。
7.  若未勾选「本地AI降重」，请确保 `Base URL` 填写完整，包含 `/v1/chat/completions` 路径。

## 技术支持 

如果在使用过程中遇到问题，请检查以下几点： 

1.  确认API Key是否正确设置 (如果使用非默认模型)。 
2.  检查网络连接是否正常 
3.  确认上传的报告格式是否正确 
4.  尝试调整prompt或更换模型 
5.  查看错误日志以获取更多信息（可能存在跨域问题，特别是启用本地 AI 降重时） 

--- 

本工具旨在帮助用户提高文本原创性，请遵循学术诚信原则，合理使用AI降重功能。
