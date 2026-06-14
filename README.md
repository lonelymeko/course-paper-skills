# Course Paper Skills

Codex skills and scripts for Chinese course-paper delivery:

- draft a course paper from assignment requirements and a Word template;
- keep citations and references grounded in real sources;
- format a final DOCX;
- run real mainland China similarity/AIGC detector workflows when the user authorizes login;
- save official reports and evidence logs without fabricating rates.

This repository contains reusable skills and automation helpers. It does **not** include any user's paper, detector report, login token, QR-code session, school template, or private coursework.

## Skills

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

## Install

Set `CODEX_HOME` if your Codex home is not `~/.codex`, then run:

```bash
./scripts/install.sh
```

The installer copies the three skills into:

```text
$CODEX_HOME/skills/
```

## Requirements

General:

- Node.js 18+
- Python 3.10+
- `curl`

For PaperPass browser login:

- `playwright` npm package
- Playwright Chromium installed
- `sqlite3` command-line tool for reading Chromium cookies from the Playwright profile

For Python PaperPass upload/parse:

- `requests`

Example setup inside this repo:

```bash
npm install
python3 -m pip install requests
npx playwright install chromium
```

Proxy variables are respected by the scripts when present:

```bash
export https_proxy=http://127.0.0.1:7897
export http_proxy=http://127.0.0.1:7897
export all_proxy=socks5://127.0.0.1:7897
```

## Quick Start

### Open a QR code cross-platform

```bash
node skills/domestic-paper-detection/scripts/open_qr.js \
  "https://example.com/login-qrcode.jpg" \
  --out /tmp/login-qrcode.jpg
```

The helper uses:

- macOS: `open`
- Linux: `xdg-open`
- Windows: `Start-Process`

### XYZ SCIENCE full-document AIGC detection

```bash
node skills/domestic-paper-detection/scripts/xyzscience_flow.js \
  --mode login-detect \
  --run-dir ./runs/xyzscience-demo \
  --file ./final-paper.docx \
  --title "My Course Paper"
```

Flow:

1. calls the official QR login endpoint;
2. downloads and opens the QR image;
3. polls the official login status endpoint;
4. uploads the DOCX to the official full-text detection endpoint;
5. polls the official task status endpoint;
6. downloads the official report PDF when an `ossUrl` is returned.

### XYZ SCIENCE paragraph rewrite

```bash
node skills/domestic-paper-detection/scripts/xyzscience_flow.js \
  --mode login-rewrite \
  --run-dir ./runs/xyzscience-demo \
  --text-file ./paragraph.txt
```

Only use returned rewrite text after reviewing it for meaning, citations, and academic tone.

### PaperPass upload/parse

```bash
python3 skills/domestic-paper-detection/scripts/paperpass_upload_parse.py \
  --file ./final-paper.docx \
  --out-dir ./runs
```

This performs the official anonymous upload/parse stage and saves raw responses. It does not bypass login, TencentCaptcha, payment, or quota checks.

### PaperPass QR/browser login

```bash
node skills/domestic-paper-detection/scripts/paperpass_qr_playwright.js \
  --run-dir ./runs/paperpass-YYYYMMDD-HHMMSS
```

This launches Playwright Chromium, screenshots the official login/QR area, opens it for the user, and polls for logged-in browser state.

### PaperPass submit with Playwright profile cookies

```bash
node skills/domestic-paper-detection/scripts/paperpass_submit_from_profile.js \
  --run-dir ./runs/paperpass-YYYYMMDD-HHMMSS \
  --title "My Course Paper" \
  --author "Author Name"
```

If PaperPass returns captcha, payment, or quota requirements, the script stops and saves the official response.

### Final artifact index

```bash
node skills/course-paper-final-delivery/scripts/collect_artifacts.js \
  --project ./paper-project \
  --final-docx ./paper-project/final.docx \
  --similarity-report ./paper-project/reports/similarity.pdf \
  --aigc-report ./paper-project/reports/aigc.pdf \
  --detection-summary ./paper-project/detection_summary.md
```

## Security and Ethics

- Do not commit run directories, login responses, cookies, QR session files, detector reports, or paper drafts.
- Do not fabricate detector percentages, report IDs, or report URLs.
- Do not bypass captcha, payment, SMS, QR login, or anti-bot controls.
- Use official detector responses only.
- Treat rewrite/reduction output as an editing aid. Review it for accuracy, source attribution, and academic integrity.

## What Is Intentionally Not Included

- User papers or school templates.
- Real detector reports.
- Tokens, cookies, QR login sessions, or screenshots from user accounts.
- Site-specific paid-account credentials.

## License

MIT. See [LICENSE](LICENSE).
