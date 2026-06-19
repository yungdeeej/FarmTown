# FarmTown Link-in-bio page

A self-hosted "linktree" with all official FarmTown links. Single static folder
(`index.html` + `logo.png` + `banner.png`) — no third-party service, so it lives
on your own domain and can't be impersonated.

## Links included
Play · Website · Server Status · Twitter/X · Discord · Buy $FARM (pump.fun) ·
Dexscreener chart · Solscan token · copy-able Contract Address · safety note.

## Deploy (pick one)

- **Your domain (recommended):** upload this folder to `farmtown.online/links/`
  so the page is `https://farmtown.online/links`. Then set
  `og:image` in `index.html` to `https://farmtown.online/links/banner.png`
  (already defaulted to that) and use the URL in your X/Discord bios.
- **Vercel / Netlify:** drag this `linkme` folder into a new project — instant
  hosted URL, free.
- **GitHub Pages:** push and enable Pages on the folder.

## Edit
All links live in `index.html` (just the `<a class="btn" href="...">` rows).
Update a link or the contract address there and re-deploy.
