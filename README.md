# Radha Pingle — Personal Website

A clean, classic single-page portfolio built with plain HTML, CSS, and a little JavaScript. No build step, no dependencies — it runs anywhere.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | All page content (edit your text here) |
| `styles.css` | Colors, fonts, and layout |
| `script.js` | Mobile menu + footer year |
| `assets/RadhaP_Resume.pdf` | Your résumé (linked from the Résumé buttons) |
| `assets/profile.jpg` | Your photo (see below) |

## Add your photo

1. Save your picture as **`profile.jpg`** inside the **`assets/`** folder.
   (Or drag it into that folder and rename it `profile.jpg`.)
2. Refresh the page — it appears automatically in the hero section.

A JPG or PNG around 600×750 px looks best. If the file is missing, the site
shows a subtle placeholder instead of a broken image.

## Update your résumé later

Replace `assets/RadhaP_Resume.pdf` with a new PDF of the same name — every
"Résumé" / "Download résumé" link will point to the new file automatically.

## Edit the text

Open `index.html` and edit the words directly. Sections are clearly labeled
with comments (`<!-- About -->`, `<!-- Experience -->`, etc.).

## Preview locally

Open `index.html` by double-clicking it, or run a tiny local server:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000

## Deploy (free options)

- **GitHub Pages:** push this folder to a GitHub repo, then enable Pages
  (Settings → Pages → deploy from the `main` branch, root folder).
- **Netlify / Vercel:** drag the folder onto their dashboard, or connect the repo.

All three host static sites for free.
