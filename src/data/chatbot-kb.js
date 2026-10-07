// Hard-coded knowledge base for the Drivia assistant.
// Each intent lists trigger keywords/phrases; the engine scores them against the user's message.
export const DEFAULT_CHIPS = ['Show me SUVs', 'Cheapest car', 'Price of Tesla for 3 days', 'Documents needed', 'Locations'];

export const intents = [
  {
    id: 'greeting',
    keywords: ['hi', 'hello', 'hey', 'salam', 'assalam', 'hola', 'good morning', 'good evening', 'yo', 'sup'],
    answer: 'Hello! 👋 I’m the Drivia assistant. I can help you find a car, check prices, explain our policies or point you to the nearest branch. What are you planning?',
    chips: ['Show me sports cars', 'How does booking work?', 'Locations'],
  },
  {
    id: 'thanks',
    keywords: ['thanks', 'thank you', 'thx', 'appreciate', 'great', 'awesome', 'perfect', 'cool'],
    answer: 'You’re welcome! Anything else I can help with? 🚗',
    chips: ['Book a car', 'Talk to a human'],
  },
  {
    id: 'bye',
    keywords: ['bye', 'goodbye', 'see you', 'later', 'cya'],
    answer: 'Safe travels! I’m here 24/7 if you need anything else. 🛣️',
  },
  {
    id: 'bot',
    keywords: ['who are you', 'are you human', 'are you a bot', 'robot', 'ai', 'your name'],
    answer: 'I’m Drivia’s virtual assistant. I answer instantly from our live fleet and policy data. For anything complex, our human concierge is one tap away.',
    chips: ['Talk to a human'],
  },
  {
    id: 'about',
    keywords: ['what is drivia', 'about drivia', 'about you', 'company', 'who is drivia', 'your company'],
    answer: 'Drivia is a premium car-rental company operating in <b>six cities</b>: Dubai, London, Milan, Nice, Miami and Los Angeles. 18 hand-picked cars, from city runabouts to supercars, with transparent pricing and door-to-door delivery.',
    chips: ['View fleet', 'Locations'],
    links: [['About us', '/about.html']],
  },
  {
    id: 'booking',
    keywords: ['book', 'booking', 'reserve', 'reservation', 'rent', 'how to rent', 'how does booking work', 'how do i book', 'make a booking'],
    answer: 'Booking takes about 2 minutes:<br>1️⃣ Pick your city & dates<br>2️⃣ Choose your car<br>3️⃣ Add extras (insurance, child seat, delivery…)<br>4️⃣ Confirm. You’ll get a booking reference instantly.',
    links: [['Start booking', '/booking.html']],
    chips: ['Documents needed', 'Cancellation policy'],
  },
  {
    id: 'documents',
    keywords: ['document', 'documents', 'licence', 'license', 'passport', 'id', 'requirement', 'requirements', 'what do i need', 'idp', 'international permit'],
    answer: 'You’ll need:<br>• A driving licence held for 1+ year (3+ years for Sports)<br>• Passport or national ID<br>• A credit card in the main driver’s name<br>Visitors from outside the region may need an International Driving Permit.',
    chips: ['Minimum age', 'Security deposit'],
  },
  {
    id: 'age',
    keywords: ['age', 'old', 'minimum age', 'young driver', 'under 25', 'years old', '18', '21'],
    answer: 'Minimum ages: <b>21</b> for Economy, Sedan & SUV · <b>23</b> for Electric & Luxury · <b>25</b> for Sports. Drivers under 25 pay a young-driver fee of $15/day.',
  },
  {
    id: 'deposit',
    keywords: ['deposit', 'security deposit', 'hold', 'pre authorization', 'preauth', 'block'],
    answer: 'We place a refundable hold on your card: <b>$300</b> (Essential), <b>$1,000</b> (most Premium cars) and <b>$2,500</b> (supercars). It’s released 3–7 business days after return.',
  },
  {
    id: 'insurance',
    keywords: ['insurance', 'coverage', 'cover', 'excess', 'cdw', 'protection', 'insured'],
    answer: 'Every rental includes basic insurance with third-party liability. Add <b>Full coverage</b> for $29/day: zero excess, plus tyres, glass and roadside assistance. It’s included free on Signature (sports) rentals.',
    chips: ['Extras', 'Damage or accident'],
  },
  {
    id: 'cancel',
    keywords: ['cancel', 'cancellation', 'refund', 'change booking', 'modify', 'reschedule', 'amend'],
    answer: 'Free cancellation up to <b>24 h</b> (Essential), <b>48 h</b> (Premium) or <b>72 h</b> (Signature) before pickup. Date or car changes are free before pickup, subject to availability.',
  },
  {
    id: 'fuel',
    keywords: ['fuel', 'petrol', 'gas', 'charge', 'charging', 'battery', 'full to full', 'refuel', 'ev charging'],
    answer: 'Petrol & hybrid cars are <b>full-to-full</b>. Electric cars come with 80%+ charge and can be returned with 20% or more at no extra cost. Charging cards are included.',
  },
  {
    id: 'delivery',
    keywords: ['deliver', 'delivery', 'drop off', 'dropoff', 'hotel', 'airport', 'collect', 'pick up', 'pickup', 'bring the car'],
    answer: 'Yes! We deliver to hotels, homes, offices and airports in all six cities. Door-to-door delivery is a flat <b>$45 per trip</b> and free on Signature rentals. Airport delivery usually takes 25–40 minutes.',
    chips: ['Locations', 'One-way rental'],
  },
  {
    id: 'oneway',
    keywords: ['one way', 'oneway', 'another city', 'different city', 'cross border', 'border', 'another country', 'abroad', 'europe'],
    answer: 'One-way rentals between Drivia branches are available for a relocation fee. Cross-border trips are allowed within the EU and UK–EU with prior notice.',
  },
  {
    id: 'payment',
    keywords: ['pay', 'payment', 'card', 'credit card', 'debit', 'cash', 'apple pay', 'paypal', 'crypto', 'visa', 'mastercard'],
    answer: 'We accept Visa, Mastercard, Amex, Apple Pay and Google Pay. The security deposit requires a credit card in the main driver’s name. Cash isn’t accepted.',
  },
  {
    id: 'mileage',
    keywords: ['mileage', 'km', 'kilometer', 'kilometre', 'miles', 'limit', 'unlimited', 'distance'],
    answer: 'Daily allowance: <b>200 km</b> (Essential), <b>350 km</b> (Premium), <b>250 km</b> (Signature). Extra km cost $0.35–$2.50 depending on the car. Monthly rentals include 3,000 km.',
  },
  {
    id: 'discount',
    keywords: ['discount', 'deal', 'offer', 'promo', 'coupon', 'weekly', 'monthly', 'long term', 'cheaper', 'week', 'month'],
    answer: 'Longer trips cost less: <b>15% off</b> for 7+ days and <b>30% off</b> for 28+ days, applied automatically. Subscribe to our newsletter for weekend deals!',
    links: [['See pricing', '/pricing.html']],
  },
  {
    id: 'extras',
    keywords: ['extra', 'extras', 'child seat', 'baby seat', 'gps', 'wifi', 'wi-fi', 'additional driver', 'second driver', 'add on', 'addons'],
    answer: 'Available extras:<br>• Full coverage, $29/day<br>• Additional driver, $12/day<br>• Child seat, $8/day<br>• 5G Wi-Fi hotspot, $9/day<br>• Door-to-door delivery, $45/trip<br>• Professional chauffeur, $190/day',
  },
  {
    id: 'chauffeur',
    keywords: ['chauffeur', 'driver included', 'with driver', 'drive me', 'private driver'],
    answer: 'Prefer to sit back? Add a professional chauffeur for <b>$190/day</b> (8 hours). Perfect for weddings, business trips and airport transfers.',
  },
  {
    id: 'hours',
    keywords: ['hours', 'open', 'opening', 'closing', 'close', 'time', '24/7', 'night'],
    answer: 'Dubai & Miami are open <b>24/7</b>. London 07:00–23:00, Milan & Nice 07:00–22:00, Los Angeles 06:00–24:00. Our concierge line is always open.',
  },
  {
    id: 'contact',
    keywords: ['contact', 'human', 'agent', 'call', 'phone', 'email', 'support', 'speak', 'talk to', 'representative', 'whatsapp'],
    answer: 'Our concierge is available 24/7:<br>📞 <a href="tel:+18005550199">+1 800 555 0199</a><br>✉️ <a href="mailto:hello@drivia.example">hello@drivia.example</a>',
    links: [['Contact page', '/contact.html']],
  },
  {
    id: 'damage',
    keywords: ['accident', 'damage', 'scratch', 'crash', 'breakdown', 'broke down', 'flat tyre', 'flat tire', 'emergency'],
    answer: 'Stay safe first. Then call our 24/7 roadside line on <a href="tel:+18005550199">+1 800 555 0199</a>. We’ll send help or a replacement car. With Full coverage, you pay zero excess.',
  },
  {
    id: 'late',
    keywords: ['late', 'late return', 'return late', 'extend', 'extension', 'keep longer'],
    answer: 'Need more time? Extend from your booking link or ask the concierge. There’s a 59-minute grace period; after that, a full extra day is charged.',
  },
  {
    id: 'pets',
    keywords: ['pet', 'pets', 'dog', 'cat', 'animal'],
    answer: 'Pets are welcome in SUVs and sedans when in a carrier or with a seat cover (we can provide one for free). A cleaning fee applies if extra cleaning is needed.',
  },
  {
    id: 'smoking',
    keywords: ['smoke', 'smoking', 'vape', 'cigarette'],
    answer: 'All Drivia cars are strictly non-smoking. A $250 deep-cleaning fee applies if this is ignored.',
  },
  {
    id: 'help',
    keywords: ['help', 'what can you do', 'options', 'menu', 'question'],
    answer: 'I can help you with:<br>• Finding a car (“fastest car”, “SUV with 7 seats”)<br>• Prices (“price of BMW M5 for 5 days”)<br>• Policies (age, deposit, insurance, cancellation)<br>• Locations & opening hours',
  },
];

export const FALLBACK = {
  answer: 'Hmm, I’m not sure I got that. 🤔 Try asking about a car, prices, documents, delivery or a city, or talk to our concierge.',
  chips: ['Show me SUVs', 'Pricing', 'Talk to a human'],
};
