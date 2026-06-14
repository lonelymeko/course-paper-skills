---
name: domestic-paper-detection
description: Use when a user needs real mainland China paper plagiarism/similarity or AIGC detection workflows, including CNKI/知网, 万方, PaperPass, 维普, browser automation handoff, official report retrieval, and strict refusal to fabricate detector percentages.
---

# Domestic Paper Detection

Use this skill when the task needs a real AIGC or plagiarism report from a China mainland service.

## Hard Boundary

- Never fabricate AIGC rate, similarity rate, report number, official status, or report URL.
- Do not claim an API works until it has been called and a real platform response is saved.
- Do not bypass login, captcha, payment, SMS, QR-code login, or anti-bot controls.
- If a site requires user action, stop at the handoff point and ask the user to log in, solve captcha, pay, or provide an API key/cookie.
- Do not submit placeholder paper metadata to official detectors. For PaperPass, require a real `--author` value before final submission because the official report shows the author field.
- Revisions after a report must be legitimate originality improvement: cite sources, remove patchwriting, restructure analysis, add own reasoning. Do not frame work as evading detectors.

## Preferred Mainland Routes

1. School-approved platform if named in the assignment.
2. CNKI personal check: `https://cx.cnki.net/`
   - API root observed in frontend: `https://cx.cnki.net/api/`
   - AIGC endpoints observed: `aigc/doc/uploadDoc`, `aigc/doc/checkUpload`, `aigc/doc/toAigc`, `aigc/doc/checkAigc`, `aigc/doc/downloadReport`, `aigc/doc/getOnlineReportUrl`
   - Usually needs login/payment.
3. Wanfang personal check: `https://jc.wanfangdata.com.cn/index`
   - API base observed as relative `api`
   - Routes include `/AIGCPaper`, `/newPapers`, `/checkResults`
   - Login checked via `/api/user/getuser`; report base via `/api/personcheck/getReportUrl`.
4. PaperPass: `https://www.paperpass.com/upload` and `https://www.paperpass.com/aigc`
   - Anonymous upload/parse path observed:
     - `POST /api/paper/get-upload-sign`
     - `POST <returned OSS end_point>`
     - `POST /api/paper/parse`
   - Final submission uses site flow and Tencent captcha/payment/login as applicable.
   - QR login handoff:
     - Prefer official QR/login endpoint when discovered, otherwise use Playwright Chromium to reach the official login page and capture/screenshot the QR area.
     - Save the QR image under `domestic_detection/runs/paperpass-*/`.
     - Open the QR image with the cross-platform QR opener below so the user can scan it.
     - Poll official login/status/report endpoints when available; if the site only exposes browser state, keep the Playwright Chromium profile alive and read cookies/session from that profile after user login.
   - Confirmed local Playwright route:
     - Use Playwright Chromium persistent profile, not system Edge or AppleScript.
     - Save official upload/parse run under `domestic_detection/runs/paperpass-*`.
     - If logged in, `paperpass_submit_playwright_profile.js` can read the Playwright profile cookies, call the official `/panel/index/submit-papers-key` endpoint, and save official pre-submit/final-submit JSON.
     - `paperpass_restore_playwright.js` and `paperpass_submit_from_profile.js` reject missing/placeholder authors by default. Pass `--author "<真实姓名>"`; only use `--allow-placeholder-author` for deliberate tests that will not be delivered.
     - If PaperPass returns `free_captcha` or `fee_captcha`, stop and ask the user to solve TencentCaptcha in the Playwright Chromium window. Do not synthesize captcha payloads.
     - Report list endpoint confirmed as `POST /panel/report/index?page=1`; offline report download endpoint confirmed as `/panel/report/report?filename=<FileName>`.
     - After manual captcha/submission, `paperpass_poll_download.js` can read cookies from the Playwright Chromium profile, poll the official report list until `Status:"1"`, and download the official offline report file.
5. XYZ SCIENCE: `https://xyzscience.com/detection` and `https://xyzscience.com/rewrite`
   - API base observed in frontend: `/api`.
   - Confirmed WeChat QR login route:
     - Get QR info with `GET /api/app/user/login/qrcode/mp`.
     - Save `sceneId` and `qrcodeUrl`; download the QR image from `qrcodeUrl`.
     - On macOS, use `open <qrcode-image>` so the user can scan it.
     - Poll `GET /api/app/user/login/qrcode/status?sceneId=<sceneId>` until it returns `status:"logged"` with `token` and `refreshToken`.
     - Confirm login with `GET /api/app/user/info/person` using `Authorization: <token>`.
   - Confirmed guest paragraph AIGC detection route:
     - Check remaining guest quota with `GET /api/app/uselog/info/guest/checkDetectionLimit?lang=zh`.
     - Submit paragraph text with `POST /api/app/uselog/info/guest/detect`.
     - Payload shape: `{"interfaceType":"detection","type":"0","content":"...","useWordCount":123}` for Chinese.
     - Save raw JSON responses under `domestic_detection/runs/xyzscience-*`.
     - Response result is a JSON string containing fields such as `prediction`, `probability`, and `word_count`.
   - Confirmed logged-in DOCX full-text detection route:
     - Submit `.docx` with `POST /api/app/uselog/info/uploadDetect` as multipart form field `file`, optional `title`, and `Authorization: <token>`.
     - Poll `GET /api/app/uselog/info/queryStatus/<taskId>` until `COMPLETED` or failure.
     - Save the official `ossUrl` PDF when present.
     - `POST /api/app/uselog/info/getUselogList` can confirm history records and report URLs; frontend passes filters such as `{"timeRange":"7days","interfaceType":"fulltext"}` but a basic page payload may also return recent records.
     - Confirmed result fields include `reportId`, `overallRate`, `highCount`, `suspectCount`, `normalCount`, `totalDetected`, `totalChars`, and `aiChars`.
   - Confirmed logged-in rewrite route:
     - Call `POST /api/app/uselog/info/addUselog` with `Authorization: <token>`.
     - Payload shape for Chinese: `{"interfaceType":"rewrite","type":0,"content":"...","useWordCount":123}`.
     - Text limit is 500 Chinese characters; page guidance says 150-300 Chinese characters works best.
     - Save raw response and use only returned `result` text. If the response says balance/usage is exhausted, stop and ask the user.
   - Confirmed frontend limits:
     - Text detection limits Chinese to 500 characters and English to 500 words.
     - Guest quota exists even if page copy says free/unlimited; check quota before spending calls.
     - Full DOCX detection uses `POST /api/app/uselog/info/uploadDetect` and requires login.
     - Rewrite uses `POST /api/app/uselog/info/addUselog` with `interfaceType:"rewrite"` and requires login.
   - Do not present a paragraph result as a full-document AIGC report. Do not claim high-suspicion paragraph locations unless an official detail response or parsed report evidence provides them.

## Cross-Platform QR Opener

When a service requires QR login and returns a QR URL, image, canvas, or screenshot:

1. Save the QR as `login-qrcode.png` or `login-qrcode.jpg` inside the run directory.
2. Open it for the user:
   - macOS: `open <image>`
   - Linux desktop: `xdg-open <image>`
   - Windows/PowerShell: `Start-Process <image>`
   - If GUI open is unavailable, print the absolute image path and, if allowed, open the service login page in Playwright Chromium.
3. Poll only official status endpoints, or monitor the official browser session after user action.
4. If the QR expires, request a new QR and repeat. Do not bypass QR, SMS, captcha, payment, or anti-bot checks.

Prefer the bundled script for QR opening:

```bash
node skills/domestic-paper-detection/scripts/open_qr.js <image-path-or-url> --out <run-dir>/login-qrcode.jpg
```

## Bundled Scripts

Use scripts before retyping API flows:

- `scripts/open_qr.js`: Downloads/opens QR images cross-platform.
- `scripts/xyzscience_flow.js`: Performs XYZ SCIENCE QR login, user-info check, DOCX full-text AIGC detection, report PDF download, and optional paragraph rewrite.
- `scripts/paperpass_qr_playwright.js`: Opens PaperPass login in Playwright Chromium, screenshots the QR/login area, opens the image, and polls for logged-in browser state.
- `scripts/paperpass_poll_download.js`: Reads PaperPass cookies from a Playwright Chromium profile, polls the official report list endpoint, and downloads the official report after completion.

XYZ SCIENCE examples:

```bash
node skills/domestic-paper-detection/scripts/xyzscience_flow.js \
  --mode login-detect \
  --run-dir <project>/domestic_detection/runs/xyzscience-<timestamp> \
  --file <final.docx> \
  --title "<paper-title>"

node skills/domestic-paper-detection/scripts/xyzscience_flow.js \
  --mode login-rewrite \
  --run-dir <existing-xyzscience-run-dir> \
  --text-file <paragraph.txt>
```

PaperPass QR login handoff example:

```bash
node skills/domestic-paper-detection/scripts/paperpass_qr_playwright.js \
  --run-dir <project>/domestic_detection/runs/paperpass-<timestamp>
```

PaperPass report polling and download example:

```bash
node skills/domestic-paper-detection/scripts/paperpass_poll_download.js \
  --run-dir <project>/domestic_detection/runs/paperpass-<timestamp> \
  --profile-dir <project>/domestic_detection/runs/paperpass-login/playwright-chromium-profile \
  --file-name "<PaperPass FileName from report list>"
```

## End-to-End Report Workflow

1. Confirm the final manuscript path and detector target: similarity, AIGC, or both.
2. Prefer official API docs or school platform instructions if provided. Otherwise inspect the current frontend and save endpoint evidence.
3. Use proxy exports if the user provided them.
4. Create `domestic_detection/runs/<service>-<timestamp>/`.
5. If login is required, use the cross-platform QR opener and poll/login handoff rules above.
6. Run only real detector calls. Save raw JSON/HTML responses, screenshots, ZIPs, and PDFs under the run directory.
7. If blocked by login/captcha/payment/quota, state the exact official response and stop.
8. After the platform returns a report, save the report PDF/HTML/JSON and summarize only values present in the official response.
9. For rewrite/reduction APIs, save the original text, request payload, and official rewritten result. Re-test only with a real detector if the user asks for a new official rate.

## Report Log

For every run, create or update a log with:

- Service name and URL.
- Manuscript filename and hash if available.
- Time of call.
- Endpoints called.
- Raw response files.
- Current status: submitted, waiting, blocked by login/captcha/payment, failed, or report retrieved.
- Official percentages only when present in the saved report.
