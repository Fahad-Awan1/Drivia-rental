import { boot } from '../main.js';
import { initRoads } from '../components/road.js';

const style = document.createElement('style');
style.textContent = `
.lost{position:relative;margin:0 12px 12px;border-radius:var(--r-lg);overflow:hidden;background:#070708;color:var(--on-dark);min-height:calc(100svh - var(--header-h) - 24px);display:grid;align-items:center;isolation:isolate}
.lost canvas{position:absolute;inset:0;width:100%;height:100%;z-index:-1}
.lost__inner{display:grid;gap:20px;justify-items:start;padding-block:64px}
.lost__code{font-family:var(--font-display);font-weight:700;font-size:clamp(5rem,3rem + 12vw,13rem);line-height:.8;letter-spacing:-.06em;color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.35)}
.lost h1{max-width:14ch}
.lost__actions{display:flex;flex-wrap:wrap;gap:10px}
@media (max-width:768px){.lost{margin:0 8px 8px}}`;
document.head.append(style);

boot();
initRoads({ speed: 1.6 });
