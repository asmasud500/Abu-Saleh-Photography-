# Abu Saleh Photography

A premium, cinematic photography portfolio website for Abu Saleh Photography.

## Current status

- Responsive cinematic homepage and full gallery
- Portrait, Wedding, Travel and Nature filtering
- Accessible lightbox with keyboard navigation
- Lazy-loaded gallery imagery
- Contact form with client-side validation and Cloudflare Turnstile integration
- Cloudflare Worker contact API foundation
- Security headers and Content Security Policy
- `robots.txt`, `sitemap.xml`, branded `404.html`, and web manifest

## Architecture

```text
Static site (HTML/CSS/JS)
        |
        +--> Cloudflare Pages / static hosting
        |
        +--> /api/contact --> Cloudflare Worker --> Turnstile --> Resend
```

## Before launch

1. Replace `YOUR_TURNSTILE_SITE_KEY` with the real Cloudflare Turnstile site key.
2. Store the Turnstile secret and Resend API key as Cloudflare Worker secrets; never commit them.
3. Set the production domain and replace the relative canonical URL with the final absolute URL.
4. Replace demo Unsplash images with owned or properly licensed photography where possible.
5. Configure the Worker route `/api/contact` on the production domain.
6. Verify real email delivery and security headers after deployment.
7. Add real favicon/PWA icon assets before enabling install prompts.

## Demo image source

Current demo images are served from `images.unsplash.com`. They are temporary demo assets and should be replaced with original/licensed work for a commercial portfolio.

## Security notes

The repository contains no intended API secrets. Contact abuse protection depends on Turnstile, Worker validation and rate limiting being configured in production. The in-memory rate limiter is best-effort per Worker isolate and is not a globally distributed limiter.
