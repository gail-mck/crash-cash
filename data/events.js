/*
 * data/events.js
 *
 * Random life event data for CashCraft. Each event is either an expense
 * (money leaves the player) or a windfall (money comes in). The game
 * picks a random amount between amountMin and amountMax when the event
 * fires, weighted by how common the event should feel.
 *
 * Exports:
 *   EVENTS: Event[]
 *     Event = {
 *       id: string             kebab-case unique identifier
 *       title: string          short title shown to the player
 *       emoji: string          single emoji representing the event
 *       kind: 'expense' | 'windfall'
 *       amountMin: number      lowest possible dollar amount (positive integer)
 *       amountMax: number      highest possible dollar amount (positive integer)
 *       minAge: 12 | 14 | 16 | 18 | 22   youngest age band this event can appear for
 *       weight: number         1-10, how likely this event is relative to others
 *       blurb: string          one sentence, second person, present tense
 *       lesson: string         one sentence takeaway for a beginner
 *     }
 */

export const EVENTS = [
  // ---- Expenses ----
  {
    id: 'cracked-phone-screen',
    title: 'Cracked Phone Screen',
    emoji: '📱',
    kind: 'expense',
    amountMin: 80,
    amountMax: 250,
    minAge: 12,
    weight: 5,
    blurb: 'Your phone slips out of your pocket and the screen cracks on the sidewalk.',
    lesson: 'Unexpected repairs happen, so keeping a little cash set aside really helps.'
  },
  {
    id: 'lost-headphones',
    title: 'Lost Headphones',
    emoji: '🎧',
    kind: 'expense',
    amountMin: 15,
    amountMax: 60,
    minAge: 12,
    weight: 6,
    blurb: 'You realize your headphones are missing after leaving them somewhere.',
    lesson: 'Small replacement costs add up, which is why tracking your spending matters.'
  },
  {
    id: 'bike-flat-tire',
    title: 'Bike Flat Tire',
    emoji: '🚲',
    kind: 'expense',
    amountMin: 10,
    amountMax: 35,
    minAge: 12,
    weight: 5,
    blurb: 'You wake up to find your bike tire flat and need a quick repair.',
    lesson: 'Routine maintenance costs are easier to handle when you plan for them ahead of time.'
  },
  {
    id: 'school-fundraiser',
    title: 'School Fundraiser',
    emoji: '🎟️',
    kind: 'expense',
    amountMin: 5,
    amountMax: 25,
    minAge: 12,
    weight: 7,
    blurb: 'Your school is running a fundraiser and you decide to chip in.',
    lesson: 'Giving to causes you care about is a spending choice worth planning for too.'
  },
  {
    id: 'gift-for-a-friend',
    title: 'Gift for a Friend',
    emoji: '🎁',
    kind: 'expense',
    amountMin: 10,
    amountMax: 50,
    minAge: 12,
    weight: 7,
    blurb: 'A friend has a birthday coming up and you want to get them something nice.',
    lesson: 'Budgeting a little for gifts ahead of time keeps them from feeling like a surprise expense.'
  },
  {
    id: 'pet-vet-visit',
    title: 'Pet Vet Visit',
    emoji: '🐾',
    kind: 'expense',
    amountMin: 40,
    amountMax: 200,
    minAge: 14,
    weight: 4,
    blurb: 'Your pet needs a checkup and you help cover the vet bill.',
    lesson: 'Pets come with real costs, so an emergency fund covers more than just your own accidents.'
  },
  {
    id: 'movie-night-out',
    title: 'Movie Night Out',
    emoji: '🍿',
    kind: 'expense',
    amountMin: 15,
    amountMax: 40,
    minAge: 12,
    weight: 8,
    blurb: 'You head to the movies with friends for tickets and snacks.',
    lesson: 'Fun spending is fine when it fits inside a budget you planned ahead of time.'
  },
  {
    id: 'new-shoes',
    title: 'New Shoes',
    emoji: '👟',
    kind: 'expense',
    amountMin: 30,
    amountMax: 90,
    minAge: 12,
    weight: 6,
    blurb: 'Your old shoes finally wear out and it is time to replace them.',
    lesson: 'Predictable costs like clothing are easier to manage when you expect them.'
  },
  {
    id: 'late-library-fee',
    title: 'Late Library Fee',
    emoji: '📚',
    kind: 'expense',
    amountMin: 3,
    amountMax: 15,
    minAge: 12,
    weight: 5,
    blurb: 'You return a library book a few days late and owe a small fee.',
    lesson: 'Small missed deadlines can turn into small costs, so a reminder system pays off.'
  },
  {
    id: 'concert-tickets',
    title: 'Concert Tickets',
    emoji: '🎤',
    kind: 'expense',
    amountMin: 40,
    amountMax: 150,
    minAge: 14,
    weight: 4,
    blurb: 'Your favorite artist is playing nearby and you buy a ticket to go.',
    lesson: 'Big fun purchases feel better when you saved for them instead of scrambling to cover them.'
  },
  {
    id: 'video-game-purchase',
    title: 'Video Game Purchase',
    emoji: '🎮',
    kind: 'expense',
    amountMin: 20,
    amountMax: 70,
    minAge: 12,
    weight: 6,
    blurb: 'A new game you have been wanting finally goes on sale.',
    lesson: 'Waiting for a sale on wants can stretch your money noticeably further.'
  },
  {
    id: 'spilled-drink-on-laptop',
    title: 'Spilled Drink on Laptop',
    emoji: '💻',
    kind: 'expense',
    amountMin: 50,
    amountMax: 300,
    minAge: 16,
    weight: 2,
    blurb: 'You knock over a drink and it lands right on your laptop keyboard.',
    lesson: 'Big accidents happen without warning, which is exactly what an emergency fund is for.'
  },
  {
    id: 'parking-ticket',
    title: 'Parking Ticket',
    emoji: '🚗',
    kind: 'expense',
    amountMin: 35,
    amountMax: 90,
    minAge: 16,
    weight: 3,
    blurb: 'You come back to your car and find a parking ticket on the windshield.',
    lesson: 'Reading the signs before you park is a free way to avoid an expensive mistake.'
  },
  {
    id: 'car-repair',
    title: 'Car Repair',
    emoji: '🔧',
    kind: 'expense',
    amountMin: 400,
    amountMax: 900,
    minAge: 16,
    weight: 2,
    blurb: 'Your car starts making a strange noise and needs a trip to the mechanic.',
    lesson: 'Car repairs can be one of the biggest surprise costs, so a solid emergency fund really helps.'
  },
  {
    id: 'speeding-ticket',
    title: 'Speeding Ticket',
    emoji: '🚓',
    kind: 'expense',
    amountMin: 100,
    amountMax: 250,
    minAge: 16,
    weight: 2,
    blurb: 'You get pulled over for going a bit too fast and end up with a ticket.',
    lesson: 'Avoidable costs like traffic tickets are some of the easiest expenses to prevent entirely.'
  },
  {
    id: 'dentist-copay',
    title: 'Dentist Copay',
    emoji: '🦷',
    kind: 'expense',
    amountMin: 25,
    amountMax: 120,
    minAge: 14,
    weight: 4,
    blurb: 'You go in for a dental checkup and owe a copay after insurance.',
    lesson: 'Even with insurance, routine checkups usually come with a small out of pocket cost.'
  },
  {
    id: 'birthday-party-gift',
    title: 'Birthday Party Gift',
    emoji: '🎂',
    kind: 'expense',
    amountMin: 15,
    amountMax: 40,
    minAge: 12,
    weight: 6,
    blurb: 'You get invited to a birthday party and want to bring a gift.',
    lesson: 'Social events often come with small costs attached, so it helps to expect them.'
  },
  {
    id: 'lost-wallet',
    title: 'Lost Wallet',
    emoji: '👛',
    kind: 'expense',
    amountMin: 20,
    amountMax: 80,
    minAge: 14,
    weight: 2,
    blurb: 'You misplace your wallet and have to replace the cash and cards inside it.',
    lesson: 'Losing track of your belongings can cost real money, so a safe habit is worth building.'
  },
  {
    id: 'phone-plan-price-hike',
    title: 'Phone Plan Price Hike',
    emoji: '📶',
    kind: 'expense',
    amountMin: 5,
    amountMax: 20,
    minAge: 14,
    weight: 5,
    blurb: 'Your phone carrier raises its monthly price and your bill goes up.',
    lesson: 'Recurring bills can quietly increase over time, so it pays to check them now and then.'
  },
  {
    id: 'laundry-mishap',
    title: 'Laundry Mishap',
    emoji: '👕',
    kind: 'expense',
    amountMin: 10,
    amountMax: 30,
    minAge: 12,
    weight: 5,
    blurb: 'A favorite shirt shrinks in the wash and you need to replace it.',
    lesson: 'Small everyday mistakes are part of life, and a little cushion in your budget covers them.'
  },

  // ---- Windfalls ----
  {
    id: 'birthday-cash',
    title: 'Birthday Cash',
    emoji: '🎉',
    kind: 'windfall',
    amountMin: 20,
    amountMax: 100,
    minAge: 12,
    weight: 8,
    blurb: 'It is your birthday and relatives send you some cash to celebrate.',
    lesson: 'Gift money is a great chance to save part of it before spending the rest.'
  },
  {
    id: 'found-20-dollars',
    title: 'Found Money',
    emoji: '💵',
    kind: 'windfall',
    amountMin: 5,
    amountMax: 20,
    minAge: 12,
    weight: 6,
    blurb: 'You check an old jacket pocket and find some cash you forgot about.',
    lesson: 'Small unexpected finds are a fun reminder to check your stuff before doing laundry.'
  },
  {
    id: 'friend-pays-you-back',
    title: 'Friend Pays You Back',
    emoji: '🤝',
    kind: 'windfall',
    amountMin: 10,
    amountMax: 50,
    minAge: 12,
    weight: 6,
    blurb: 'A friend finally pays you back for something you covered a while ago.',
    lesson: 'Lending money to friends works best when you both agree on when it gets paid back.'
  },
  {
    id: 'tip-jar-great-week',
    title: 'Great Tip Week',
    emoji: '💰',
    kind: 'windfall',
    amountMin: 15,
    amountMax: 60,
    minAge: 16,
    weight: 5,
    blurb: 'Your shifts were busy this week and the tips came in better than usual.',
    lesson: 'Income can vary week to week, so it helps to budget off your average, not your best week.'
  },
  {
    id: 'overtime-bonus',
    title: 'Overtime Bonus',
    emoji: '⏰',
    kind: 'windfall',
    amountMin: 30,
    amountMax: 150,
    minAge: 16,
    weight: 4,
    blurb: 'You pick up extra shifts and your paycheck comes in bigger than expected.',
    lesson: 'Extra income is a great opportunity to boost your savings instead of your regular spending.'
  },
  {
    id: 'tax-refund',
    title: 'Tax Refund',
    emoji: '🧾',
    kind: 'windfall',
    amountMin: 50,
    amountMax: 400,
    minAge: 18,
    weight: 3,
    blurb: 'You file your taxes and get a refund back from the government.',
    lesson: 'A tax refund just means you paid in more than you owed, so it is really your own money coming back.'
  },
  {
    id: 'garage-sale-earnings',
    title: 'Garage Sale Earnings',
    emoji: '🏷️',
    kind: 'windfall',
    amountMin: 10,
    amountMax: 80,
    minAge: 12,
    weight: 5,
    blurb: 'You sell some old stuff you no longer use at a garage sale.',
    lesson: 'Selling things you do not need turns clutter into cash you can put to good use.'
  },
  {
    id: 'grandma-slips-you-cash',
    title: 'Cash from a Relative',
    emoji: '💌',
    kind: 'windfall',
    amountMin: 10,
    amountMax: 50,
    minAge: 12,
    weight: 6,
    blurb: 'A relative slips you some cash just because they were thinking of you.',
    lesson: 'Unexpected gifts feel nicer when you set part of them aside instead of spending it all right away.'
  },
  {
    id: 'sold-old-stuff-online',
    title: 'Sold Old Stuff Online',
    emoji: '📦',
    kind: 'windfall',
    amountMin: 15,
    amountMax: 90,
    minAge: 14,
    weight: 5,
    blurb: 'You list some things you no longer use online and someone buys them.',
    lesson: 'Turning unused items into cash is an easy way to boost your savings without a new job.'
  },
  {
    id: 'tax-free-weekend-savings',
    title: 'Tax-Free Weekend',
    emoji: '🛍️',
    kind: 'windfall',
    amountMin: 10,
    amountMax: 40,
    minAge: 14,
    weight: 5,
    blurb: 'You time your shopping trip during a tax-free weekend and skip the sales tax.',
    lesson: 'Timing purchases around sales events can stretch your money further without changing what you buy.'
  }
];
