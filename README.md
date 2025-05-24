
# 文本查重与AI降重工具

## 项目简介

这是一款基于Vue 3和TypeScript开发的文本查重与AI降重工具，主要用于解析paperyy查重报告和AIGC检测报告，并支持用户自定义大模型及Prompt进行文本降重。该工具提供了友好的用户界面和高效的文本处理功能，旨在帮助用户快速有效地降低文本重复率。

**[前端在线体验地址](https://parap.lengsu.top/)**

## 主要功能特点

### 1. 多种查重报告支持
*   **论文降重功能**：支持上传paperyy查重报告（HTML格式），自动解析报告内容，清晰展示原文、相似源及修改建议。
*   **AIGC检测功能**：支持上传AIGC检测报告（HTML格式），分析文本由AI生成的可能性，辅助用户识别AI生成内容。

### 2. 智能AI降重
*   **一键降重**：针对检测出的高重复率文本，提供便捷的一键AI降重功能。
*   **实时结果展示**：降重后的文本即时显示，并提供复制功能，方便快捷。
*   **交互式预览**：通过悬浮卡片预览降重结果，点击即可查看详细的原文与降重后对比。

### 3. 高度自定义设置
*   **自定义API配置**：用户可配置自己的OpenAI API Key和API Base URL。
*   **灵活模型选择**：支持用户自由选择所需的大语言模型。
*   **个性化Prompt**：允许用户自定义降重提示词（Prompt），以达到更贴合需求的降重效果。
*   **本地AI降重选项**：可选择是否通过用户前端直接调用大模型进行降重处理（可能涉及跨域配置）。

### 4. 用户友好界面
*   **拖拽上传**：支持文件拖拽上传，简化操作流程。
*   **进度显示**：文件上传过程中提供实时进度条。
*   **响应式设计**：界面自适应不同设备的屏幕尺寸。
*   **现代UI**：采用现代化UI设计，界面美观、简洁、易用。

## 功能更新说明

### 文件解析方式变更
论文查重模块的文件解析功能已完全在用户的前端（浏览器）本地进行处理，实现毫秒级解析。这意味着您的文档数据**不会上传到任何服务器进行解析**，显著增强了数据隐私和安全性。

### AI 降重功能说明
Cloudflare Worker 服务现在仅作为调用大模型服务的中转。当用户在前端配置并启用AI降重（特别是“本地AI降重”未勾选时），请求会通过Cloudflare Worker。若启用“本地AI降重”，则由前端直接调用大模型API，此时用户需注意并处理可能出现的浏览器跨域问题。

原有的Python后端代码已不再更新和维护，项目当前主要依赖Cloudflare Worker进行AI服务的请求处理。

#### Cloudflare Worker 后备默认配置
（仅在用户未在前端「系统配置」中提供API Key、模型及Base URL时，由Cloudflare Worker使用以下后备配置）
*   `OPENAI_API_KEY`: `sk-xxxxxxxxxxx` (示例，实际部署时请替换)
*   `OPENAI_MODEL`: `Qwen/Qwen2.5-7B-Instruct`
*   `OPENAI_BASE_URL`: `https://api.siliconflow.cn`
*   `DEFAULT_PROMPT`: `You are a text paraphrasing assistant. Your task is to rewrite the text while maintaining the same meaning but using different expressions. Maintain professionalism and fluency while ensuring accuracy.`

## 技术细节
*   **前端:** Vue 3, TypeScript
*   **AI服务中转/后端:** Cloudflare Worker (取代已弃用的Python后端)
    *   原Python后端（[开源地址](https://github.com/lengsukq/ParaphrasingToolServer)）已停止维护。
*   **默认AI模型调用逻辑:** 若用户未在前端「系统配置」中进行有效配置，AI降重将尝试使用Cloudflare Worker的后备默认配置进行（详见上一节“Cloudflare Worker 后备默认配置”）。

## 使用说明

### 1. 系统配置
首次使用或需要更改AI服务时，请进行系统配置：
1.  点击界面右上角的「系统配置」按钮。
2.  在弹出的配置对话框中设置以下内容：
    *   **API Key**：输入您的OpenAI兼容API密钥。
    *   **Base URL**：输入API的基础URL。
        *   **重要**：如果**未勾选**「本地AI降重」，此URL通常需要包含API的完整路径，例如 `https://api.siliconflow.cn/v1/chat/completions`。请根据您使用的API服务商要求填写。
        *   如果**勾选**了「本地AI降重」，通常填写API服务商提供的基础域名即可，如 `https://api.openai.com` 或 `https://api.siliconflow.cn`。
    *   **Model**：选择您想使用的AI模型（如 `gpt-3.5-turbo`, `Qwen/Qwen2.5-7B-Instruct` 等）。
    *   **Prompt**：自定义降重提示词，用以指导AI如何改写文本。
    *   **本地AI降重**：
        *   勾选此项，将由您的浏览器直接向您配置的`Base URL`发起AI请求。**注意：** 这可能引发跨域（CORS）问题，您可能需要在您的AI服务代理或浏览器端进行相应配置以允许跨域请求。
        *   不勾选此项，请求将通过项目部署的Cloudflare Worker（或其他配置的后端代理）进行中转。
3.  点击「保存」按钮应用设置。

### 2. 上传查重报告
1.  在主界面选择「论文降重」或「AIGC检测」功能标签。
2.  将查重报告文件（目前仅支持HTML格式）拖拽到上传区域，或点击上传区域选择文件。
3.  系统会在您的浏览器本地快速解析报告内容，并在表格中显示结果。

### 3. 使用AI降重
1.  在解析结果表格中，找到需要降重的文本行。
2.  点击对应行右侧的「AI降重」按钮。
3.  系统将根据您的「系统配置」调用AI模型进行文本改写。
4.  降重完成后，可以点击「查看降重结果」按钮查看详细的原文与降重后文本对比。
5.  在降重结果对话框中，您可以复制降重后的文本。

## 注意事项
1.  若不使用Cloudflare Worker的后备默认配置进行AI降重，首次使用前，请务必在「系统配置」中设置正确的API信息。
2.  目前查重报告仅支持HTML格式文件上传。
3.  AI降重效果受所选模型、API质量及自定义Prompt内容直接影响，您可以通过调整Prompt来优化降重效果。
4.  使用任何基于OpenAI API规范的服务时，请确保您的网络环境能够正常访问目标API服务器。
5.  对于自行部署或开发者：请确保您已在项目根目录下的 `.env.local` 文件中正确配置了 `VITE_API_BASE_URL` 环境变量，使其指向您部署的Cloudflare Worker或其他AI服务代理的实际URL（此配置用于前端在未勾选“本地AI降重”时，知道将请求发往何处）。

## 技术支持与故障排查
如果在使用过程中遇到问题，请尝试检查以下几点：
1.  **API配置**：确认「系统配置」中的API Key、Base URL、模型是否正确无误（特别是Base URL的路径，根据是否启用“本地AI降重”有不同要求）。
2.  **网络连接**：检查您的网络连接是否通畅，能否访问所配置的AI服务地址。
3.  **报告格式**：确认上传的查重报告为HTML格式。
4.  **Prompt与模型**：尝试调整Prompt或更换AI模型，观察效果是否有改善。
5.  **浏览器控制台**：打开浏览器的开发者工具（通常按F12），查看「控制台」(Console) 或「网络」(Network) 标签页中的错误信息，这对于诊断跨域问题或API请求失败尤为重要。

---

本工具旨在帮助用户提高文本原创性，请遵循学术诚信原则，合理使用AI降重功能。
