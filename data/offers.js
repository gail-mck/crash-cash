/*
 * data/offers.js
 *
 * Fictional financial offers sent to the player during the Crash Cash
 * simulation: credit cards, checking accounts, high-yield savings
 * accounts, and investments. Some are genuinely good, some are mediocre
 * with hidden costs, and some are outright predatory or scams. The
 * player is meant to learn by reading (or failing to read) the fine
 * print before accepting. Quality is intentionally never labeled in
 * the visible copy, only in the hidden `quality` field and revealed
 * afterward through `lesson`.
 *
 * Exports:
 *   OFFERS: Offer[]
 *     Offer = {
 *       id: string
 *       kind: 'credit-card' | 'checking' | 'hysa' | 'investment'
 *       company: string
 *       headline: string
 *       pitch: string
 *       minAge: number
 *       pushy: boolean
 *       weight: number
 *       quality: 'good' | 'mixed' | 'bad'
 *       terms: object (shape depends on kind, see individual entries)
 *       fineprint: { label: string, value: string, tone: 'good'|'bad'|'neutral' }[]
 *       lesson: string
 *       glossaryId: string (must match an id in data/glossary.js)
 *     }
 */

export const OFFERS = [
  // ---- Credit cards ----
  {
    id: 'everyday-simple-card',
    kind: 'credit-card',
    company: 'Granite Trust',
    headline: 'A Credit Card That Does Exactly What It Says',
    pitch: 'No annual fee, a straightforward rate, and enough credit to build a real payment history. Nothing flashy, nothing hidden.',
    minAge: 18,
    pushy: false,
    weight: 6,
    quality: 'good',
    terms: { limit: 1500, apr: 19.99, annualFee: 0, rewardsPct: 1, signupBonus: 0 },
    fineprint: [
      { label: 'Annual fee', value: '$0', tone: 'good' },
      { label: 'APR', value: '19.99% (variable)', tone: 'neutral' },
      { label: 'Rewards', value: '1% cash back on all purchases', tone: 'good' },
      { label: 'Signup bonus', value: 'None', tone: 'neutral' }
    ],
    lesson: 'A card with no annual fee and a plainly disclosed APR is easy to evaluate honestly. Boring terms you can read in ten seconds are usually a better sign than a flashy bonus.',
    glossaryId: 'apr'
  },
  {
    id: 'starburst-rewards-card',
    kind: 'credit-card',
    company: 'Meteor Card Co.',
    headline: 'EARN BIG WITH EVERY SWIPE!',
    pitch: 'Rack up 2% cash back on every purchase and pocket a $200 bonus just for signing up. Your wallet has never worked this hard for you.',
    minAge: 18,
    pushy: true,
    weight: 7,
    quality: 'bad',
    terms: { limit: 4000, apr: 29.99, annualFee: 95, rewardsPct: 2, signupBonus: 200 },
    fineprint: [
      { label: 'Annual fee', value: '$95, charged every year', tone: 'bad' },
      { label: 'APR', value: '29.99% (variable)', tone: 'bad' },
      { label: 'Signup bonus', value: '$200 after $1,000 spent in 90 days', tone: 'neutral' },
      { label: 'Rewards', value: '2% cash back on all purchases', tone: 'good' }
    ],
    lesson: 'A juicy bonus and cash back mean nothing if you carry a balance at 29.99% APR, since interest wipes out the rewards fast. Read the APR and fee before you look at the bonus.',
    glossaryId: 'apr'
  },
  {
    id: 'silver-key-card',
    kind: 'credit-card',
    company: 'Silver Key Financial',
    headline: 'APPROVED IN MINUTES, NO CREDIT CHECK HASSLE!',
    pitch: 'Building credit is hard when nobody gives you a chance. Silver Key says yes fast, so you can start using credit today.',
    minAge: 18,
    pushy: true,
    weight: 5,
    quality: 'bad',
    terms: { limit: 300, apr: 34.99, annualFee: 75, rewardsPct: 0, signupBonus: 0 },
    fineprint: [
      { label: 'Annual fee', value: '$75, deducted from your limit on approval', tone: 'bad' },
      { label: 'APR', value: '34.99% (variable)', tone: 'bad' },
      { label: 'Starting limit', value: '$300', tone: 'bad' },
      { label: 'Rewards', value: 'None', tone: 'neutral' }
    ],
    lesson: 'A tiny limit, a steep annual fee that eats into it immediately, and a near-maximum APR are the fingerprints of a card built for people the issuer expects to struggle, not to succeed.',
    glossaryId: 'credit-limit'
  },
  {
    id: 'first-step-card',
    kind: 'credit-card',
    company: 'Anchor Point Credit Union',
    headline: 'Your First Card, Built to Build Credit',
    pitch: 'A small limit and a simple rate designed for people just starting out. Pay it off monthly and watch your credit history grow.',
    minAge: 18,
    pushy: false,
    weight: 5,
    quality: 'mixed',
    terms: { limit: 500, apr: 22.99, annualFee: 0, rewardsPct: 0, signupBonus: 0 },
    fineprint: [
      { label: 'Annual fee', value: '$0', tone: 'good' },
      { label: 'APR', value: '22.99% (variable)', tone: 'neutral' },
      { label: 'Starting limit', value: '$500, may increase with on-time payments', tone: 'neutral' },
      { label: 'Rewards', value: 'None', tone: 'neutral' }
    ],
    lesson: 'No annual fee is a genuine plus, but a 22.99% APR still costs real money if you carry a balance. A starter card is a good idea only if you plan to pay it off in full each month.',
    glossaryId: 'credit-utilization'
  },
  {
    id: 'voyager-travel-card',
    kind: 'credit-card',
    company: 'Voyager Financial',
    headline: 'Turn Everyday Spending Into Your Next Trip',
    pitch: 'Earn accelerated rewards on travel and dining, with airport perks that make the annual fee feel small once you use them.',
    minAge: 18,
    pushy: false,
    weight: 4,
    quality: 'mixed',
    terms: { limit: 6000, apr: 24.99, annualFee: 95, rewardsPct: 1.5, signupBonus: 100 },
    fineprint: [
      { label: 'Annual fee', value: '$95 every year', tone: 'bad' },
      { label: 'APR', value: '24.99% (variable)', tone: 'bad' },
      { label: 'Rewards', value: '1.5% back, higher on travel purchases', tone: 'good' },
      { label: 'Signup bonus', value: '$100 after $500 spent in 90 days', tone: 'neutral' }
    ],
    lesson: 'A fee card can be worth it if the rewards you actually earn exceed the fee, but that only works if you pay the statement balance in full every month and spend enough to clear the fee.',
    glossaryId: 'statement-balance'
  },

  // ---- Checking accounts ----
  {
    id: 'swiftnest-free-checking',
    kind: 'checking',
    company: 'SwiftNest Bank',
    headline: 'Checking That Just Works, Free Forever',
    pitch: 'No monthly fee, no minimum balance, no surprises. Just a place for your money to live between paychecks.',
    minAge: 16,
    pushy: false,
    weight: 7,
    quality: 'good',
    terms: { monthlyFee: 0, feeWaiverNote: '', perk: 'Free ATM withdrawals nationwide' },
    fineprint: [
      { label: 'Monthly fee', value: '$0', tone: 'good' },
      { label: 'Minimum balance', value: 'None required', tone: 'good' },
      { label: 'Overdraft fee', value: '$0, transactions are simply declined', tone: 'good' },
      { label: 'ATM access', value: 'Free at any ATM nationwide', tone: 'good' }
    ],
    lesson: 'A checking account with no fee, no minimum, and no overdraft penalty has nothing hiding in the fine print, which is exactly what a plain everyday account should look like.',
    glossaryId: 'checking-account'
  },
  {
    id: 'prestige-checking',
    kind: 'checking',
    company: 'Ironvale Bank',
    headline: 'Live the Prestige Life',
    pitch: 'Priority service, a metal-look card, and a banking experience built for people who expect more. You deserve an account that matches your ambition.',
    minAge: 18,
    pushy: true,
    weight: 5,
    quality: 'bad',
    terms: { monthlyFee: 15, feeWaiverNote: '', perk: 'Metallic-look debit card' },
    fineprint: [
      { label: 'Monthly fee', value: '$15, no way to waive it', tone: 'bad' },
      { label: 'Minimum balance', value: 'None, fee applies regardless of balance', tone: 'bad' },
      { label: 'Overdraft fee', value: '$35 per occurrence', tone: 'bad' },
      { label: 'Perk', value: 'Metallic-look debit card', tone: 'neutral' }
    ],
    lesson: 'A $15 monthly fee that never waives costs $180 a year for a checking account that functions the same as a free one. The only real difference here is the card looks shinier.',
    glossaryId: 'overdraft'
  },
  {
    id: 'everyday-plus-checking',
    kind: 'checking',
    company: 'Coppertown Bank',
    headline: 'Everyday Plus: More Banking, More Rewards',
    pitch: 'Unlock a fee-free experience and small perks once your balance qualifies. Most members bank free every month.',
    minAge: 16,
    pushy: false,
    weight: 5,
    quality: 'mixed',
    terms: { monthlyFee: 12, feeWaiverNote: 'Fee waived with $1,500 minimum balance which you may not keep', perk: 'Small cash back on debit purchases' },
    fineprint: [
      { label: 'Monthly fee', value: '$12', tone: 'bad' },
      { label: 'Fee waiver', value: 'Waived only if your balance never drops below $1,500', tone: 'bad' },
      { label: 'Perk', value: '0.25% cash back on debit purchases', tone: 'neutral' },
      { label: 'Overdraft fee', value: '$30 per occurrence', tone: 'bad' }
    ],
    lesson: 'A waiver that depends on keeping $1,500 parked in a checking account is not really free for most people living paycheck to paycheck. Read the waiver condition, not just the advertised fee.',
    glossaryId: 'checking-account'
  },
  {
    id: 'community-first-checking',
    kind: 'checking',
    company: 'Community First Credit Union',
    headline: 'Banking Built Around You, Not Fees',
    pitch: 'A no-fee checking account with early payday access, run by a credit union that answers the phone when you call.',
    minAge: 12,
    pushy: false,
    weight: 6,
    quality: 'good',
    terms: { monthlyFee: 0, feeWaiverNote: '', perk: 'Get your paycheck up to 2 days early' },
    fineprint: [
      { label: 'Monthly fee', value: '$0', tone: 'good' },
      { label: 'Minimum balance', value: 'None required', tone: 'good' },
      { label: 'Perk', value: 'Direct deposit up to 2 days early', tone: 'good' },
      { label: 'Overdraft fee', value: '$0, opts you out by default', tone: 'good' }
    ],
    lesson: 'When a bank makes money from the relationship instead of from fees, the account tends to look like this one: free, simple, and upfront about what you get.',
    glossaryId: 'direct-deposit'
  },

  // ---- High-yield savings accounts ----
  {
    id: 'granite-trust-hysa',
    kind: 'hysa',
    company: 'Granite Trust',
    headline: 'A Savings Rate That Stays Put',
    pitch: 'Earn a steady 4.2% APY with no teaser tricks and no games. The rate you see today is the rate you keep earning.',
    minAge: 16,
    pushy: true,
    weight: 6,
    quality: 'good',
    terms: { apy: 4.2, teaserMonths: 0, afterApy: 4.2 },
    fineprint: [
      { label: 'APY', value: '4.2%, ongoing rate', tone: 'good' },
      { label: 'Teaser period', value: 'None, this is the ongoing rate', tone: 'good' },
      { label: 'Minimum balance', value: 'None required to earn the rate', tone: 'good' },
      { label: 'Withdrawal limit', value: '6 per month, standard for savings accounts', tone: 'neutral' }
    ],
    lesson: 'An honest high-yield savings account states one APY and keeps it. If a rate has no teaser period and no separate after-rate, it usually means what it says, even when the ad feels urgent.',
    glossaryId: 'apy'
  },
  {
    id: 'solarpeak-savings',
    kind: 'hysa',
    company: 'SolarPeak Bank',
    headline: 'BLAZING 5.5% APY, LIMITED TIME!',
    pitch: 'Watch your savings light up with an eye-popping 5.5% APY. Open today before this incredible rate disappears.',
    minAge: 16,
    pushy: true,
    weight: 6,
    quality: 'bad',
    terms: { apy: 5.5, teaserMonths: 3, afterApy: 0.5 },
    fineprint: [
      { label: 'Intro APY', value: '5.5% for the first 3 months only', tone: 'bad' },
      { label: 'Rate after intro', value: 'Drops to 0.5% APY', tone: 'bad' },
      { label: 'Renewal', value: 'No automatic return to a competitive rate', tone: 'bad' },
      { label: 'Minimum balance', value: 'None required', tone: 'neutral' }
    ],
    lesson: 'A headline rate that only lasts 3 months and then crashes to 0.5% is a teaser, not a real return. Always check how long the advertised APY actually lasts before you calculate your earnings.',
    glossaryId: 'apy'
  },
  {
    id: 'comfort-savings',
    kind: 'hysa',
    company: 'Comfort Bank',
    headline: 'High-Yield Savings, The Comfortable Way',
    pitch: 'A relaxed savings account with a rate that beats what your old bank pays. Comfortable growth for your comfortable life.',
    minAge: 16,
    pushy: false,
    weight: 5,
    quality: 'mixed',
    terms: { apy: 1.0, teaserMonths: 0, afterApy: 1.0 },
    fineprint: [
      { label: 'APY', value: '1.0%, permanent rate', tone: 'bad' },
      { label: 'Teaser period', value: 'None, but the base rate is low', tone: 'neutral' },
      { label: 'Comparison', value: 'Marketed as high-yield, though online competitors pay 4%+', tone: 'bad' },
      { label: 'Minimum balance', value: 'None required', tone: 'neutral' }
    ],
    lesson: 'Being labeled high-yield does not guarantee a competitive rate. A permanent 1% APY is technically honest, but it is far below what real high-yield accounts pay, so always compare the actual number.',
    glossaryId: 'high-yield-savings'
  },
  {
    id: 'anchor-point-hysa',
    kind: 'hysa',
    company: 'Anchor Point Credit Union',
    headline: 'Member-Owned Savings, Member-Sized Returns',
    pitch: 'As a member-owned credit union, we pass our earnings back to you in the form of a strong, steady savings rate.',
    minAge: 16,
    pushy: false,
    weight: 5,
    quality: 'good',
    terms: { apy: 4.4, teaserMonths: 0, afterApy: 4.4 },
    fineprint: [
      { label: 'APY', value: '4.4%, fixed ongoing rate', tone: 'good' },
      { label: 'Teaser period', value: 'None', tone: 'good' },
      { label: 'Membership', value: 'Free to join, no purchase required', tone: 'good' },
      { label: 'Withdrawal limit', value: '6 per month, standard for savings accounts', tone: 'neutral' }
    ],
    lesson: 'Credit unions often pay competitive rates because they return profits to members rather than shareholders. A steady, above-average APY with no teaser gimmick is worth comparing against big-bank offers.',
    glossaryId: 'compound-interest'
  },

  // ---- Investments ----
  {
    id: 'steadfast-index-fund',
    kind: 'investment',
    company: 'Steadfast Capital',
    headline: 'Slow, Steady, and Historically Reliable',
    pitch: 'A broad market index fund that owns a little of everything. It will not make you rich overnight, but history says patience pays.',
    minAge: 18,
    pushy: false,
    weight: 6,
    quality: 'good',
    terms: { minimum: 500, returnPct: 7, risk: 'steady', collapseMonths: 0 },
    fineprint: [
      { label: 'Historical average return', value: 'About 7% per year, not guaranteed', tone: 'neutral' },
      { label: 'Risk level', value: 'Broad market index, value can drop in bad years', tone: 'neutral' },
      { label: 'Insurance', value: 'Not FDIC insured, this is an investment, not a deposit', tone: 'neutral' },
      { label: 'Minimum investment', value: '$500', tone: 'neutral' }
    ],
    lesson: 'A fund that admits its returns are not guaranteed and shows a realistic historical average is behaving honestly. Real investing involves risk, and no legitimate fund promises a fixed outcome.',
    glossaryId: 'compound-interest'
  },
  {
    id: 'highline-growth-fund',
    kind: 'investment',
    company: 'Highline Capital Partners',
    headline: 'AGGRESSIVE GROWTH FOR AGGRESSIVE GOALS',
    pitch: 'Our fund managers chase the biggest opportunities in the market, targeting explosive growth other funds are too cautious to touch.',
    minAge: 18,
    pushy: true,
    weight: 5,
    quality: 'mixed',
    terms: { minimum: 1000, returnPct: 15, risk: 'volatile', collapseMonths: 0 },
    fineprint: [
      { label: 'Target return', value: 'Managers target 15% per year', tone: 'bad' },
      { label: 'Actual historical range', value: '4% to 10% per year, with losing years included', tone: 'bad' },
      { label: 'Volatility', value: 'Value can swing sharply up or down in a single quarter', tone: 'bad' },
      { label: 'Minimum investment', value: '$1,000', tone: 'neutral' }
    ],
    lesson: 'The advertised target return and the actual historical performance are two different numbers. A fund that leads with an ambitious target but buries a much lower real track record is overselling, even if it is not a scam.',
    glossaryId: 'inflation'
  },
  {
    id: 'coinsurge-vault',
    kind: 'investment',
    company: 'CoinSurge Vault',
    headline: 'GUARANTEED 30% RETURNS, EVERY SINGLE MONTH!',
    pitch: 'Our proprietary digital asset algorithm guarantees you 30% growth, month after month, no matter what the market does. Early investors are already retiring.',
    minAge: 18,
    pushy: true,
    weight: 6,
    quality: 'bad',
    terms: { minimum: 200, returnPct: 30, risk: 'scam', collapseMonths: 4 },
    fineprint: [
      { label: 'Guarantee', value: 'Returns not FDIC insured and not guaranteed by any regulator', tone: 'bad' },
      { label: 'Registration', value: 'Company registered in international waters, no US oversight', tone: 'bad' },
      { label: 'Claimed return', value: '30% monthly, far above any real market average', tone: 'bad' },
      { label: 'Withdrawals', value: 'Delayed processing, sometimes weeks', tone: 'bad' }
    ],
    lesson: 'No legitimate investment can guarantee 30% monthly returns. Real markets do not work that way, and a guarantee that big paired with an offshore registration and slow withdrawals is a classic sign of a scheme that eventually collapses.',
    glossaryId: 'principal'
  },
  {
    id: 'harborlight-lending-circle',
    kind: 'investment',
    company: 'Harborlight Lending Circle',
    headline: 'Earn 18% Funding Real People, Real Loans',
    pitch: 'Join our private lending circle and earn 18% annually by funding short-term loans to small business owners. Feel good and get paid.',
    minAge: 18,
    pushy: true,
    weight: 5,
    quality: 'bad',
    terms: { minimum: 250, returnPct: 18, risk: 'scam', collapseMonths: 6 },
    fineprint: [
      { label: 'Loan documentation', value: 'No public records of the loans being funded', tone: 'bad' },
      { label: 'Regulatory status', value: 'Not registered as a securities offering', tone: 'bad' },
      { label: 'Claimed return', value: '18% annually, paid out from new investor deposits', tone: 'bad' },
      { label: 'Early withdrawal', value: 'Forfeits 50% of your balance', tone: 'bad' }
    ],
    lesson: 'When a fund cannot show you what it actually invests in, or pays existing investors with new investors money, that is the structure of a Ponzi scheme, not a lending business. Always ask what your money is actually funding.',
    glossaryId: 'loan'
  },
  {
    id: 'bedrock-balanced-fund',
    kind: 'investment',
    company: 'Bedrock Capital',
    headline: 'A Balanced Approach to Growing What You Have',
    pitch: 'A mix of stocks and bonds designed to smooth out the ride while still growing your money over time.',
    minAge: 18,
    pushy: false,
    weight: 4,
    quality: 'mixed',
    terms: { minimum: 300, returnPct: 9, risk: 'volatile', collapseMonths: 0 },
    fineprint: [
      { label: 'Claimed return', value: 'Marketed at 9% per year', tone: 'bad' },
      { label: 'Actual historical range', value: '4% to 8% per year depending on the market', tone: 'neutral' },
      { label: 'Fund fee', value: '1.2% annual management fee, taken from returns automatically', tone: 'bad' },
      { label: 'Minimum investment', value: '$300', tone: 'neutral' }
    ],
    lesson: 'A management fee quietly eats into your real return every year, and a marketed return that sits above the honest historical range is a sign to check the fund prospectus closely before investing.',
    glossaryId: 'net-worth'
  }
];
