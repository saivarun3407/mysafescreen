# SafeScreen — marketing site (mysafescreen.com)

The marketing + waitlist site for **SafeScreen**, an on-device visual safety layer for your phone that
blurs explicit and AI-faked imagery in real time — with nothing ever leaving your device.

Built with **Astro 5 + Tailwind CSS 4**, deployed to **Cloudflare Pages**.

## Pages

| Route | What it is |
|---|---|
| `/` | Landing page — hero, problem, how it works, privacy, system-wide, honesty, waitlist |
| `/how-it-works` | The on-device pipeline explained for a general audience |
| `/privacy` | The privacy/security guarantees (the core differentiator) |
| `/about` | Mission + founding story |
| `/api/waitlist` | Cloudflare Pages Function — accepts waitlist signups |

## Local development

Local Node here is older than Astro's minimum, so run through **bun's runtime** with `--bun`:

```bash
bun install
bun --bun run dev      # http://localhost:4321
bun --bun run build    # outputs to ./dist
bun --bun run preview  # preview the production build
```

> On a machine with Node ≥ 20 you can use the plain `bun run dev` / `npm run dev` scripts.

## Deploy to Cloudflare Pages

The domain `mysafescreen.com` already lives in your Cloudflare account, so this deploys cleanly.

### Option A — Git integration (recommended)
1. Push this repo to GitHub/GitLab.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Build settings:
   - **Framework preset:** Astro
   - **Build command:** `npx astro build`
   - **Build output directory:** `dist`
   - **Environment variable:** `NODE_VERSION = 20`  ← required (Astro needs Node ≥ 20)
4. After the first deploy: **Custom domains** → add `mysafescreen.com` (and `www`). DNS is auto-configured since the zone is on Cloudflare.

### Option B — Direct upload with Wrangler
```bash
bun --bun run build
bunx wrangler pages deploy dist --project-name mysafescreen
```

### Wiring up the waitlist (optional but recommended)
`functions/api/waitlist.js` stores signups in a Cloudflare **KV** namespace if one is bound:

1. **Workers & Pages → KV** → create a namespace (e.g. `safescreen-waitlist`).
2. Pages project → **Settings → Functions → KV namespace bindings**.
3. Add binding: **Variable name** `WAITLIST` → your namespace.

Without a binding the form still works (signups are accepted and logged); they just aren't persisted.
To export collected emails later, read the KV namespace via `wrangler kv:key list`.

> Prefer a managed list (Buttondown, Resend, ConvertKit, Mailchimp)? Swap the `env.WAITLIST.put(...)`
> call in `functions/api/waitlist.js` for a `fetch()` to that provider's API and add the API key as a
> Pages secret.

## Design system

Tokens and component utilities live in `src/styles/global.css` (`@theme` block). Brand: deep ink
background, a teal/emerald "safe" accent, Space Grotesk display + Inter body. The phone mock and all
imagery are abstract gradients by design — the product blurs harmful content, so the site never shows
real imagery of any kind.

## Project structure

```
src/
  layouts/Layout.astro       # shared shell: head, fonts, nav, footer, scroll-reveal
  components/
    Nav.astro  Footer.astro  Logo.astro
    PhoneMock.astro          # the hero "blur in action" device
    WaitlistForm.astro       # the primary CTA, posts to /api/waitlist
  pages/                     # index, how-it-works, privacy, about, 404
  styles/global.css          # design system
functions/api/waitlist.js    # Cloudflare Pages Function
public/                      # favicon, robots.txt, _headers
```
