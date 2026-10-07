import { getCar } from './cars.js';

export const EXTRAS = [
  { id: 'insurance', name: 'Full coverage insurance', desc: 'Zero excess, tyres & glass included', price: 29, per: 'day' },
  { id: 'driver', name: 'Additional driver', desc: 'Share the wheel with one more person', price: 12, per: 'day' },
  { id: 'child-seat', name: 'Child seat', desc: 'ISOFIX, rear-facing or booster', price: 8, per: 'day' },
  { id: 'wifi', name: 'Mobile Wi-Fi hotspot', desc: 'Unlimited 5G data on the road', price: 9, per: 'day' },
  { id: 'delivery', name: 'Door-to-door delivery', desc: 'We bring the car to you and collect it', price: 45, per: 'trip' },
  { id: 'chauffeur', name: 'Professional chauffeur', desc: 'Sit back, we drive (8 h/day)', price: 190, per: 'day' },
];

export const TIERS = [
  { id: 'essential', name: 'Essential', from: 39, blurb: 'Economy & sedans for smart everyday travel.', cats: ['Economy', 'Sedan'], perks: ['200 km/day included', 'Basic insurance', 'Free cancellation 24 h', 'Roadside assistance 24/7'] },
  { id: 'premium', name: 'Premium', from: 99, blurb: 'SUVs, EVs and executive saloons.', cats: ['SUV', 'Electric', 'Luxury'], perks: ['350 km/day included', 'Basic insurance', 'Free cancellation 48 h', 'Airport meet & greet', 'Free additional driver'], popular: true },
  { id: 'signature', name: 'Signature', from: 159, blurb: 'Sports cars & supercars for unforgettable drives.', cats: ['Sports'], perks: ['250 km/day included', 'Full coverage included', 'Free cancellation 72 h', 'Door-to-door delivery', 'Dedicated concierge'] },
];

// Multi-day discounts: weekly 15%, monthly 30%.
export const discountFor = (days) => (days >= 28 ? 0.3 : days >= 7 ? 0.15 : 0);

// fees: optional [{ label, amount }] such as a young-driver or one-way fee (taxed like the rest).
export function quote({ carId, days = 1, extras = [], fees = [] }) {
  const car = getCar(carId);
  if (!car) return null;
  days = Math.max(1, days);
  const base = car.price * days;
  const discount = base * discountFor(days);
  const extrasTotal = extras.reduce((sum, id) => {
    const e = EXTRAS.find((x) => x.id === id);
    return e ? sum + e.price * (e.per === 'day' ? days : 1) : sum;
  }, 0);
  const feesTotal = fees.reduce((s, f) => s + f.amount, 0);
  const subtotal = base - discount + extrasTotal + feesTotal;
  const tax = subtotal * 0.08;
  return { car, days, base, discount, extrasTotal, fees, tax, total: subtotal + tax, deposit: car.price > 400 ? 2500 : car.price > 150 ? 1000 : 300 };
}

export const YOUNG_DRIVER_FEE = 15; // per day, drivers aged 21–24
export const ONE_WAY_FEE = 150; // flat, different return branch
export const minAgeFor = (car) => (car.category === 'Sports' ? 25 : ['Electric', 'Luxury'].includes(car.category) ? 23 : 21);

export const daysBetween = (a, b) => Math.max(1, Math.ceil((new Date(b) - new Date(a)) / 86400000));
