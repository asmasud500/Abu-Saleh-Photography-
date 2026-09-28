# NOVA — Modern Ecommerce Storefront

A sleek, responsive static ecommerce website rebuilt for GitHub Pages.

## Features

- Responsive desktop/tablet/mobile layout
- Modern editorial ecommerce UI
- Product catalog with category filters
- Price/name sorting
- Live product search
- Shopping bag with quantity controls
- Cart persistence with localStorage
- Responsive cart drawer
- Smooth hover interactions
- Free-to-use Unsplash image sources for demo products
- Accessible labels and reduced-motion support
- No backend or payment secrets in the frontend

## Run

This is a static site. Open `index.html` locally or publish the repository with GitHub Pages.

## Production notes

The checkout button is intentionally a frontend placeholder. Before accepting real payments, connect a trusted payment provider and keep all secret credentials on a server-side backend or serverless function.

Replace the demo product data and image URLs in `script.js` with real inventory before launch. Verify image licensing/terms for your intended commercial use.

## Files

- `index.html` — storefront structure
- `styles.css` — responsive visual system
- `script.js` — catalog, filters, search and cart logic


## Telegram ecommerce bot

The Cloudflare Worker now supports an admin Telegram workflow:

- Open Store and Support buttons from /start
- Check Order Status button and /status ORDER-ID
- New-order notification with inline Confirm, Processing, Shipped, Delivered, and Cancel buttons
- Status changes update the Telegram order message
- If D1 is connected, status buttons also update the order in the database
- /orders shows the latest 10 orders to the configured admin chat
- Optional Admin Dashboard button

### Cloudflare Worker configuration

Required secrets:
- TELEGRAM_BOT_TOKEN
- TELEGRAM_CHAT_ID

Optional variables:
- STORE_URL
- ADMIN_URL
- SUPPORT_URL
- ALLOWED_ORIGIN

Set the Telegram webhook to:
https://YOUR-WORKER-DOMAIN/telegram/webhook

The Telegram bot token must stay in Cloudflare Secrets and must never be committed to GitHub.
