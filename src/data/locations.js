// open/close are local 24h hours; null means open around the clock.
export const locations = [
  { id: 'dubai', city: 'Dubai', country: 'UAE', name: 'Dubai Marina', address: 'Marina Walk, Tower 3, Dubai, UAE', phone: '+971 4 555 0142', hours: 'Open 24/7', open: null, close: null, tz: 'Asia/Dubai', lat: 25.0805, lng: 55.1403, airport: 'DXB delivery in 30 min', fleet: 18 },
  { id: 'london', city: 'London', country: 'UK', name: 'Mayfair', address: '18 Berkeley Square, London W1J, UK', phone: '+44 20 7946 0321', hours: 'Mon–Sun · 07:00–23:00', open: 7, close: 23, tz: 'Europe/London', lat: 51.5099, lng: -0.1453, airport: 'Heathrow & City delivery', fleet: 16 },
  { id: 'milan', city: 'Milan', country: 'Italy', name: 'Porta Nuova', address: 'Piazza Gae Aulenti 4, 20124 Milano, IT', phone: '+39 02 5550 1180', hours: 'Mon–Sun · 07:00–22:00', open: 7, close: 22, tz: 'Europe/Rome', lat: 45.4836, lng: 9.1903, airport: 'Linate & Malpensa delivery', fleet: 14 },
  { id: 'nice', city: 'Nice', country: 'France', name: 'Côte d’Azur', address: 'Promenade des Anglais 112, 06200 Nice, FR', phone: '+33 4 93 55 01 77', hours: 'Mon–Sun · 07:00–22:00', open: 7, close: 22, tz: 'Europe/Paris', lat: 43.6947, lng: 7.2553, airport: 'NCE Terminal 2 desk', fleet: 12 },
  { id: 'miami', city: 'Miami', country: 'USA', name: 'Brickell', address: '801 Brickell Ave, Miami, FL 33131, USA', phone: '+1 305 555 0199', hours: 'Open 24/7', open: null, close: null, tz: 'America/New_York', lat: 25.7663, lng: -80.1917, airport: 'MIA delivery in 25 min', fleet: 15 },
  { id: 'los-angeles', city: 'Los Angeles', country: 'USA', name: 'Beverly Hills', address: '9500 Wilshire Blvd, Beverly Hills, CA 90212, USA', phone: '+1 310 555 0175', hours: 'Mon–Sun · 06:00–24:00', open: 6, close: 24, tz: 'America/Los_Angeles', lat: 34.0672, lng: -118.4004, airport: 'LAX delivery in 40 min', fleet: 17 },
];

export const getLocation = (id) => locations.find((l) => l.id === id);

// Local time and open status for a branch, computed in its own time zone.
export function branchClock(l, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: l.tz, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
  const h = +parts.find((p) => p.type === 'hour').value % 24;
  const m = +parts.find((p) => p.type === 'minute').value;
  const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  const isOpen = l.open == null || (h >= l.open && h < l.close);
  return { time, isOpen };
}
