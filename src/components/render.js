import manifest from '../data/images.json';
import { picture } from '../utils/pic.js';
import { money, getCar } from '../data/cars.js';
import { faq } from '../data/faq.js';
import { icon, stars } from '../core/utils.js';

export const pic = (name, alt, sizes = '100vw', opts = {}) => picture(manifest, { name, alt, sizes, ...opts });

export const carSpecs = (c) => `
  <div class="specs">
    <span>${icon('seat')}${c.seats} seats</span>
    <span>${icon('gear')}${c.transmission === 'Automatic' ? 'Auto' : 'Manual'}</span>
    <span>${icon(c.fuel === 'Electric' ? 'bolt' : 'fuel')}${c.fuel}</span>
    <span>${icon('speed')}${c.accel}s</span>
  </div>`;

export const carCard = (c, { compare = false } = {}) => `
  <article class="car-card" data-id="${c.id}" data-tilt="4">
    <div class="car-card__media">
      <div class="car-card__badges">
        <span class="tag tag--dark">${c.category}</span>
        ${c.model3d ? `<span class="tag tag--accent">${icon('rotate')}3D</span>` : '<span class="tag"><i class="dot"></i>Available</span>'}
      </div>
      ${pic(c.img, c.name, '(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 400px')}
    </div>
    <div class="car-card__body">
      <div class="car-card__title">
        <div><h3><a class="car-card__link" href="/car.html?id=${c.id}" data-cursor="View">${c.name}</a></h3><small>${c.hp} hp · ${c.top} km/h top speed</small></div>
        <span class="rating">${icon('star')}${c.rating.toFixed(1)}</span>
      </div>
      ${carSpecs(c)}
      <div class="car-card__foot">
        <div class="price">${money(c.price)}<small>/day</small></div>
        <div style="display:flex;gap:8px;align-items:center">
          ${compare ? `<button class="compare-toggle" type="button" aria-pressed="false" data-compare="${c.id}" title="Add to compare" aria-label="Add ${c.name} to compare">${icon('compare')}</button>` : ''}
          <a class="btn btn--sm" href="/booking.html?car=${c.id}">Book <span class="btn__icon">${icon('arrow')}</span></a>
        </div>
      </div>
    </div>
  </article>`;

export const faqHtml = (items = faq) =>
  items.map((f) => `<details><summary>${f.q}<span class="pm" aria-hidden="true"></span></summary><div class="answer">${f.a}</div></details>`).join('');

// Smoothly animates <details> open/close.
export function bindAccordion(root) {
  root.querySelectorAll('details').forEach((d) => {
    const summary = d.querySelector('summary');
    const answer = d.querySelector('.answer');
    summary.addEventListener('click', (e) => {
      e.preventDefault();
      if (d.open) {
        const h = answer.scrollHeight;
        answer.animate([{ height: h + 'px', opacity: 1 }, { height: '0px', opacity: 0 }], { duration: 350, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => (d.open = false);
      } else {
        d.open = true;
        const h = answer.scrollHeight;
        answer.animate([{ height: '0px', opacity: 0 }, { height: h + 'px', opacity: 1 }], { duration: 450, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
    });
  });
}

export const REVIEWS = [
  { name: 'Sofia Marin', city: 'Milan', img: 'avatar-1', car: 'porsche-panamera', date: 'Sep 2026', text: 'Booked a Panamera for a Lake Como weekend. Delivered to the hotel, spotless, and the return took two minutes.' },
  { name: 'James Okafor', city: 'London', img: 'avatar-4', car: 'bmw-m5', date: 'Aug 2026', text: 'Transparent pricing is real here. What I saw online is exactly what I paid. No surprise fees at the desk.' },
  { name: 'Layla Haddad', city: 'Dubai', img: 'avatar-2', car: 'lamborghini-huracan', date: 'Sep 2026', featured: true, text: 'The Huracán was the highlight of our trip. The concierge even planned a sunrise route to Jebel Jais for us.' },
  { name: 'Marco Bellini', city: 'Nice', img: 'avatar-3', car: 'mercedes-amg-gt', date: 'Jul 2026', text: 'Picked up at Nice airport, dropped off in Milan. The one-way rental was seamless. Will use again.' },
  { name: 'Aiko Tanaka', city: 'Los Angeles', img: 'avatar-5', car: 'tesla-model-3', date: 'Aug 2026', text: 'Model 3 for a week of PCH driving. Charged, clean, and the 15% weekly discount was a nice touch.' },
  { name: 'Daniel Ross', city: 'Miami', img: 'avatar-6', car: 'ford-expedition', date: 'Sep 2026', text: 'Needed an 8-seater last minute for the family. They had the Expedition at my door within an hour.' },
  { name: 'Omar Siddiqui', city: 'Dubai', car: 'mclaren-720s', date: 'May 2026', text: 'Birthday surprise for my brother. The team decorated the 720S and delivered it to the restaurant. Legends.' },
  { name: 'Hannah Weber', city: 'Milan', car: 'audi-rs6', date: 'Jun 2026', featured: true, text: 'Drove the RS 6 over the Stelvio Pass. Perfect car, perfect condition, and the digital key just worked.' },
  { name: 'Chloe Martin', city: 'London', car: 'toyota-camry', date: 'Aug 2026', text: 'Business trip, zero fuss. The car was waiting at Heathrow arrivals and the invoice landed in my inbox.' },
  { name: 'Lucas Ferreira', city: 'Miami', car: 'ford-mustang', date: 'Jul 2026', text: 'Mustang GT down to Key West with the windows open. The assistant answered every question at 2am.' },
];

const initials = (n) => n.split(' ').map((w) => w[0]).join('');

export const reviewHtml = (r, { hidden = false } = {}) => {
  const car = getCar(r.car);
  return `
  <figure class="review${r.featured ? ' review--featured' : ''}"${hidden ? ' aria-hidden="true"' : ''}>
    <div class="review__top">
      <div class="stars" aria-label="5 out of 5 stars">${stars(5)}</div>
      <span class="review__verified">${icon('check')}Verified trip</span>
    </div>
    <blockquote class="review__text"><p>${r.text}</p></blockquote>
    <figcaption class="review__by">
      ${r.img ? pic(r.img, '', '44px') : `<span class="review__initials" aria-hidden="true">${initials(r.name)}</span>`}
      <div><b>${r.name}</b><span>${r.city} · ${r.date}</span></div>
    </figcaption>
    ${car ? `<a class="review__car" href="/car.html?id=${car.id}"${hidden ? ' tabindex="-1"' : ''}>${pic(car.img, '', '56px')}<span>Rented<b>${car.name}</b></span>${icon('arrow-up-right')}</a>` : ''}
  </figure>`;
};
