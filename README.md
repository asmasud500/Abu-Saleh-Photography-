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
