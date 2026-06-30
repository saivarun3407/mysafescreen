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

### Wiring up the waitlist

`functions/api/waitlist.js` supports two sinks, both optional. The form works even if neither is
configured (signups are accepted and logged), so nothing breaks before you set this up.

#### Recommended: Resend Audience (free)
Resend's free tier (3,000 emails/month) includes **Audiences** — store the waitlist *and* send a launch
broadcast later, from one place.

1. Sign up at [resend.com](https://resend.com) (free).
2. **Audiences** → create one (e.g. "SafeScreen waitlist") → copy its **Audience ID** (a UUID).
3. **API Keys** → create a key → copy it (`re_...`).
4. Cloudflare Pages project → **Settings → Environment variables** → add (for Production *and* Preview):
   - `RESEND_API_KEY` = your `re_...` key  → mark as **Secret (encrypt)**
   - `RESEND_AUDIENCE_ID` = the audience UUID
5. Redeploy. New signups now appear under that audience in the Resend dashboard.
6. **To actually email the list at launch:** in Resend, verify `mysafescreen.com` as a sending domain
   (it auto-generates the DNS records — add them in Cloudflare DNS), then send a **Broadcast** to the audience.

#### Optional: also store in Cloudflare KV
1. `bunx wrangler kv namespace create WAITLIST` → copy the id into `wrangler.toml`.
2. Or: Pages project → **Settings → Functions → KV namespace bindings** → bind `WAITLIST`.

Export KV later with `bunx wrangler kv key list --binding WAITLIST`.

#### Local testing of the function
```bash
cp .dev.vars.example .dev.vars   # fill in your keys (gitignored)
bun --bun run build
bunx wrangler pages dev dist      # serves the Functions too
```

> Prefer MailerLite / Kit / Mailchimp instead? Swap the `addToResend()` body in
> `functions/api/waitlist.js` for that provider's "add subscriber" endpoint — same shape.

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
