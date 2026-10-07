import { boot } from '../main.js';
import '../styles/pages/inner.css';
import '../styles/pages/locations.css';
import { gsap, RM } from '../core/motion.js';
import { $, $$, icon, whenNear, toast, reducedMotion } from '../core/utils.js';
import { locations, branchClock } from '../data/locations.js';
import { pic } from '../components/render.js';
import { initRoads } from '../components/road.js';

const list = $('[data-locs]');
const card = $('[data-map-card]');
const tel = (p) => p.replace(/\s/g, '');

/* ---------- Branch accordion ---------- */
list.innerHTML = locations
  .map(
    (l, i) => `
  <li class="loc" id="${l.id}" data-loc="${l.id}" data-reveal="left" style="--d:${i * 0.06}s">
    <button class="loc__head" type="button" aria-expanded="false" aria-controls="loc-${l.id}">
      <span class="loc__num">${String(i + 1).padStart(2, '0')}</span>
      <span class="loc__city"><b>${l.city}</b><small>${l.name} · ${l.country}</small></span>
      <span class="loc__status" data-status><i></i><span data-time>--:--</span></span>
      <span class="loc__chev" aria-hidden="true"></span>
    </button>
    <div class="loc__body" id="loc-${l.id}" role="region" aria-label="${l.city} branch details">
      <div class="loc__clip">
        <div class="loc__inner">
          <div class="loc__photo">${pic(`city-${l.id}`, `${l.city}`, '150px')}<span>${l.fleet} cars here</span></div>
          <div class="loc__info">
            <p>${icon('pin')}<span>${l.address}</span></p>
            <p>${icon('clock')}<span>${l.hours}</span></p>
            <p>${icon('phone')}<a href="tel:${tel(l.phone)}">${l.phone}</a></p>
            <p>${icon('arrow-up-right')}<span>${l.airport}<span class="loc__dist" data-dist></span></span></p>
            <div class="loc__actions">
              <a class="is-primary" href="/booking.html?loc=${l.id}">Book here ${icon('arrow')}</a>
              <a href="https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}" target="_blank" rel="noopener">Directions ${icon('arrow-up-right')}</a>
              <a href="tel:${tel(l.phone)}">Call ${icon('phone')}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </li>`
  )
  .join('');

boot();
initRoads();

/* ---------- Map + floating card ---------- */
let map = null;
let L = null;
let active = null;
const markers = {};

function renderCard(id, animate = true) {
  const l = locations.find((x) => x.id === id);
  const { time, isOpen } = branchClock(l);
  const html = `
    <div class="map-card__img">${pic(`city-${l.id}`, '', '92px')}</div>
    <div class="map-card__text">
      <b>${l.city} · ${l.name}</b>
      <span class="map-card__time ${isOpen ? '' : 'is-closed'}">${isOpen ? '<i class="live-dot" aria-hidden="true"></i>Open now' : 'Closed'} · ${time} local</span>
      <span>${l.airport}</span>
    </div>
    <a class="btn btn--light btn--sm" href="/booking.html?loc=${l.id}">Book <span class="btn__icon">${icon('arrow')}</span></a>`;
  if (!animate || RM) return void (card.innerHTML = html);
  gsap.to(card, {
    y: 24, opacity: 0, duration: 0.25, ease: 'power2.in',
    onComplete: () => {
      card.innerHTML = html;
      gsap.fromTo(card, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'expo.out', clearProps: 'transform' });
      gsap.fromTo(card.querySelector('.map-card__img img'), { scale: 1.4 }, { scale: 1, duration: 1.1, ease: 'expo.out' });
    },
  });
}

function activate(id, { fly = true, scroll = false, toggle = false } = {}) {
  const li = $(`[data-loc="${id}"]`);
  const closing = toggle && li.classList.contains('is-active');
  $$('.loc', list).forEach((el) => {
    const on = !closing && el.dataset.loc === id;
    el.classList.toggle('is-active', on);
    $('.loc__head', el).setAttribute('aria-expanded', String(on));
  });
  if (closing) return;
  Object.entries(markers).forEach(([k, m]) => m.getElement()?.querySelector('.map-pin')?.classList.toggle('is-active', k === id));
  if (active !== id) renderCard(id, !!active);
  active = id;
  const l = locations.find((x) => x.id === id);
  if (map && fly) reducedMotion() ? map.setView([l.lat, l.lng], 12) : map.flyTo([l.lat, l.lng], 12, { duration: 1.8, easeLinearity: 0.2 });
  if (scroll) {
    const top = li.getBoundingClientRect().top + scrollY - 120;
    window.__lenis ? window.__lenis.scrollTo(top) : scrollTo({ top, behavior: 'smooth' });
  }
}

list.addEventListener('click', (e) => {
  const head = e.target.closest('.loc__head');
  if (head) activate(head.closest('[data-loc]').dataset.loc, { toggle: true });
});

/* ---------- Live local time + open status (refreshes every 30s) ---------- */
function tickClocks() {
  let open = 0;
  locations.forEach((l) => {
    const { time, isOpen } = branchClock(l);
    const li = $(`[data-loc="${l.id}"]`);
    $('[data-status]', li).classList.toggle('is-open', isOpen);
    $('[data-time]', li).textContent = `${isOpen ? 'Open' : 'Closed'} · ${time}`;
    if (isOpen) open++;
  });
  $('[data-open-count]').textContent = open;
  if (active) renderCard(active, false);
}

const startId = locations.some((l) => l.id === location.hash.slice(1)) ? location.hash.slice(1) : 'dubai';
activate(startId, { fly: false });
tickClocks();
setInterval(tickClocks, 30000);

// Leaflet (~40 KB gz) and its tiles load only when the map is near the viewport.
whenNear($('[data-map]'), async () => {
  const [mod] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
  L = mod.default || mod;
  const el = $('[data-map]');
  el.innerHTML = '';
  map = L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true, worldCopyJump: true, zoomSnap: 0.5 });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    keepBuffer: 4,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  locations.forEach((l, i) => {
    const pin = L.divIcon({ className: '', html: `<div class="map-pin"><span>${i + 1}</span></div>`, iconSize: [34, 34], iconAnchor: [17, 34] });
    markers[l.id] = L.marker([l.lat, l.lng], { icon: pin, title: l.city, alt: l.city, riseOnHover: true })
      .addTo(map)
      .on('click', () => activate(l.id, { scroll: innerWidth >= 1024 }));
  });
  map.fitBounds(L.latLngBounds(locations.map((l) => [l.lat, l.lng])), { padding: [60, 60] });
  // The frame animates open and resizes; keep Leaflet's tile grid in sync (fixes blank tile gaps).
  new ResizeObserver(() => map.invalidateSize({ pan: false })).observe(el);
  setTimeout(() => map.invalidateSize(), 1600);
  // Pins drop in one by one, then the selected branch lights up.
  if (!RM) gsap.from($$('.map-pin', el), { y: -40, opacity: 0, duration: 0.9, ease: 'bounce.out', stagger: 0.08, delay: 0.3 });
  activate(active || startId, { fly: !!location.hash });
}, '400px');

/* ---------- Nearest branch ---------- */
const km = (a, b) => {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
$('[data-near]').addEventListener('click', () => {
  if (!navigator.geolocation) return toast('Location isn’t available in this browser.');
  toast('Finding the nearest branch…');
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const me = { lat: coords.latitude, lng: coords.longitude };
      const sorted = locations.map((l) => ({ l, d: km(me, l) })).sort((a, b) => a.d - b.d);
      // Re-order with a FLIP animation so the cards glide to their new places.
      const before = new Map($$('.loc', list).map((el) => [el, el.getBoundingClientRect().top]));
      sorted.forEach(({ l, d }) => {
        $(`[data-loc="${l.id}"] [data-dist]`).textContent = ` · ${Math.round(d).toLocaleString('en-US')} km away`;
        list.append($(`[data-loc="${l.id}"]`));
      });
      if (!RM) before.forEach((top, el) => gsap.from(el, { y: top - el.getBoundingClientRect().top, duration: 0.8, ease: 'expo.out', clearProps: 'transform' }));
      activate(sorted[0].l.id, { scroll: true });
      toast(`Closest: ${sorted[0].l.city}, ${Math.round(sorted[0].d).toLocaleString('en-US')} km away`);
    },
    () => toast('We couldn’t get your location. Please check permissions.'),
    { timeout: 8000 }
  );
});
