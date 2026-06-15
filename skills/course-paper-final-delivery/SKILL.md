---
name: course-paper-final-delivery
description: "Use when the user wants an end-to-end Chinese course paper from a prompt or assignment files through final DOCX/PDF, real references, Word template formatting, real plagiarism/similarity report, real AIGC report, optional legitimate revision, and a final artifact location summary."
---

# Course Paper Final Delivery

Use this as the coordinator skill for “从提示词/论文要求到最终稿+查重报告+AIGC报告”.

## Required Companion Skills

- `course-paper-zh` for requirements extraction, real references, drafting, revision, and academic integrity.
- `documents` for DOCX creation/formatting/render verification.
- `domestic-paper-detection` for real PaperPass, XYZ SCIENCE, CNKI, Wanfang, or other mainland detector workflows.

## Integrity Rules

- Never fabricate references, report IDs, similarity rates, AIGC rates, teacher feedback, or submission status.
- Use only official detector responses for report values.
- Do not bypass QR login, captcha, payment, quota, SMS, or anti-bot controls.
- Revisions after detection must improve originality legitimately: better source attribution, clearer own analysis, less formulaic prose, and removal of accidental patchwriting.

## Input Contract

Treat the user’s prompt as the project brief. Extract these fields from the prompt/files; ask only when missing data blocks execution:

- Assignment requirement file and Word template path.
- Topic, course, school, college, major, class, student name, student ID, instructor/teacher, word count, required sections, citation style, and deadline.
- Detector preference: school platform, PaperPass, XYZ SCIENCE, CNKI, Wanfang, or other.
- Proxy exports and login preferences.

Before final DOCX formatting and before any detector submission, collect the required personal/school metadata. Do not submit to PaperPass with `待填写`, `待填充`, `Unknown`, or any placeholder author because the official report will show that author. If the user refuses or cannot provide required metadata, stop before detector submission and state exactly what is missing.

## Delivery Workflow

1. **Create project folder**
   - Put manuscript, sources, scripts, and reports in one folder.
   - Use `domestic_detection/runs/<service>-<timestamp>/` for detector evidence.

2. **Collect metadata and template**
   - Ask for or extract: name, student ID, school, college, class, course, instructor, paper title, school template path, and assignment requirement path.
   - Prefer `write_project_brief.py` to save `project_brief.json` and `project_brief.md`.
   - If the school has a required DOCX template, ask for it and use it; do not guess school formatting from memory.

3. **Read requirements and template**
   - Extract assignment constraints from PDF/DOCX.
   - Inspect the Word template structure and required front matter.

4. **Research and reference audit**
   - Use real sources only: DOI pages, official standards/specs, publisher pages, government/international organization reports.
   - Save source notes and ensure every bibliography item is cited in text.

5. **Draft and revise**
   - Produce source-aware Chinese prose with body citations.
   - Include the paper’s own scenario design, analysis, limitations, and conclusions.
   - Remove generic filler and repeated sentence patterns before detection.

6. **Format final manuscript**
   - Generate DOCX following the school template.
   - Fill the cover/front matter with the collected personal/school metadata before detection.
   - Preserve the school template source file. Use it as an input only; write a new output DOCX.
   - When a template has a fixed cover, keep its cover skeleton and only replace form fields. Do not redesign the cover unless explicitly requested.
   - If the manuscript DOCX came from fragile OOXML generation and LibreOffice/Word cannot open it, rebuild the body with a standard DOCX API while still using the school template as the base.
   - Check assignment figure constraints. For requirements like “插图不得多于 6 张，自绘插图不得少于 2 张”, create or insert traceable self-drawn system/process diagrams and make captions include `（自绘）`.
   - Render/visual-QA with Documents skill if LibreOffice/soffice is available; otherwise do structural DOCX checks and disclose the render gap.

7. **Run real detection**
   - Use `domestic-paper-detection`.
   - For PaperPass, pass the real student name as `--author`; do not use placeholder authors except for intentional local tests with `--allow-placeholder-author`.
   - For QR login, save QR image, open it cross-platform, and poll official status:
     - macOS: `open <image>`
     - Linux: `xdg-open <image>`
     - Windows: `Start-Process <image>`
   - Save official raw JSON/HTML/PDF/ZIP reports.

8. **Optional legitimate reduction/revision**
   - If AIGC/similarity is too high and an official report identifies problem areas, revise those areas substantively.
   - If using an official rewrite API, save payload and response; manually review and integrate only if the result preserves meaning, citations, and academic tone.
   - Re-run official detection if the user needs a new final rate.

9. **Final report**
   - Link final DOCX/PDF.
   - Link similarity/plagiarism report.
   - Link AIGC report.
   - State official rates/report IDs and exact source files.
   - State blockers or QA gaps plainly.
   - Prefer `package_detection_results.py` to copy official PDFs/ZIPs into the project root and generate `检测报告汇总_<date>.md` plus `final_artifacts_summary.md`.
   - If the teacher specifies submission names, create a separate submission folder and ZIP without renaming source evidence. Example:
     - DOCX: `<班级>-<姓名>-<论文题目>.docx`
     - Similarity report: `<班级>-<姓名>-<论文题目>-查重报告.pdf`
     - ZIP: `<班级>-<姓名>-物联网期末论文.zip`

## Bundled Scripts

Use the helper script to create a final artifact index after manuscript/report generation:

Use this before drafting/formatting when starting a project:

```bash
python3 skills/course-paper-final-delivery/scripts/write_project_brief.py \
  --project <project-dir> \
  --name "<姓名>" \
  --student-id "<学号>" \
  --school "<学校>" \
  --college "<学院>" \
  --class-name "<班级>" \
  --course "<课程名称>" \
  --instructor "<指导老师/任课老师>" \
  --title "<论文题目>" \
  --template "<学校论文模板.docx>" \
  --requirements "<论文要求.pdf>"
```

```bash
node skills/course-paper-final-delivery/scripts/collect_artifacts.js \
  --project <project-dir> \
  --final-docx <final.docx> \
  --similarity-report <similarity-report.pdf> \
  --aigc-report <aigc-report.pdf> \
  --extra-aigc-report <optional-second-aigc-report.pdf> \
  --detection-summary <summary.md> \
  --out <project-dir>/final_artifacts_summary.md
```

Prefer this packaging script when detector run directories are available:

```bash
python3 skills/course-paper-final-delivery/scripts/package_detection_results.py \
  --project <project-dir> \
  --final-docx <final.docx> \
  --paperpass-run-dir <paperpass-run-dir> \
  --xyzscience-run-dir <xyzscience-run-dir> \
  --date YYYYMMDD
```

It copies the official PaperPass ZIP, extracts the PaperPass similarity/AIGC PDFs using GBK filename recovery, copies the XYZSCIENCE PDF, and writes Chinese delivery summaries. It must not invent missing detector values; if a platform did not return a report, state that plainly.

Use these when a paper needs self-drawn diagrams or a standard DOCX rebuild:

```bash
node skills/course-paper-final-delivery/scripts/generate_self_drawn_figures.js \
  --out-dir <project-dir>/self_drawn_figures

python3 skills/course-paper-final-delivery/scripts/add_self_drawn_figures.py \
  --input <draft.docx> \
  --output <draft-with-figures.docx> \
  --figure-dir <project-dir>/self_drawn_figures
```

Use the template rebuild script when the source manuscript opens poorly in Word/LibreOffice or the school template must be applied after figure insertion:

```bash
COURSE_PAPER_PYTHON_DEPS=/path/to/python-docx-deps \
python3 skills/course-paper-final-delivery/scripts/rebuild_final_with_python_docx.py \
  --template <school-template.docx> \
  --source <draft-with-figures.docx> \
  --fig-dir <project-dir>/self_drawn_figures \
  --out <final.docx>
```

The rebuild script uses the school template as a base, preserves the template source file, fills known cover fields, removes template instructions/example text from the output, rebuilds the body with standard Word parts, and inserts two self-drawn PNG diagrams.

Use this to create teacher-ready submission copies:

```bash
python3 skills/course-paper-final-delivery/scripts/package_submission_zip.py \
  --project <project-dir> \
  --class-name "23-5" \
  --name "张三" \
  --title "论文题目" \
  --docx <final.docx> \
  --similarity-report <查重报告.pdf> \
  --aigc-report <AIGC报告.pdf> \
  --course-zip-title "物联网期末论文"
```

## Final Answer Template

Keep final responses concise:

```markdown
最终稿：...
查重报告：...
AIGC 报告：...
检测摘要：平台、ReportID、相似度、AIGC率。
记录文件：...
注意事项：...
```
