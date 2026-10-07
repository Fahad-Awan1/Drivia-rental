// Pure, rule-based reply engine for the Drivia assistant (no network, no AI service).
import { cars, money } from '../data/cars.js';
import { locations } from '../data/locations.js';
import { quote, TIERS } from '../data/pricing.js';
import { intents, FALLBACK, DEFAULT_CHIPS } from '../data/chatbot-kb.js';

const deaccent = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const stem = (t) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t);
export const normalize = (s) =>
  deaccent(String(s).toLowerCase())
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9/ ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(stem);

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

// Does the token list contain this word, allowing small typos for longer words?
const hasWord = (tokens, word) =>
  tokens.some((t) => t === word || (word.length >= 5 && lev(t, word) <= (word.length >= 8 ? 2 : 1)));
const hasPhrase = (tokens, phrase) => ` ${tokens.join(' ')} `.includes(` ${normalize(phrase).join(' ')} `);
const hasAny = (tokens, list) => list.some((k) => (k.includes(' ') ? hasPhrase(tokens, k) : hasWord(tokens, stem(k))));

/* ---------- Cars ---------- */
const GENERIC = new Set(['competition', 'coupe', 'avant', 'hybrid', 'italia', 'gt', 'ss', 'srt', '4s', 'rs', '6', '3', '458', 'model']);
const EXTRA_ALIASES = {
  'tesla-model-3': ['model 3', 'model3'],
  'bmw-m5': ['m5', '5 series'],
  'bmw-m4': ['m4', '4 series'],
  'lamborghini-huracan': ['lambo', 'lamborghini'],
  'mercedes-amg-gt': ['merc', 'mercedes', 'amg', 'benz'],
  'vw-polo': ['vw'],
  'chevrolet-camaro': ['chevy'],
  'audi-rs6': ['rs6', 'rs 6', 'audi'],
  'ferrari-458': ['458', 'ferrari'],
};
const carAliases = cars.map((c) => ({
  car: c,
  words: [...new Set(normalize(c.name).filter((w) => !GENERIC.has(w)))],
  phrases: EXTRA_ALIASES[c.id] || [],
}));

function matchCars(tokens) {
  const scored = carAliases
    .map(({ car, words, phrases }) => {
      let s = 0;
      words.forEach((w) => tokens.includes(w) && (s += 1));
      phrases.forEach((p) => hasPhrase(tokens, p) && (s += 2));
      // typo tolerance on distinctive model names (e.g. "huracan", "panamera", "mustang")
      if (!s) words.forEach((w) => w.length >= 6 && hasWord(tokens, w) && (s += 0.8));
      return { car, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  if (!scored.length) return [];
  return scored.filter((x) => x.s === scored[0].s).map((x) => x.car);
}

function parseDays(text) {
  const t = text.toLowerCase();
  let m;
  if ((m = t.match(/(\d+)\s*(day|days|night|nights|d)\b/))) return +m[1];
  if ((m = t.match(/(\d+)\s*(week|weeks)/))) return +m[1] * 7;
  if ((m = t.match(/(\d+)\s*(month|months)/))) return +m[1] * 30;
  if (/\bweekend\b/.test(t)) return 2;
  if (/\b(a|one|per)\s+week\b|\bweekly\b/.test(t)) return 7;
  if (/\b(a|one|per)\s+month\b|\bmonthly\b/.test(t)) return 30;
  return null;
}

const PRICE_WORDS = ['price', 'cost', 'how much', 'rate', 'quote', 'total', 'charge', 'fee', 'expensive', 'cheap', 'per day'];

const carCard = (c) => ({ type: 'car', car: c });

function carReply(list, tokens, text) {
  const days = parseDays(text);
  const wantsPrice = days || hasAny(tokens, PRICE_WORDS);
  if (list.length > 1) {
    const n = days || 1;
    return {
      html: wantsPrice
        ? `Estimated totals for ${n} day${n > 1 ? 's' : ''} (incl. taxes):<br>` +
          list.slice(0, 3).map((c) => `• <b>${c.name}</b>: ${money(quote({ carId: c.id, days: n }).total)}`).join('<br>')
        : `We have ${list.length} matching cars. Here they are:`,
      cards: list.slice(0, 3).map(carCard),
      chips: list.slice(0, 3).map((c) => `Price of ${c.name} for 3 days`),
    };
  }
  const c = list[0];
  if (wantsPrice) {
    const q = quote({ carId: c.id, days: days || 1 });
    const lines = [
      `<b>${c.name}</b>: ${money(c.price)}/day`,
      `${q.days} day${q.days > 1 ? 's' : ''}: ${money(q.base)}`,
      q.discount ? `Multi-day discount: −${money(q.discount)}` : '',
      `Taxes (8%): ${money(q.tax)}`,
      `<b>Estimated total: ${money(q.total)}</b>`,
      `Refundable deposit: ${money(q.deposit)}`,
    ].filter(Boolean);
    return {
      html: lines.join('<br>'),
      cards: [carCard(c)],
      chips: days ? ['Add insurance?', 'Documents needed'] : [`Price of ${c.name} for 7 days`, 'Extras'],
    };
  }
  const specs = [
    `${c.hp} hp`,
    `0–100 km/h in ${c.accel}s`,
    `${c.seats} seats`,
    c.transmission,
    c.range ? `${c.range} km range` : c.fuel,
  ].join(' · ');
  return {
    html: `<b>${c.name}</b> is available ✅<br>${c.tagline}<br><span class="chat-muted">${specs}</span>`,
    cards: [carCard(c)],
    chips: [`Price of ${c.name} for 3 days`, 'Similar cars', 'Book a car'],
  };
}

/* ---------- Fleet queries ---------- */
const CATEGORY_WORDS = {
  SUV: ['suv', '4x4', 'jeep', 'crossover', 'family car', '7 seater', '8 seater'],
  Sedan: ['sedan', 'saloon'],
  Electric: ['electric', 'ev', 'battery car', 'zero emission', 'eco'],
  Sports: ['sport', 'sports', 'supercar', 'super car', 'convertible', 'coupe', 'muscle', 'exotic'],
  Luxury: ['luxury', 'premium', 'executive', 'business', 'chauffeur car'],
  Economy: ['economy', 'budget', 'small car', 'compact', 'city car'],
};

function fleetReply(tokens, text) {
  let list = [...cars];
  const cats = Object.entries(CATEGORY_WORDS).filter(([, words]) => hasAny(tokens, words)).map(([c]) => c);
  if (cats.length) list = list.filter((c) => cats.includes(c.category));
  const seats = text.match(/(\d+)\s*(seat|seater|people|person|passenger)/i);
  if (seats) list = list.filter((c) => c.seats >= +seats[1]);
  if (hasAny(tokens, ['manual', 'stick'])) list = list.filter((c) => c.transmission === 'Manual');

  let label = 'Here are some favourites';
  if (hasAny(tokens, ['cheapest', 'cheap', 'budget', 'affordable', 'lowest', 'inexpensive', 'low cost'])) {
    list.sort((a, b) => a.price - b.price);
    label = 'Best value picks';
  } else if (hasAny(tokens, ['expensive', 'priciest', 'most expensive', 'exclusive'])) {
    list.sort((a, b) => b.price - a.price);
    label = 'Our most exclusive cars';
  } else if (hasAny(tokens, ['fastest', 'quickest', 'fast', 'quick', 'acceleration'])) {
    list.sort((a, b) => a.accel - b.accel);
    label = 'The quickest cars we have';
  } else if (hasAny(tokens, ['powerful', 'horsepower', 'hp', 'power'])) {
    list.sort((a, b) => b.hp - a.hp);
    label = 'Most powerful cars';
  } else {
    list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.rating - a.rating);
  }
  if (!list.length) return { html: 'No car matches all of that, but our concierge can source one for you.', chips: ['Talk to a human', 'View fleet'] };
  const catTxt = cats.length ? ` (${cats.join(', ')})` : '';
  return {
    html: `${label}${catTxt}. We have <b>${list.length}</b> matching car${list.length > 1 ? 's' : ''}:`,
    cards: list.slice(0, 3).map(carCard),
    links: [['Browse all in the fleet', `/fleet.html${cats.length === 1 ? `?category=${cats[0]}` : ''}`]],
    chips: list.slice(0, 2).map((c) => `Price of ${c.name} for 3 days`),
  };
}

const FLEET_TRIGGERS = [
  ...Object.values(CATEGORY_WORDS).flat(),
  'cheapest', 'cheap', 'affordable', 'expensive', 'fastest', 'quickest', 'powerful', 'fleet', 'show me', 'recommend',
  'suggest', 'available car', 'which car', 'what car', 'list car', 'all car', 'your car', 'seater', 'seat', 'manual', 'similar car',
];

/* ---------- Locations ---------- */
const CITY_ALIASES = {
  dubai: ['dubai', 'uae', 'marina', 'dxb', 'emirates'],
  london: ['london', 'uk', 'mayfair', 'heathrow', 'england'],
  milan: ['milan', 'milano', 'italy', 'malpensa', 'linate'],
  nice: ['cote d azur', 'in nice', 'nice france', 'nice branch', 'nice office', 'nice airport', 'france', 'monaco', 'cannes'],
  miami: ['miami', 'florida', 'brickell'],
  'los-angeles': ['los angeles', 'la', 'beverly hills', 'beverly', 'california', 'lax', 'hollywood'],
};

function locationReply(tokens) {
  const hit = locations.filter((l) => hasAny(tokens, CITY_ALIASES[l.id]));
  if (hit.length) {
    return {
      html: hit
        .map((l) => `📍 <b>${l.city}: ${l.name}</b><br>${l.address}<br>🕒 ${l.hours}<br>✈️ ${l.airport}<br>📞 <a href="tel:${l.phone.replace(/\s/g, '')}">${l.phone}</a>`)
        .join('<br><br>'),
      links: [['Open map', `/locations.html#${hit[0].id}`]],
      chips: ['Delivery options', 'Book a car'],
    };
  }
  if (hasAny(tokens, ['location', 'branch', 'office', 'where are you', 'city', 'cities', 'address', 'where'])) {
    return {
      html: `We’re in <b>${locations.length} cities</b>: ${locations.map((l) => l.city).join(', ')}. Every branch offers airport and hotel delivery.`,
      links: [['See all locations', '/locations.html']],
      chips: locations.slice(0, 3).map((l) => `${l.city} branch`),
    };
  }
  return null;
}

/* ---------- Intents ---------- */
function scoreIntent(intent, tokens) {
  let score = 0;
  for (const k of intent.keywords) {
    if (k.includes(' ')) {
      if (hasPhrase(tokens, k)) score += 3;
    } else {
      const w = stem(normalize(k)[0] || k);
      if (tokens.includes(w)) score += 2;
      else if (w.length >= 5 && hasWord(tokens, w)) score += 1.2;
    }
  }
  return score;
}

const pricingReply = () => ({
  html:
    'Our pricing is simple and all-inclusive of basic insurance:<br>' +
    TIERS.map((t) => `• <b>${t.name}</b> from ${money(t.from)}/day: ${t.cats.join(', ')}`).join('<br>') +
    '<br>15% off for 7+ days, 30% off for 28+ days.',
  links: [['Full pricing & estimator', '/pricing.html']],
  chips: ['Cheapest car', 'Price of BMW M5 for 5 days'],
});

// ctx carries light conversation memory (the last car discussed) between turns.
export function reply(text, ctx = {}) {
  const tokens = normalize(text);
  if (!tokens.length) return { html: 'Type a question and I’ll do my best to help!', chips: DEFAULT_CHIPS };

  // 1. Specific car mentioned
  const matched = matchCars(tokens);
  if (matched.length && !hasAny(tokens, ['similar', 'like this', 'alternative'])) {
    if (matched.length === 1) ctx.lastCar = matched[0].id;
    return carReply(matched, tokens, text);
  }
  if (hasAny(tokens, ['similar', 'alternative', 'like this', 'like it'])) {
    const ref = cars.find((c) => c.id === ctx.lastCar);
    if (ref) {
      const alt = cars.filter((c) => c.category === ref.category && c.id !== ref.id).sort((a, b) => Math.abs(a.price - ref.price) - Math.abs(b.price - ref.price));
      return { html: `Cars similar to the <b>${ref.name}</b>:`, cards: alt.slice(0, 3).map(carCard), links: [[`All ${ref.category} cars`, `/fleet.html?category=${ref.category}`]] };
    }
  }
  // "price for 5 days" right after discussing a car
  if (ctx.lastCar && parseDays(text) && hasAny(tokens, [...PRICE_WORDS, 'for', 'day', 'week', 'month'])) {
    return carReply([cars.find((c) => c.id === ctx.lastCar)], tokens, text);
  }

  // 2. City / branches
  const loc = locationReply(tokens);
  if (loc) {
    if (hasAny(tokens, ['deliver', 'delivery', 'hotel', 'airport'])) loc.html = 'Yes, we deliver there! Door-to-door delivery is a flat <b>$45</b>, free on Signature rentals.<br><br>' + loc.html;
    return loc;
  }

  // 3. Intents (scored) vs fleet search
  const best = intents.map((i) => ({ i, s: scoreIntent(i, tokens) })).sort((a, b) => b.s - a.s)[0];
  const fleetish = hasAny(tokens, FLEET_TRIGGERS);
  if (fleetish && (!best || best.s < 3)) return fleetReply(tokens, text);

  if (hasAny(tokens, ['price', 'pricing', 'cost', 'how much', 'rate', 'tariff']) && (!best || best.s < 2)) return pricingReply();

  if (best && best.s >= 1.2) {
    const { answer, chips, links } = best.i;
    return { html: answer, chips, links };
  }
  if (hasAny(tokens, ['car', 'vehicle', 'ride'])) return fleetReply(tokens, text);
  return { ...FALLBACK, html: FALLBACK.answer };
}
