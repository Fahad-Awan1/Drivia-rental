# Drivia — Premium Car Rentals

A multi-page site built with Vite, vanilla JS, Three.js, GSAP and Lenis.

## Run

```bash
npm install
npm run dev       # local dev server
npm run build     # production build → dist/
npm run preview   # serve the production build
npm run images    # re-optimise photos from assets-src/ → public/images (AVIF + WebP)
```

`dist/` is fully static and can go on any static host (Netlify, Vercel, Cloudflare Pages, cPanel). Point the host's 404 page at `404.html`.

### Deploy on Vercel

Import the repo in Vercel; it detects Vite automatically. The defaults are correct:

| Setting | Value |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm install` |

Every page (`index.html`, `fleet.html`, `car.html`, …) is built as its own HTML file, and Vercel serves `dist/404.html` for unknown URLs. No environment variables are needed.

## Pages

| Page | File | Highlights |
| --- | --- | --- |
| Home | `index.html` | 3D car hero (drive-in, pointer parallax, scroll orbit, paint swatches), preloader, slider, pinned fleet showcase, trip-mood picker, scroll-drawn road, light-trail shader CTA |
| Fleet | `fleet.html` | Filters, search, sort, URL-synced state, animated grid, compare up to 3 cars |
| Car | `car.html?id=…` | 3D showroom for `ferrari-458` (orbit, paint, day/night, drive mode, hotspots); photo stage for other cars; live quote widget |
| Pricing | `pricing.html` | Daily/weekly/monthly toggle, tiers, trip-cost estimator, extras, FAQ |
| Locations | `locations.html` | Leaflet map synced with the branch list, "nearest to me" |
| About | `about.html` | Procedural 3D wheel that spins with scroll, timeline, values, team |
| Contact | `contact.html` | Validated form with success state |
| Booking | `booking.html` | 4-step flow, age/one-way fees, session persistence, confirmation + .ics |

## Editing content

- Fleet: `src/data/cars.js` (add a photo to `assets-src/<id>.jpg`, then `npm run images`)
- Branches: `src/data/locations.js`
- Prices, extras, tiers: `src/data/pricing.js`
- FAQ: `src/data/faq.js`
- Chatbot answers: `src/data/chatbot-kb.js` (engine: `src/components/chat-engine.js`)
- Shared header/footer: `src/partials/`

## Notes

- The booking and contact forms are front-end only; nothing is sent to a server.
- Map tiles come from openstreetmap.org, which is fine for light traffic. For production traffic, switch to a tile provider in `src/pages/locations.js`.
- Credits: photos from Unsplash; 3D model "Ferrari 458 Italia" by vicent091036 (CC BY 4.0), shown in the footer.
