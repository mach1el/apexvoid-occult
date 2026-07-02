# void-occult

[![HTML5](https://img.shields.io/badge/HTML5-Static_UI-E34F26?style=flat-square&logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-Responsive_UI-1572B6?style=flat-square&logo=css3&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://developer.mozilla.org/docs/Web/JavaScript)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Gemini](https://img.shields.io/badge/Gemini-AI_Interpretation-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Docker Compose](https://img.shields.io/badge/Docker_Compose-Deployment-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![Nginx](https://img.shields.io/badge/Nginx-Static_Site-009639?style=flat-square&logo=nginx&logoColor=white)](https://nginx.org/)
[![Netlify](https://img.shields.io/badge/Netlify-Compatible-00C7B7?style=flat-square&logo=netlify&logoColor=white)](https://www.netlify.com/)
[![Last Commit](https://img.shields.io/github/last-commit/mach1el/void-occult?style=flat-square)](https://github.com/mach1el/void-occult/commits/master)
[![Repository Size](https://img.shields.io/github/repo-size/mach1el/void-occult?style=flat-square)](https://github.com/mach1el/void-occult)
[![Open Issues](https://img.shields.io/github/issues/mach1el/void-occult?style=flat-square)](https://github.com/mach1el/void-occult/issues)

A personal static knowledge base for **I-Ching / Liu Yao (六爻)** and **Purple Star / Tử Vi Đẩu Số (紫微斗數)**. No build step required.

## Contents

| File | Description |
|------|-------|
| `index.html` | Category hub for I-Ching and Purple Star |
| `pages/i-ching/luc-hao-co-ban.html` | Level 1 - Five Phases, Six Relations, Shi-Ying, Useful God, strength/weakness, and a worked hexagram example |
| `pages/i-ching/luc-hao-nang-cao.html` | Level 2 - moving lines, transformed hexagrams, six transformation patterns, Void, Hidden/Flying Spirits, Day/Month influence, combinations and clashes |
| `pages/purple-star/tu-vi-dau-so.html` | Tử Vi Đẩu Số chart builder - solar input, browser lunar conversion, school selector (Nam Phái / Trung Châu), and chart export (copy text / `.txt` / PNG) |
| `pages/purple-star/tu-vi-nam-phai.css` | Purple Star chart UI styles (shared by both schools) |
| `pages/purple-star/tu-vi-engine-nam-phai.js` | Nam Phái engine - full auxiliary star set, Tuần/Triệt, Vòng Thái Tuế & Bác Sĩ, natal Tứ Hóa, Phi Hóa cung can, tiểu hạn + lưu niên |
| `pages/purple-star/tu-vi-engine-trung-chau.js` | Trung Châu (Vương Đình Chi) engine - lean star set, signature stars (Thiên Vu / Thiên Nguyệt / Âm Sát / Nguyệt Giải), đại vận + lưu niên Tứ Hóa, lưu Thái Tuế (no tiểu hạn) |
| `pages/purple-star/tu-vi-app.js` | App shell - form + school selector (saved to `localStorage`), dispatches to the active engine, and builds the copy-paste text + PNG export |

## View Locally (chỉ frontend tĩnh)

Mở `index.html` trực tiếp, hoặc:

```bash
python3 -m http.server 8080
# http://localhost:8080            -> trang chủ (index.html)
```

## Chạy local đầy đủ (frontend + backend luận giải, Docker)

Backend Python (FastAPI) trong `backend/` dựng prompt liên cung + KB rồi gọi Gemini
(key ẩn server-side). Chạy cả hai bằng Docker Compose:

```bash
cp backend/.env.example backend/.env     # rồi điền GEMINI_API_KEY (key Gemini của bạn)
docker compose -f ../routing/docker-compose.yml up -d
docker compose up --build
```

- **Trang chủ:** http://void-occult.localhost/ → `index.html`
- **Lá số:** http://void-occult.localhost/pages/purple-star/tu-vi-dau-so.html
- **Backend health:** http://void-occult.localhost/health

Central Nginx trong `../routing` là ingress duy nhất publish port ra host.
Frontend và backend chỉ expose port trong Docker network `routing`.

`deploy/nginx.conf` đặt `/` = `index.html` và **chặn** `/backend/` + dotfiles (`.env`, `.git`…)
để không lộ API key qua web. KHÔNG commit `backend/.env` (đã `.gitignore`).

## Deploy (Netlify)

This is a pure static site. Connect the repo to Netlify with:

- **Build command:** *(leave blank)*
- **Publish directory:** `.`

Every `git push` triggers a Netlify auto-deploy.

## Add a New Article

1. Create a new `.html` file in the right category folder: `pages/i-ching/` or `pages/purple-star/`.
2. Add an `<a class="card">` entry for it in `index.html`.
3. Commit and push:

```bash
git add .
git commit -m "add: <article-name>"
git push
```

## Notes

- This is a personal cheat-sheet and tool archive. It favors compact rules, memory aids, applied examples, and deploy-safe static pages over full textbook coverage.
- Chinese and Sino-Vietnamese terms are kept where useful for cross-checking with other Liu Yao sources: Five Phases, Six Relations, Shi-Ying, Useful God, Day/Month influence, Void, Hidden/Flying Spirits, combinations, and clashes.
- Read the pages by level: start with `pages/i-ching/luc-hao-co-ban.html` to understand how to assign Six Relations, choose the Useful God, and judge strength/weakness; then move to `pages/i-ching/luc-hao-nang-cao.html` for moving lines, transformations, void, hidden spirits, and combinations/clashes.
- I-Ching articles are standalone HTML pages. The Tử Vi page keeps its CSS and engine JS beside the page in `pages/purple-star/`, so the chart can scale while still deploying directly to Netlify without a build pipeline.
- When adding new material, keep the same structure: short concept explanation, quick reference table, memory tip, and applied example. If the article starts a new level, link it from `index.html` so it stays discoverable.
- This repo is not an automated casting or hexagram-calculation tool. For real readings, record the question, casting time, Day Spirit, Month Command, primary hexagram, moving lines, and transformed hexagram separately so the reading can be reviewed later.
- The Tử Vi page expects solar birth data and converts to lunar data in the browser. Chart logic is split into two independent engines - `tu-vi-engine-nam-phai.js` (Nam Phái) and `tu-vi-engine-trung-chau.js` (Trung Châu) - each registering itself on `window.TuViEngines`; `tu-vi-app.js` owns the form, the school toggle, and export, then dispatches to whichever engine is selected. This keeps each school's astrology rules isolated while sharing one UI.
- Chart export: **⧉ Sao chép text** copies a structured plain-text lá số (birth data, Mệnh/Thân/Cục, đại vận, lưu niên, per-palace stars + Tứ Hóa) for pasting into AI chat agents; **⭳ Tải .txt** downloads the same text; **⛶ Tải ảnh** renders the chart to PNG via html2canvas (the zodiac watermark images are skipped so export still works from `file://`).

---
🤖 st_mich43l
