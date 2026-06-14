---
name: course-paper-zh
description: Use when a user gives a Chinese course-paper prompt, assignment PDF, Word template, topic, or paper requirement and expects an end-to-end deliverable: final DOCX/PDF manuscript, real references, formatting to template, real plagiarism/similarity report, real AIGC report, and a saved evidence log.
---

# Chinese Course Paper Workflow

Use this skill together with the Documents skill when the deliverable is a `.docx`, and with `domestic-paper-detection` when the user asks for real similarity/AIGC reports.

## Integrity Boundary

- Do not promise or fabricate AIGC rate, plagiarism/similarity rate, official check results, teacher feedback, or submission status.
- Do not rewrite to evade detectors. Frame revisions as legitimate originality improvement: source-aware writing, accurate citations, clearer personal analysis, and removal of accidental patchwriting.
- If the user asks Codex to obtain actual AIGC or similarity percentages, use only official detector interfaces or user-approved browser/login handoff from `domestic-paper-detection`; never invent local percentages.

## End-to-End Prompt Contract

When the user gives a prompt such as “帮我完成论文/综述/大作业并查重查 AIGC”, treat the input as a delivery brief. Extract or ask only for missing essentials:

- Assignment/requirements file path, Word template path, topic or allowed topic scope.
- Author/student/class/teacher fields if the template requires them; leave `待填写` only if not provided.
- Target detector preference if specified, otherwise prefer school-approved platform, then PaperPass/XYZ SCIENCE according to availability.
- Proxy/login requirements supplied by the user.

Final deliverables should be saved under a project folder and include:

- `*_最终稿.docx` or the best current final DOCX.
- Optional `*_最终稿.pdf` if rendering/export is available.
- A real similarity/plagiarism report PDF/HTML/JSON when the detector provides one.
- A real AIGC report PDF/HTML/JSON when the detector provides one.
- A concise detection summary Markdown with official report IDs, rates, raw response paths, and caveats.

## Workflow

1. **Read requirements first**
   - Extract text from the assignment PDF and the Word template.
   - Record hard constraints: topic scope, word count, abstract length, reference count, required citation-in-text, penalties, fonts, spacing, title/figure/table rules.
   - If PDF extraction fails, render pages and OCR or visually inspect screenshots.

2. **Plan topic and structure**
   - Choose a narrow topic that fits the course and can support concrete original analysis.
   - Build the paper around the required template sections unless the assignment says otherwise.
   - For applied engineering topics, include: problem context, technical architecture, key technologies, application design, risks/security, evaluation indicators, summary.

3. **Collect real references**
   - Use web search for primary or stable sources first: standards, official technical specifications, peer-reviewed papers, government/international organization reports, publisher pages, DOI pages.
   - Keep at least the assignment-required count. Record title, authors/organization, year, venue/publisher, URL/DOI, and how each source supports a claim.
   - Use only sources that were actually found or already provided. Do not invent Chinese journal articles, DOI values, page ranges, or dates.
   - Prefer recent sources for current technology status, but include canonical standards where relevant.

4. **Draft source-aware prose**
   - Use citations in the body near the claims they support, such as `[1]`.
   - Avoid long quotations. Write from notes in original wording and include the user's own system design, comparison, limitations, and implementation thinking.
   - For abstract requirements that demand personal work, make at least half of the abstract describe the paper's own analysis/design/conclusions rather than background.

5. **Originality and AIGC self-check**
   - Before formatting, scan for:
     - uncited factual claims,
     - source phrases copied too closely,
     - generic filler,
     - repeated sentence patterns,
     - reference entries not cited in text,
     - citations in text missing from the bibliography.
   - Produce a short `checklog` with unresolved risks and any real detector results.

6. **Format into DOCX**
   - Preserve the school template where supplied.
   - Use template styles where possible; otherwise explicitly set required Chinese fonts, sizes, spacing, heading alignment, figure/table captions, and references.
   - Generate the Word file and verify it structurally. If LibreOffice is available, render pages and inspect images as required by the Documents skill.

7. **Run real detection when requested**
   - Use `domestic-paper-detection`.
   - Save every raw request/response/report under `domestic_detection/runs/<service>-<timestamp>/`.
   - If a site needs QR login, open the QR image for the user and poll the official status endpoint when available.
   - If blocked by captcha, payment, quota, or missing login, stop at that point and report the exact official response.

8. **Revise legitimately if needed**
   - Use detector reports to improve originality through clearer own analysis, better source attribution, less formulaic prose, and removal of accidental patchwriting.
   - Do not describe the work as evading detectors.
   - Re-run official detection only when the user asks or the detector route is available and within quota.

9. **Final response checklist**
   - Link the final DOCX.
   - Link the similarity/plagiarism report.
   - Link the AIGC report.
   - State official rates/report IDs only from saved official responses.
   - State any QA gaps, such as missing LibreOffice render verification or unavailable report-detail extraction.

## Optional Local Course Notes

If a project includes `references/<course>_requirements.md`, read it before drafting. Do not include user-specific assignment files in a public skill repository.
