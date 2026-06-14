# Security Policy

This repository is designed to keep sensitive detector/login artifacts out of git.

Do not commit:

- QR login responses or screenshots from real accounts
- `login-success.json`, cookies, `storage-state.json`, Chromium profiles
- detector report PDFs/ZIPs/HTML generated for a real user
- paper drafts, school templates, student identity fields
- `.env` files or API keys

If a secret is accidentally committed, revoke the credential or session immediately and rotate any affected account tokens.
