# 课程论文交付 Skills

这是一组面向中文用户的 Codex skills 和脚本，用来把“课程论文要求 / 用户提示词 / Word 模板”整理成可交付的课程论文工作流。

它的目标很明确：AI 负责跑完整流程，用户只在必须本人授权的地方介入。

## 你只需要做什么

1. 提供论文要求、Word 模板、题目或写作提示。
2. 提供完整个人和学校信息：姓名、学号、学校、学院、专业、班级、课程名、指导老师/任课老师。
3. 尽量提供本校论文模板 DOCX 和课程论文要求文件，方便 AI 按学校格式排版。
4. 提供最终稿 DOCX 的保存位置，或让 AI 生成并格式化 DOCX。
5. 如果检测平台要求登录，扫描 AI 弹出的二维码。
6. 如果平台出现腾讯验证码、短信、付费、次数确认等官方限制，自己在官方页面完成。
7. 最后检查 AI 输出的最终稿、查重报告、AIGC 报告和汇总文件。

## AI 负责做什么

1. 读取课程要求和 Word 模板，整理格式约束。
2. 检索真实来源，写作、修订、引用和排版课程论文。
3. 调用真实检测平台，不伪造查重率、AIGC 率、报告编号或报告文件。
4. 保存二维码、原始响应、官方 PDF/ZIP 报告和检测汇总。
5. 对 PaperPass 离线 ZIP 自动提取查重 PDF 和 AIGC PDF。
6. 把最终稿、报告和汇总集中放到项目目录。

AI 不会、也不应该做这些事：

- 绕过二维码登录、验证码、短信、付费、次数限制或反爬机制；
- 把处理中状态的 `Score=0` / `AiScore=0` 当成最终结果；
- 伪造检测平台报告、百分比、报告 ID 或参考文献；
- 在缺少真实姓名时提交 PaperPass 检测，因为官方报告会显示作者字段；
- 保存或提交用户论文、报告、Cookie、二维码会话、token 到本仓库。

## 检测前必填信息

正式写作、排版和检测前，建议先让 AI 建立项目信息表。至少准备：

| 字段 | 用途 | 是否必填 |
| --- | --- | --- |
| 姓名 | Word 封面、PaperPass 作者字段 | 必填 |
| 学号 | Word 封面、学校归档 | 必填 |
| 学校 | Word 封面、模板格式 | 必填 |
| 学院 | Word 封面、模板格式 | 必填 |
| 专业 | Word 封面、模板格式 | 建议 |
| 班级 | Word 封面、模板格式 | 必填 |
| 课程名称 | 论文封面和标题页 | 必填 |
| 指导老师/任课老师 | 论文封面和标题页 | 必填 |
| 论文题目 | DOCX 标题、检测标题 | 必填 |
| 学校论文模板 DOCX | 格式、封面、页眉页脚 | 强烈建议 |
| 课程论文要求 PDF/DOCX | 字数、结构、评分要求 | 强烈建议 |

可直接让 AI 先运行：

```bash
python3 skills/course-paper-final-delivery/scripts/write_project_brief.py \
  --project ./paper-project \
  --name "姓名" \
  --student-id "学号" \
  --school "学校" \
  --college "学院" \
  --major "专业" \
  --class-name "班级" \
  --course "课程名称" \
  --instructor "指导老师或任课老师" \
  --title "论文题目" \
  --template "./学校论文模板.docx" \
  --requirements "./课程论文要求.pdf"
```

这个脚本会生成 `project_brief.json` 和 `project_brief.md`。如果必填字段缺失，默认会拒绝继续，避免最终报告里出现“作者：待填写”。

推荐用户提示词：

```text
请使用 course-paper-final-delivery 完成我的课程论文。我的信息如下：
姓名：...
学号：...
学校：...
学院：...
专业：...
班级：...
课程名称：...
指导老师/任课老师：...
论文题目：...
学校论文模板：/path/to/template.docx
论文要求文件：/path/to/requirements.pdf
项目目录：/path/to/project

请先建立 project_brief，确认信息完整后再写作、排版和提交检测。
```

## 实跑体验和已优化点

这套 skills 已经过一次真实课程论文流程验证，体验结论如下：

- XYZSCIENCE 的二维码登录和 DOCX 全文 AIGC 检测流程比较顺，扫码后可以自动轮询任务并下载官方 PDF。
- PaperPass 能完成上传解析、二维码登录、登录态提交、官方报告列表轮询和离线报告下载，但中间存在腾讯验证码等必须用户手动完成的环节。
- PaperPass 下载的官方 ZIP 内部文件名可能是 GBK 编码，系统 `unzip` 在部分 macOS 环境会乱码或报错；现在已加入 `package_detection_results.py` 自动恢复文件名并提取两个 PDF。
- 最早的流程需要手工复制 PDF、ZIP 和写检测汇总；现在已加入一键打包脚本，AI 在收尾时可以自动生成中文汇总和最终产物索引。

## 包含哪些 Skills

```text
skills/
  course-paper-final-delivery/
    SKILL.md
    scripts/collect_artifacts.js
    scripts/package_detection_results.py
    scripts/write_project_brief.py
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
    scripts/paperpass_poll_download.js
```

用途概览：

- `course-paper-final-delivery`：总控流程，从论文要求到最终稿、查重报告、AIGC 报告和产物索引。
- `course-paper-zh`：中文课程论文写作、真实参考文献、正文引用、模板格式化。
- `domestic-paper-detection`：国内检测平台流程，包括 PaperPass、XYZSCIENCE、知网、万方等真实检测边界。

## 安装

如果你的 Codex home 不是默认的 `~/.codex`，先设置：

```bash
export CODEX_HOME="$HOME/.codex"
```

安装 skills：

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
- `sqlite3`

PaperPass 浏览器登录相关：

- `playwright` npm 包
- Playwright Chromium

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

## 推荐完整流程

### 1. 建立项目信息表

用户给 AI：

- 课程论文要求 PDF；
- Word 模板；
- 姓名、学号、学校、学院、专业、班级、课程名、指导老师/任课老师、论文题目；
- 目标项目目录。

先运行：

```bash
python3 skills/course-paper-final-delivery/scripts/write_project_brief.py \
  --project ./paper-project \
  --name "姓名" \
  --student-id "学号" \
  --school "学校" \
  --college "学院" \
  --major "专业" \
  --class-name "班级" \
  --course "课程名称" \
  --instructor "指导老师或任课老师" \
  --title "论文题目" \
  --template "./学校论文模板.docx" \
  --requirements "./课程论文要求.pdf"
```

这一步应该在最终 DOCX 排版和 PaperPass 提交前完成。

### 2. 生成或确认最终稿

AI 使用 `course-paper-final-delivery` 和 `course-paper-zh` 完成：

- 需求提取；
- 真实参考文献检索和核验；
- 正文写作和引用；
- DOCX 模板格式化和封面信息填写；
- 最终稿路径整理。

### 3. XYZSCIENCE 全文 AIGC 检测

```bash
node skills/domestic-paper-detection/scripts/xyzscience_flow.js \
  --mode login-detect \
  --run-dir ./runs/xyzscience-demo \
  --file ./final-paper.docx \
  --title "课程论文题目"
```

用户只需要扫码。AI 会：

1. 调用官方二维码登录接口；
2. 下载并弹出二维码；
3. 轮询官方登录状态；
4. 上传 DOCX 到官方全文检测接口；
5. 轮询检测任务；
6. 下载官方 PDF 报告。

### 4. PaperPass 查重和 AIGC 检测

先上传解析：

```bash
python3 skills/domestic-paper-detection/scripts/paperpass_upload_parse.py \
  --file ./final-paper.docx \
  --out-dir ./runs
```

再打开 PaperPass 登录二维码：

```bash
node skills/domestic-paper-detection/scripts/paperpass_qr_playwright.js \
  --run-dir ./runs/paperpass-login
```

用户扫码登录后，AI 可以恢复上传状态：

```bash
node skills/domestic-paper-detection/scripts/paperpass_restore_playwright.js \
  --run-dir ./runs/paperpass-YYYYMMDD-HHMMSS \
  --profile-dir ./runs/paperpass-login/playwright-chromium-profile \
  --title "课程论文题目" \
  --author "真实姓名"
```

`--author` 必须是真实姓名；脚本默认拒绝 `待填写`、`待填充`、`Unknown` 等占位值，避免官方报告作者字段错误。

如果 PaperPass 要求腾讯验证码，用户需要在 Playwright Chromium 窗口手动完成。完成提交后，AI 轮询并下载官方报告：

```bash
node skills/domestic-paper-detection/scripts/paperpass_poll_download.js \
  --run-dir ./runs/paperpass-YYYYMMDD-HHMMSS \
  --profile-dir ./runs/paperpass-login/playwright-chromium-profile \
  --file-name "PaperPass报告列表里的FileName"
```

### 5. 打包最终交付文件

检测完成后推荐运行：

```bash
python3 skills/course-paper-final-delivery/scripts/package_detection_results.py \
  --project ./paper-project \
  --final-docx ./paper-project/final.docx \
  --paperpass-run-dir ./runs/paperpass-YYYYMMDD-HHMMSS \
  --xyzscience-run-dir ./runs/xyzscience-demo \
  --date YYYYMMDD
```

它会在项目目录生成：

- `PaperPass_查重报告_YYYYMMDD.pdf`
- `PaperPass_AIGC检测报告_YYYYMMDD.pdf`
- `PaperPass_官方离线报告_YYYYMMDD.zip`
- `XYZSCIENCE_AIGC报告_YYYYMMDD.pdf`
- `检测报告汇总_YYYYMMDD.md`
- `final_artifacts_summary.md`

## 单独工具说明

### 跨平台打开二维码

```bash
node skills/domestic-paper-detection/scripts/open_qr.js \
  "https://example.com/login-qrcode.jpg" \
  --out /tmp/login-qrcode.jpg
```

脚本会自动根据系统打开二维码：

- macOS：`open`
- Linux：`xdg-open`
- Windows：`Start-Process`

### XYZSCIENCE 段落改写

```bash
node skills/domestic-paper-detection/scripts/xyzscience_flow.js \
  --mode login-rewrite \
  --run-dir ./runs/xyzscience-demo \
  --text-file ./paragraph.txt
```

改写结果只能作为编辑参考。使用前必须人工检查语义、事实、引用和学术表达，不能机械替换整篇论文。

### 传统最终索引

```bash
node skills/course-paper-final-delivery/scripts/collect_artifacts.js \
  --project ./paper-project \
  --final-docx ./paper-project/final.docx \
  --similarity-report ./paper-project/reports/similarity.pdf \
  --aigc-report ./paper-project/reports/aigc.pdf \
  --detection-summary ./paper-project/detection_summary.md
```

如果已有全部报告路径，只需要生成一个简单索引，可以用这个脚本。

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

## 致谢

感谢 PaperPass 提供论文相似度检测、AIGC 检测和离线报告下载能力。本仓库只在用户授权登录后调用其官方页面和接口，不绕过平台限制。

感谢 XYZSCIENCE 提供 AIGC 检测、二维码登录、全文报告和段落改写能力。本仓库只保存官方返回的报告与响应，不伪造或替代平台结论。

PaperPass、XYZSCIENCE 及其相关商标、服务名称归各自公司或权利人所有。本项目与上述平台没有官方合作或背书关系。

## License

MIT，见 [LICENSE](LICENSE)。
