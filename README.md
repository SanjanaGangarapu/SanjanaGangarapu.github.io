# sanjanagangarapu.com

Personal portfolio for **Sanjana Gangarapu** — Writer & Communication Specialist.
An editorial / magazine-style redesign built as a plain static site (HTML/CSS/JS), hosted on GitHub Pages.

## Structure

```
.
├── index.html              # Home — hero, selected work, about, contact
├── frames.html             # Mobile photography gallery
├── 404.html                # Custom not-found page
├── work/
│   ├── orbitworks.html         # Case study
│   ├── the-autonomous.html     # Event communications
│   ├── freelance-projects.html # Editorial & content writing
│   └── ekya-schools.html       # Integrated marketing
├── css/style.css           # All styles + design tokens (top of file)
├── js/main.js              # Nav toggle, scroll reveal, footer year
├── assets/images/          # Drop real images here (see below)
├── CNAME                   # Custom domain: sanjanagangarapu.com
└── .nojekyll               # Serve files as-is (skip Jekyll processing)
```

## Adding your images

Every image on the site is currently a labelled **placeholder** that shows the exact
filename it expects. To go live with real images, drop a file with that name into the
matching folder and replace the placeholder `<div class="ph">…</div>` with an `<img>` tag:

```html
<img src="assets/images/work/orbitworks-overview.jpg" alt="Orbitworks redesigned feed" />
```

(From pages inside `work/`, use `../assets/images/...`.)

Expected files:

| Where                     | Files                                                            |
|---------------------------|-----------------------------------------------------------------|
| `assets/images/`          | `portrait.jpg` (About section, 4:5 portrait)                    |
| `assets/images/work/`     | `orbitworks-overview.jpg`, `orbitworks-eurosatory-before/after.jpg`, `orbitworks-radio-before/after.jpg`, `autonomous-static-1..3.jpg`, `autonomous-carousel-1..3.jpg`, `autonomous-video-1..3.jpg`, `freelance-saga.jpg`, `ekya-newspaper/brochure/booth/ticket.jpg`, `ekya-landing/linkedin/instagram/x.jpg` |
| `assets/images/frames/`   | `frame-01.jpg` … `frame-09.jpg`                                |

Tip: keep images optimised (≈1600px wide, compressed JPG/WebP) for fast loads.

## Editing content

- Text is written directly in the HTML — no build step, no framework.
- Colours, fonts, and spacing live as CSS variables at the top of `css/style.css`
  (`:root { … }`). Change the accent colour in one place to re-theme the whole site.
- The contact email is `hello@sanjanagangarapu.com` — search/replace it across the
  HTML files if you want a different address.

## Running locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Custom domain / DNS

The site expects to serve at `sanjanagangarapu.com` (see `CNAME`). To point the domain
from Adobe Portfolio to GitHub Pages, update DNS at your registrar:

- **Apex `@` → four A records:** `185.199.108.153`, `185.199.109.153`,
  `185.199.110.153`, `185.199.111.153`
- **`www` → CNAME:** `sanjanagangarapu.github.io`

Then in the repo: **Settings → Pages → Custom domain → sanjanagangarapu.com**, and enable
**Enforce HTTPS** once the certificate is issued.
