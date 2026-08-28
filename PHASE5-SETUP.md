# Phase 5 production setup

The repository now contains a hardened contact Worker, but three deployment secrets/config values must be supplied outside GitHub before contact delivery can work.

## Required Worker secrets

Set these with Wrangler/Cloudflare Secrets; never commit them:

- `RESEND_API_KEY` — Resend API key
- `TURNSTILE_SECRET` — Cloudflare Turnstile secret key
- `CONTACT_TO` — destination inbox (can be a secret or Worker variable)
- `CONTACT_FROM` — verified sender address/domain in Resend

## Required public configuration

Update `ALLOWED_ORIGIN` in `wrangler.jsonc` to the final HTTPS site origin. If the site is moved to a custom domain, also update the allowed-origin list in `src/index.js` or use only the configured environment origin.

## Deployment routing

The Worker intentionally has no placeholder `example.com` route. Attach `/api/contact` to the Worker only after the real domain is known. This avoids accidentally deploying a route to the wrong zone.

## Turnstile

The Worker is fail-closed: when `TURNSTILE_SECRET` is absent it returns `503`, rather than accepting unverified public submissions. The frontend must send the Turnstile token as `turnstileToken` once the public site key is configured.

## Security controls implemented

- POST-only endpoint
- Origin allow-list
- JSON content-type enforcement
- 12 KB request limit
- Name/email/message length validation
- Per-instance IP rate limit: 5 requests per 10 minutes
- Cloudflare Turnstile verification
- Resend API secret kept server-side
- No user-controlled HTML rendering
- No secrets in frontend code
- No-store API responses
- CORS restricted to configured origin
- Security headers via `_headers`

## Important limitation

The in-memory rate limiter is best-effort and resets when a Worker isolate is replaced. For a high-volume production site, use Cloudflare's durable/distributed rate-limiting capability. This repository does not pretend the in-memory limiter is globally authoritative.
