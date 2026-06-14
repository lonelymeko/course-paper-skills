---
name: course-paper-final-delivery
description: Use when the user wants an end-to-end Chinese course paper from a prompt or assignment files through final DOCX/PDF, real references, Word template formatting, real plagiarism/similarity report, real AIGC report, optional legitimate revision, and a final artifact location summary.
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
- Topic, course, school, word count, required sections, citation style, deadline, and author fields.
- Detector preference: school platform, PaperPass, XYZ SCIENCE, CNKI, Wanfang, or other.
- Proxy exports and login preferences.

If author/class/teacher fields are unknown, use `待填写` and record that in the final answer.

## Delivery Workflow

1. **Create project folder**
   - Put manuscript, sources, scripts, and reports in one folder.
   - Use `domestic_detection/runs/<service>-<timestamp>/` for detector evidence.

2. **Read requirements and template**
   - Extract assignment constraints from PDF/DOCX.
   - Inspect the Word template structure and required front matter.

3. **Research and reference audit**
   - Use real sources only: DOI pages, official standards/specs, publisher pages, government/international organization reports.
   - Save source notes and ensure every bibliography item is cited in text.

4. **Draft and revise**
   - Produce source-aware Chinese prose with body citations.
   - Include the paper’s own scenario design, analysis, limitations, and conclusions.
   - Remove generic filler and repeated sentence patterns before detection.

5. **Format final manuscript**
   - Generate DOCX following the school template.
   - Render/visual-QA with Documents skill if LibreOffice/soffice is available; otherwise do structural DOCX checks and disclose the render gap.

6. **Run real detection**
   - Use `domestic-paper-detection`.
   - For QR login, save QR image, open it cross-platform, and poll official status:
     - macOS: `open <image>`
     - Linux: `xdg-open <image>`
     - Windows: `Start-Process <image>`
   - Save official raw JSON/HTML/PDF/ZIP reports.

7. **Optional legitimate reduction/revision**
   - If AIGC/similarity is too high and an official report identifies problem areas, revise those areas substantively.
   - If using an official rewrite API, save payload and response; manually review and integrate only if the result preserves meaning, citations, and academic tone.
   - Re-run official detection if the user needs a new final rate.

8. **Final report**
   - Link final DOCX/PDF.
   - Link similarity/plagiarism report.
   - Link AIGC report.
   - State official rates/report IDs and exact source files.
   - State blockers or QA gaps plainly.
   - Prefer `package_detection_results.py` to copy official PDFs/ZIPs into the project root and generate `检测报告汇总_<date>.md` plus `final_artifacts_summary.md`.

## Bundled Scripts

Use the helper script to create a final artifact index after manuscript/report generation:

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
