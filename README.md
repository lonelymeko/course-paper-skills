# 课程论文交付 Skills

这是一组面向中文用户的 Codex skills 和脚本，用来把“论文要求/提示词/Word 模板”整理成可交付的课程论文工作流：

- 根据课程论文要求和 Word 模板生成中文论文终稿；
- 使用真实来源做参考文献和正文引用；
- 按学校模板生成 DOCX；
- 在用户授权登录后调用真实国内查重 / AIGC 检测平台；
- 保存官方报告、报告 ID、检测率和原始响应；
- 严格禁止伪造查重率、AIGC 率、报告编号或报告文件。

本仓库只包含可复用的 skills 和自动化脚本，不包含任何用户论文、学校模板、检测报告、二维码登录记录、token、cookie 或私人作业材料。

## 包含哪些 Skills

```text
skills/
  course-paper-final-delivery/
    SKILL.md
    scripts/collect_artifacts.js
  course-paper-zh/
    SKILL.md
  domestic-paper-detection/
    SKILL.md
    scripts/open_qr.js
    scripts/xyzscience_flow.js
    scripts/paperpass_qr_playwright.js
    scripts/paperpass_upload_parse.py
    scripts/paperpass_restore_playwright.js
    scripts/paperpass_submit_from_profile.js
```

用途概览：

- `course-paper-final-delivery`：总控流程，从论文要求到最终稿、查重报告、AIGC 报告和产物索引。
- `course-paper-zh`：中文课程论文写作、真实参考文献、正文引用、模板格式化。
- `domestic-paper-detection`：国内检测平台流程，包括 PaperPass、XYZ SCIENCE、知网、万方等真实检测边界。

## 安装到 Codex

如果你的 Codex home 不是默认的 `~/.codex`，先设置 `CODEX_HOME`：

```bash
export CODEX_HOME="$HOME/.codex"
```

然后执行：

```bash
./scripts/install.sh
```

安装脚本会把三个 skill 复制到：

```text
$CODEX_HOME/skills/
```

## 依赖

基础依赖：

- Node.js 18+
- Python 3.10+
- `curl`

PaperPass 浏览器登录相关：

- `playwright` npm 包
- Playwright Chromium
- `sqlite3` 命令行工具，用于读取 Playwright Chromium profile 里的 Cookie

PaperPass 上传解析脚本：

- Python `requests`

推荐初始化：

```bash
npm install
python3 -m pip install requests
npx playwright install chromium
```

如果你在国内网络环境下需要代理，脚本会读取这些环境变量：

```bash
export https_proxy=http://127.0.0.1:7897
export http_proxy=http://127.0.0.1:7897
export all_proxy=socks5://127.0.0.1:7897
```

## 快速使用

### 1. 跨平台打开二维码

```bash
node skills/domestic-paper-detection/scripts/open_qr.js \
  "https://example.com/login-qrcode.jpg" \
  --out /tmp/login-qrcode.jpg
```

脚本会自动根据系统打开二维码：

- macOS：`open`
- Linux：`xdg-open`
- Windows：`Start-Process`

### 2. XYZ SCIENCE 全文 AIGC 检测

```bash
node skills/domestic-paper-detection/scripts/xyzscience_flow.js \
  --mode login-detect \
  --run-dir ./runs/xyzscience-demo \
  --file ./final-paper.docx \
  --title "课程论文题目"
```

流程：

1. 调用官方二维码登录接口；
2. 下载并打开二维码图片；
3. 用户扫码后轮询官方登录状态；
4. 上传 DOCX 到官方全文检测接口；
5. 轮询检测任务状态；
6. 如果官方返回 `ossUrl`，下载 PDF 报告。

### 3. XYZ SCIENCE 段落降 AIGC 改写

```bash
node skills/domestic-paper-detection/scripts/xyzscience_flow.js \
  --mode login-rewrite \
  --run-dir ./runs/xyzscience-demo \
  --text-file ./paragraph.txt
```

注意：改写结果只能作为编辑参考。使用前必须人工检查语义、事实、引用和学术表达，不能机械替换整篇论文。

### 4. PaperPass 上传和解析

```bash
python3 skills/domestic-paper-detection/scripts/paperpass_upload_parse.py \
  --file ./final-paper.docx \
  --out-dir ./runs
```

这个脚本只执行 PaperPass 官方匿名上传 / 解析阶段并保存原始响应。它不会绕过登录、腾讯验证码、付费或次数限制。

### 5. PaperPass 二维码 / 浏览器登录

```bash
node skills/domestic-paper-detection/scripts/paperpass_qr_playwright.js \
  --run-dir ./runs/paperpass-YYYYMMDD-HHMMSS
```

这个脚本会：

1. 用 Playwright Chromium 打开 PaperPass 官方登录页；
2. 截取二维码或登录区域；
3. 弹出二维码图片给用户扫码；
4. 轮询浏览器登录状态；
5. 保留 Playwright Chromium profile，供后续读取 Cookie 调用官方接口。

### 6. PaperPass 登录态提交

```bash
node skills/domestic-paper-detection/scripts/paperpass_submit_from_profile.js \
  --run-dir ./runs/paperpass-YYYYMMDD-HHMMSS \
  --title "课程论文题目" \
  --author "作者姓名"
```

如果 PaperPass 返回验证码、付费、次数不足或其他限制，脚本会停止并保存官方响应，不会绕过平台限制。

### 7. 汇总最终产物位置

```bash
node skills/course-paper-final-delivery/scripts/collect_artifacts.js \
  --project ./paper-project \
  --final-docx ./paper-project/final.docx \
  --similarity-report ./paper-project/reports/similarity.pdf \
  --aigc-report ./paper-project/reports/aigc.pdf \
  --detection-summary ./paper-project/detection_summary.md
```

输出 `final_artifacts_summary.md`，方便最终回复用户时列出论文和报告位置。

## 推荐完整流程

1. 用户提供课程论文要求 PDF、Word 模板、题目或提示词。
2. 使用 `course-paper-final-delivery` 作为总控 skill。
3. 用 `course-paper-zh` 读取要求、收集真实参考文献、写正文和格式化 DOCX。
4. 用 `domestic-paper-detection` 调用真实检测平台。
5. 如果报告显示问题，进行合法修订：补充来源、加强个人分析、减少模板化表达。
6. 需要新结果时再次调用真实检测平台。
7. 用 `collect_artifacts.js` 汇总最终稿和报告路径。

## 安全和学术诚信边界

必须遵守：

- 不提交 `runs/`、登录响应、Cookie、二维码会话、检测报告、论文草稿。
- 不伪造查重率、AIGC 率、报告编号、报告 URL。
- 不绕过验证码、付费、短信、二维码登录或反爬机制。
- 只报告官方响应里真实存在的数据。
- 降 AIGC / 改写只能作为编辑辅助，不能破坏事实、引用和论文含义。

## 本仓库故意不包含

- 用户论文、学校模板、课程要求原件；
- 真实检测报告；
- token、cookie、二维码登录状态；
- 任何第三方平台付费账号凭据；
- 可识别个人身份的作业信息。

## License

MIT，见 [LICENSE](LICENSE)。
