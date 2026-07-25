/*
 * data/glossary.js
 *
 * Beginner-friendly money glossary for CashCraft. Written for total
 * beginners ages 12 to 25, with plain language and concrete dollar
 * examples wherever they help the definition click.
 *
 * Exports:
 *   GLOSSARY: Term[]
 *     Term = {
 *       id: string          kebab-case unique identifier
 *       term: string        display term
 *       definition: string  2-3 beginner-friendly sentences, jargon-free
 *       category: 'Earning' | 'Taxes' | 'Banking' | 'Credit & Debt' |
 *                 'Saving & Investing' | 'Budgeting'
 *     }
 */

export const GLOSSARY = [
  // ---- Earning ----
  {
    id: 'gross-pay',
    term: 'Gross Pay',
    definition: 'Gross pay is the total amount you earn before anything gets taken out. If your job pays you $18 an hour and you work 20 hours, your gross pay for that week is $360. Taxes and other deductions come out of this number, not the other way around.',
    category: 'Earning'
  },
  {
    id: 'net-pay',
    term: 'Net Pay',
    definition: 'Net pay is what actually lands in your bank account after taxes and other deductions are subtracted from your gross pay. If your gross pay is $360 and $60 gets taken out for taxes, your net pay is $300. It is sometimes called your take-home pay.',
    category: 'Earning'
  },
  {
    id: 'take-home-pay',
    term: 'Take-Home Pay',
    definition: 'Take-home pay is just another name for net pay, the money you actually get to keep and spend from a paycheck. It is always smaller than your gross pay because of taxes and any other deductions. This is the number to look at when you plan your budget.',
    category: 'Earning'
  },
  {
    id: 'hourly-vs-salary',
    term: 'Hourly vs Salary',
    definition: 'An hourly job pays you a set rate for every hour you work, so a busy week can mean a bigger paycheck. A salaried job pays you a fixed yearly amount split into regular paychecks, no matter how many hours a particular week takes. Salaried jobs often come with more benefits, while hourly jobs give you more flexibility with your schedule.',
    category: 'Earning'
  },
  {
    id: 'w4',
    term: 'W-4',
    definition: 'A W-4 is a form you fill out when you start a new job that tells your employer how much tax to withhold from each paycheck. The answers you give affect whether you owe money or get a refund at tax time. Most people fill one out once and only update it if their situation changes.',
    category: 'Earning'
  },
  {
    id: 'w2',
    term: 'W-2',
    definition: 'A W-2 is a form your employer sends you every January that shows how much you earned and how much tax was withheld the year before. You use it to file your tax return. If you had more than one job during the year, you get a separate W-2 from each employer.',
    category: 'Earning'
  },

  // ---- Taxes ----
  {
    id: 'federal-income-tax',
    term: 'Federal Income Tax',
    definition: 'Federal income tax is money the US government collects from your earnings to pay for things like roads, schools, and national defense. The amount you owe depends on how much you earn and is calculated using tax brackets. Your employer usually withholds an estimate of it from every paycheck.',
    category: 'Taxes'
  },
  {
    id: 'tax-brackets',
    term: 'Tax Brackets',
    definition: 'Tax brackets are income ranges that get taxed at different rates, with higher income taxed at a higher rate. For example, your first several thousand dollars might be taxed at 10 percent while the next chunk is taxed at 12 percent. Only the money inside each range gets taxed at that range\'s rate, not your whole income at once.',
    category: 'Taxes'
  },
  {
    id: 'marginal-tax-rate',
    term: 'Marginal Tax Rate',
    definition: 'Your marginal tax rate is the tax rate applied to your last dollar of income, meaning the rate of the highest bracket you reach. If you earn enough to reach the 22 percent bracket, that 22 percent only applies to the income inside that bracket, not everything you made. It is different from your average tax rate, which blends all your brackets together.',
    category: 'Taxes'
  },
  {
    id: 'standard-deduction',
    term: 'Standard Deduction',
    definition: 'The standard deduction is a flat amount the government lets you subtract from your income before calculating your taxes, lowering how much gets taxed. For a single filer it is around $15,000 in recent years. Most people take this instead of listing out individual expenses because it is simpler and often bigger.',
    category: 'Taxes'
  },
  {
    id: 'fica',
    term: 'FICA',
    definition: 'FICA stands for the Federal Insurance Contributions Act, and it is the tax that funds Social Security and Medicare. You will see it listed on your pay stub, usually taking about 7.65 percent of your gross pay. Every worker pays it, no matter their income level.',
    category: 'Taxes'
  },
  {
    id: 'social-security',
    term: 'Social Security',
    definition: 'Social Security is a government program that pays monthly benefits to retired workers, people with disabilities, and certain family members. It is funded by a 6.2 percent tax taken out of your paycheck while you work. The idea is that today\'s workers fund benefits for today\'s retirees, and future workers will fund yours.',
    category: 'Taxes'
  },
  {
    id: 'medicare',
    term: 'Medicare',
    definition: 'Medicare is a government health insurance program mainly for people age 65 and older. It is funded by a 1.45 percent tax taken out of every paycheck you earn. Even though you will not use the benefits for decades, you start paying into it from your very first job.',
    category: 'Taxes'
  },
  {
    id: 'state-income-tax',
    term: 'State Income Tax',
    definition: 'State income tax is a separate tax some states charge on top of federal income tax, and it goes toward state services like roads and schools. The rate and rules vary a lot by state, and a handful of states charge no income tax at all. It usually gets withheld from your paycheck alongside federal tax.',
    category: 'Taxes'
  },
  {
    id: 'tax-refund',
    term: 'Tax Refund',
    definition: 'A tax refund is money the government sends back to you when you paid in more tax than you actually owed during the year. It is not free money, it is your own money coming back after being withheld too generously. Some people prefer a smaller refund and more cash in each paycheck instead.',
    category: 'Taxes'
  },
  {
    id: 'withholding',
    term: 'Withholding',
    definition: 'Withholding is the amount of tax your employer automatically takes out of your paycheck before you ever see the money. It is an estimate based on your W-4 and your earnings, meant to cover what you will owe at tax time. If too much is withheld you get a refund, and if too little is withheld you owe extra.',
    category: 'Taxes'
  },

  // ---- Banking ----
  {
    id: 'checking-account',
    term: 'Checking Account',
    definition: 'A checking account is a bank account built for everyday spending, like paying bills, swiping a debit card, or paying rent. Money usually moves in and out often, and most checking accounts pay little to no interest. It is the account most paychecks get deposited into first.',
    category: 'Banking'
  },
  {
    id: 'savings-account',
    term: 'Savings Account',
    definition: 'A savings account is a bank account meant for money you are setting aside rather than spending right away. It typically pays a small amount of interest and may limit how often you can withdraw. It is a good home for an emergency fund or money you are saving toward a goal.',
    category: 'Banking'
  },
  {
    id: 'high-yield-savings',
    term: 'High-Yield Savings',
    definition: 'A high-yield savings account is a savings account that pays a much higher interest rate than a typical bank, often found at online banks. While a regular savings account might pay under 1 percent APY, a high-yield account might pay 4 percent or more. Putting $1,000 in one for a year at 4 percent earns you about $40 just for letting it sit there.',
    category: 'Banking'
  },
  {
    id: 'apy',
    term: 'APY',
    definition: 'APY stands for annual percentage yield, and it shows how much your money actually grows in a year including the effect of compound interest. A savings account advertising 4 percent APY means $100 grows to $104 after one year if left untouched. The higher the APY, the faster your savings grow.',
    category: 'Banking'
  },
  {
    id: 'compound-interest',
    term: 'Compound Interest',
    definition: 'Compound interest is interest earned not just on your original money but also on the interest that money already earned. If you have $100 earning 5 percent a year, you earn $5 the first year, then $5.25 the next year because you are now earning interest on $105. Over many years this snowball effect can make savings grow much faster than you would expect.',
    category: 'Banking'
  },
  {
    id: 'interest-rate',
    term: 'Interest Rate',
    definition: 'An interest rate is the percentage cost of borrowing money, or the percentage reward for saving it, usually expressed per year. A savings account with a 4 percent interest rate pays you 4 percent of your balance annually, while a loan with a 6 percent interest rate charges you 6 percent of what you owe. Rates can be fixed for the life of an account or loan, or they can change over time.',
    category: 'Banking'
  },
  {
    id: 'direct-deposit',
    term: 'Direct Deposit',
    definition: 'Direct deposit is when your employer sends your paycheck straight into your bank account electronically instead of handing you a paper check. It usually arrives faster and more reliably than a check you have to deposit yourself. Most jobs ask for your bank account and routing number to set it up.',
    category: 'Banking'
  },
  {
    id: 'overdraft',
    term: 'Overdraft',
    definition: 'An overdraft happens when you spend more money than you actually have in your checking account, causing the balance to go negative. Banks often charge a fee, sometimes $30 or more, every time this happens. Keeping an eye on your balance and building a small cushion helps you avoid overdraft fees entirely.',
    category: 'Banking'
  },
  {
    id: 'debit-card',
    term: 'Debit Card',
    definition: 'A debit card is linked directly to your checking account, so when you use it the money comes straight out of your own balance. Unlike a credit card, you cannot spend money you do not have, which makes it harder to build debt. It is a simple way to spend without carrying cash.',
    category: 'Banking'
  },

  // ---- Credit & Debt ----
  {
    id: 'credit-card',
    term: 'Credit Card',
    definition: 'A credit card lets you borrow money from a bank up to a certain limit to make purchases, which you then have to pay back. If you pay off the full balance every month, you usually avoid paying any interest at all. If you carry a balance, interest charges can add up quickly.',
    category: 'Credit & Debt'
  },
  {
    id: 'credit-limit',
    term: 'Credit Limit',
    definition: 'Your credit limit is the maximum amount a credit card company will let you borrow at one time. If your limit is $1,000 and you have already spent $400, you have $600 left to spend before you max out the card. Going over your limit can trigger fees or a declined charge.',
    category: 'Credit & Debt'
  },
  {
    id: 'credit-utilization',
    term: 'Credit Utilization',
    definition: 'Credit utilization is the percentage of your available credit that you are currently using, and it plays a big role in your credit score. If your limit is $1,000 and you have a $300 balance, your utilization is 30 percent. Keeping utilization under about 30 percent generally helps your credit score.',
    category: 'Credit & Debt'
  },
  {
    id: 'minimum-payment',
    term: 'Minimum Payment',
    definition: 'The minimum payment is the smallest amount a credit card company requires you to pay each month to keep your account in good standing. Paying only the minimum keeps you out of trouble with the card company, but interest keeps building on whatever balance is left. Paying the full statement balance each month is the best way to avoid interest charges.',
    category: 'Credit & Debt'
  },
  {
    id: 'apr',
    term: 'APR',
    definition: 'APR stands for annual percentage rate, and it is the yearly cost of borrowing money on a credit card or loan, including most fees. A credit card with a 22 percent APR that carries a $500 balance for a year could cost you around $110 in interest if nothing else changes. Comparing APRs is one of the best ways to see which loan or card actually costs less.',
    category: 'Credit & Debt'
  },
  {
    id: 'statement-balance',
    term: 'Statement Balance',
    definition: 'Your statement balance is the total amount you owed on your credit card at the end of your last billing cycle. Paying this full amount by the due date is what lets you avoid interest charges completely. It is different from your current balance, which can keep changing as you make new purchases.',
    category: 'Credit & Debt'
  },
  {
    id: 'credit-score',
    term: 'Credit Score',
    definition: 'A credit score is a number, usually between 300 and 850, that summarizes how reliably you have borrowed and repaid money in the past. A higher score can help you get approved for loans, credit cards, and apartments, often at better rates. Paying bills on time and keeping credit utilization low are two of the biggest ways to build a strong score.',
    category: 'Credit & Debt'
  },
  {
    id: 'credit-report',
    term: 'Credit Report',
    definition: 'A credit report is a detailed record of your borrowing history, including loans, credit cards, and whether you paid on time. Lenders look at it to decide whether to approve you and what rate to offer. You are entitled to check your own credit report for free on a regular basis.',
    category: 'Credit & Debt'
  },
  {
    id: 'hard-inquiry',
    term: 'Hard Inquiry',
    definition: 'A hard inquiry happens when a lender checks your credit report because you applied for something like a credit card or loan. Each hard inquiry can lower your credit score by a small amount for a short time. Applying for several cards or loans at once can add up and hurt your score more than expected.',
    category: 'Credit & Debt'
  },
  {
    id: 'debt',
    term: 'Debt',
    definition: 'Debt is money you owe to someone else, whether it is a credit card balance, a student loan, or money borrowed from a friend. Not all debt is bad, but debt that charges high interest can grow quickly if it is not paid down. Understanding what you owe and to whom is the first step to managing it well.',
    category: 'Credit & Debt'
  },
  {
    id: 'principal',
    term: 'Principal',
    definition: 'Principal is the original amount of money borrowed or invested, not counting any interest added on top. If you take out a $5,000 loan, that $5,000 is the principal, and every payment you make either reduces the principal or covers interest. Paying extra toward principal helps you pay off debt faster and pay less interest overall.',
    category: 'Credit & Debt'
  },
  {
    id: 'loan',
    term: 'Loan',
    definition: 'A loan is money borrowed from a lender that you agree to pay back over time, usually with interest added on. Loans can be used for things like cars, homes, or education, and they come with set terms for how long you have to repay them. Missing payments on a loan can hurt your credit score and cost you extra in fees.',
    category: 'Credit & Debt'
  },
  {
    id: 'student-loan',
    term: 'Student Loan',
    definition: 'A student loan is money borrowed specifically to pay for education costs like tuition, books, or housing while in school. Federal student loans usually have lower interest rates and more flexible repayment options than private loans. Because student loans can take years to pay off, it helps to borrow only what you truly need.',
    category: 'Credit & Debt'
  },
  {
    id: 'cosigner',
    term: 'Cosigner',
    definition: 'A cosigner is someone, often a parent, who agrees to be responsible for a loan or credit card if the primary borrower cannot make payments. Having a cosigner can help a young person with little credit history get approved for a loan or apartment. If payments are missed, it affects the cosigner\'s credit too, so it is a big favor to ask for.',
    category: 'Credit & Debt'
  },

  // ---- Saving & Investing ----
  {
    id: '401k',
    term: '401k',
    definition: 'A 401k is a retirement savings account offered through many private employers that lets you set aside part of your paycheck before it gets taxed. Many employers will match a portion of what you contribute, which is essentially free money toward your retirement. Money in a 401k is typically invested and grows over many years until you retire.',
    category: 'Saving & Investing'
  },
  {
    id: '403b',
    term: '403b',
    definition: 'A 403b is a retirement savings account similar to a 401k, but it is offered by schools, hospitals, and nonprofit organizations instead of private companies. It works the same basic way, letting you contribute part of your paycheck and often get an employer match. Teachers, nurses at nonprofit hospitals, and many nonprofit employees typically save through a 403b.',
    category: 'Saving & Investing'
  },
  {
    id: 'employer-match',
    term: 'Employer Match',
    definition: 'An employer match is money your company adds to your retirement account when you contribute your own money, up to a certain limit. For example, a job might match 100 percent of what you put in, up to 4 percent of your salary. If you earn $50,000 and contribute 4 percent, your employer adds another $2,000 a year for free.',
    category: 'Saving & Investing'
  },
  {
    id: 'roth',
    term: 'Roth',
    definition: 'Roth refers to a type of retirement account where you pay taxes on your money now, but withdrawals in retirement are tax free. This is different from a traditional account, where you skip taxes now but pay them later when you withdraw. Roth accounts often make sense for young workers who expect to be in a higher tax bracket later in life.',
    category: 'Saving & Investing'
  },
  {
    id: 'vesting',
    term: 'Vesting',
    definition: 'Vesting is the process of earning full ownership of money your employer contributed to your retirement account over time. If a plan vests over three years and you leave your job after one year, you might only get to keep a portion of the employer match. Your own contributions are always yours immediately, it is the employer\'s contributions that vesting applies to.',
    category: 'Saving & Investing'
  },
  {
    id: 'inflation',
    term: 'Inflation',
    definition: 'Inflation is the general rise in prices over time, which means a dollar buys a little less than it used to. If inflation is 3 percent a year, something that costs $100 today would cost about $103 next year. This is one reason people invest their savings instead of leaving it all in cash, so it has a chance to grow faster than prices rise.',
    category: 'Saving & Investing'
  },

  // ---- Budgeting ----
  {
    id: 'budget',
    term: 'Budget',
    definition: 'A budget is a plan for how you will spend and save your money over a certain period, usually a month. It starts with your income, then splits it across categories like bills, savings, and fun spending. Having a budget helps you spend on purpose instead of wondering where your money went.',
    category: 'Budgeting'
  },
  {
    id: 'needs-vs-wants',
    term: 'Needs vs Wants',
    definition: 'Needs are things you must pay for to live and function, like rent, groceries, and transportation. Wants are things that are nice to have but not essential, like new clothes, video games, or eating out. Telling the two apart is one of the most useful budgeting skills you can build.',
    category: 'Budgeting'
  },
  {
    id: '5030-20-rule',
    term: '50/30/20 Rule',
    definition: 'The 50/30/20 rule is a simple budgeting guideline that suggests spending about 50 percent of your income on needs, 30 percent on wants, and 20 percent on savings or debt payoff. If you take home $1,000 a month, that means roughly $500 for needs, $300 for wants, and $200 toward savings. It is a starting point you can adjust based on your own situation.',
    category: 'Budgeting'
  },
  {
    id: 'emergency-fund',
    term: 'Emergency Fund',
    definition: 'An emergency fund is money set aside specifically for unexpected costs, like a car repair or a medical bill, so you do not have to rely on debt. Many experts suggest saving enough to cover three to six months of essential expenses. Even a small emergency fund of a few hundred dollars can prevent a surprise cost from becoming a crisis.',
    category: 'Budgeting'
  },
  {
    id: 'net-worth',
    term: 'Net Worth',
    definition: 'Net worth is the total value of everything you own minus everything you owe. If you have $2,000 in savings and a $500 credit card balance, your net worth is $1,500. Tracking your net worth over time is a good way to see whether your overall finances are improving.',
    category: 'Budgeting'
  }
];
