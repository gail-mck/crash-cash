/*
 * jobView.js
 * The Job tab: your current paycheck with a live breakdown, hours and
 * benefits controls, a browser of realistic jobs, and a build-your-own
 * job form. All changes flow through ctx.update.
 */

import { el, mount, openModal, closeBtn, whyButton, statRow, pill, segmented } from './components.js';
import { icon } from './icons.js';
import { guideBanner, completeStep } from './guide.js';
import { runPayroll, monthlyGross, employerMatch } from '../engine/payroll.js';
import { usd, clamp } from '../engine/format.js';
import { currentAge } from '../state.js';
import { JOBS, JOB_CATEGORIES } from '../../data/jobs.js';

/* Payroll options for this save, so previews match the real engine exactly. */
function payrollOpts(state) {
  return { extraWithholding: state.settings.extraWithholding || 0 };
}

/* "$16.50/hr" for hourly jobs, "$63,000/yr" for salaried ones. */
function payLabel(job) {
  return job.type === 'hourly'
    ? usd(job.wage) + '/hr'
    : usd(job.salary, { cents: false }) + '/yr';
}

export function renderJobView(ctx) {
  const state = ctx.state;
  const parts = [guideBanner(ctx)];

  if (state.job) {
    /* Section 1: the job you hold and its monthly paycheck preview. */
    parts.push(currentJobCard(ctx));
    /* Section 2: hourly jobs let you choose how many hours to commit. */
    if (state.job.type === 'hourly') parts.push(commitmentCard(ctx));
    /* Section 3: benefits controls, or just the paycheck tax settings. */
    if (state.job.benefitsEligible) parts.push(benefitsCard(ctx));
    else parts.push(el('div', { class: 'card' }, taxControls(ctx)));
  } else {
    /* Empty state: nudge the player toward their first paycheck. */
    parts.push(emptyStateCard());
  }

  /* Section 4: two clear doors instead of a wall of options. */
  parts.push(el('div', { class: 'card' },
    el('h2', {}, icon('search', 20), ' ', state.job ? 'Switch jobs' : 'Find a job'),
    el('p', { class: 'muted' }, 'Search realistic jobs with average pay, or invent your own. You can switch whenever you like.'),
    el('div', { class: 'row' },
      el('button', { class: 'btn primary', onclick: () => openJobPicker(ctx) },
        icon('search', 16), ' Browse & search jobs'),
      el('button', { class: 'btn', onclick: () => openCustomJobModal(ctx) },
        icon('edit', 16), ' Create a custom job'),
    ),
  ));

  return el('div', {}, parts);
}

/* ---- Section 1: current job and paycheck preview ---- */

/* The full monthly paycheck breakdown as stat rows. */
function paycheckRows(state, job) {
  const pay = runPayroll(job, state.ytd, payrollOpts(state));
  const kindId = job.retirementKind === '403b' ? '403b' : '401k';
  const rows = [
    statRow('Gross pay', usd(pay.gross), { why: 'gross-pay' }),
  ];
  if (job.benefitsEligible) {
    rows.push(statRow('Retirement contribution', usd(-pay.retirement), { why: kindId }));
    rows.push(statRow('Employer match (free money)', '+' + usd(pay.match), { why: 'employer-match', tone: 'good' }));
    rows.push(statRow('Health insurance', usd(-pay.health)));
  }
  rows.push(statRow('Federal income tax', usd(-pay.federal), { why: 'federal-income-tax' }));
  rows.push(statRow('FICA (Social Security + Medicare)', usd(-pay.fica.total), { why: 'fica' }));
  rows.push(statRow('State income tax', usd(-pay.state), { why: 'state-income-tax' }));
  rows.push(statRow('Take-home (net) pay', usd(pay.net), { why: 'net-pay', tone: 'good' }));
  return rows;
}

function currentJobCard(ctx) {
  const state = ctx.state;
  const job = state.job;
  return el('div', { class: 'card' },
    el('div', { class: 'row between' },
      el('div', {},
        el('h2', {}, icon('briefcase', 20), ' ' + job.title),
        el('p', { class: 'muted' },
          job.type === 'hourly'
            ? 'Hourly at ' + payLabel(job) + ', ' + (job.hoursPerWeek || 0) + ' hours a week '
            : 'Salaried at ' + payLabel(job) + ' ',
          whyButton('hourly-vs-salary')),
      ),
      el('button', { class: 'btn danger small', onclick: () => confirmQuit(ctx) }, 'Quit job'),
    ),
    el('h3', {}, 'Your monthly paycheck'),
    el('p', { class: 'tiny' }, 'A live preview of next month: what you earn, what comes out, and what actually lands in checking.'),
    paycheckRows(state, job),
  );
}

/* Quitting is a big move, so it gets a confirm modal. */
function confirmQuit(ctx) {
  openModal((close) => [
    closeBtn(close),
    el('h2', {}, 'Quit ' + ctx.state.job.title + '?'),
    el('p', { class: 'muted' },
      'Your paychecks stop right away. Everything already in your accounts stays yours, and your year-to-date taxes stick around, just like in real life.'),
    el('div', { class: 'row mt' },
      el('button', { class: 'btn', onclick: close }, 'Keep the job'),
      el('button', {
        class: 'btn danger',
        onclick: () => { close(); ctx.update((draft) => { draft.job = null; }); },
      }, 'Yes, quit'),
    ),
  ]);
}

/* ---- Section 2: hours commitment slider (hourly jobs only) ---- */

function commitmentCard(ctx) {
  const state = ctx.state;
  const job = state.job;

  /* These two nodes update live while the slider moves; the state only
     changes (and the page only rerenders) when the player lets go. */
  const hoursOut = el('span', { class: 'pill brand' }, (job.hoursPerWeek || 0) + ' hrs/week');
  const previewOut = el('p', { class: 'muted' }, previewText(job.hoursPerWeek || 0));

  function previewText(hours) {
    const pay = runPayroll({ ...job, hoursPerWeek: hours }, state.ytd, payrollOpts(state));
    return 'At ' + hours + ' hours a week you earn about ' + usd(pay.gross) +
      ' gross and take home about ' + usd(pay.net) + ' a month.';
  }

  const slider = el('input', {
    type: 'range', min: 0, max: job.maxHours || 40, step: 1, value: job.hoursPerWeek || 0,
    'aria-label': 'Hours per week',
    oninput: (e) => {
      const hours = Number(e.target.value) || 0;
      hoursOut.textContent = hours + ' hrs/week';
      previewOut.textContent = previewText(hours);
    },
    onchange: (e) => {
      const hours = clamp(Number(e.target.value) || 0, 0, job.maxHours || 40);
      ctx.update((draft) => { draft.job.hoursPerWeek = hours; });
    },
  });

  return el('div', { class: 'card' },
    el('h3', {}, 'Commitment ', hoursOut),
    el('p', { class: 'tiny' },
      'Slide to pick how many hours you work each week, up to ' + (job.maxHours || 40) +
      ' for this job. More hours, bigger paycheck, less free time.'),
    slider,
    previewOut,
  );
}

/* ---- Section 3: benefits panel and paycheck tax settings ---- */

function benefitsCard(ctx) {
  const state = ctx.state;
  const job = state.job;
  const gross = monthlyGross(job);
  const kindId = job.retirementKind === '403b' ? '403b' : '401k';

  /* Live match preview while the contribution slider moves. */
  const pctOut = el('span', { class: 'pill brand' }, (job.contribPct || 0) + '%');
  const matchOut = el('p', { class: 'muted' }, matchText(job.contribPct || 0));

  function matchText(contribPct) {
    if (!job.matchPct || !job.matchCapPct) {
      return 'This job has no employer match, but your own contributions still come out before taxes and grow for future you.';
    }
    if (contribPct <= 0) {
      const full = employerMatch(gross, job.matchCapPct, job.matchPct, job.matchCapPct);
      return 'You are putting in nothing, so your employer adds nothing. Contribute ' +
        job.matchCapPct + '% and they add ' + usd(full) + ' a month for free.';
    }
    const match = employerMatch(gross, contribPct, job.matchPct, job.matchCapPct);
    let text = 'Contribute ' + contribPct + '% and your employer adds ' + usd(match) + ' a month for free.';
    if (contribPct < job.matchCapPct) {
      text += ' Bump it to ' + job.matchCapPct + '% to grab the full match.';
    }
    return text;
  }

  const slider = el('input', {
    type: 'range', min: 0, max: 20, step: 1, value: job.contribPct || 0,
    'aria-label': 'Retirement contribution percent',
    oninput: (e) => {
      const v = Number(e.target.value) || 0;
      pctOut.textContent = v + '%';
      matchOut.textContent = matchText(v);
    },
    onchange: (e) => {
      const v = clamp(Number(e.target.value) || 0, 0, 20);
      ctx.update((draft) => { draft.job.contribPct = v; });
    },
  });

  return el('div', { class: 'card' },
    el('h2', {}, icon('gift', 20), ' Benefits'),
    el('h3', {}, 'Retirement contribution ', pctOut),
    el('p', { class: 'tiny' },
      'A slice of each paycheck goes into your retirement account before taxes. Your employer chips in too.'),
    slider,
    matchOut,
    statRow('Plan type', job.retirementKind || '401k', { why: kindId }),
    statRow('Health insurance premium', usd(job.healthMonthly || 0) + '/month'),
    el('p', { class: 'tiny' }, 'The health premium comes out of your paycheck before taxes, so it also shrinks your tax bill a little.'),
    taxControls(ctx),
  );
}

/*
 * State tax and extra withholding controls. Shared by the benefits panel
 * and the plain settings card for jobs without benefits, since every
 * paycheck has taxes.
 */
function taxControls(ctx) {
  const state = ctx.state;
  const current = state.job.statePct || 0;

  const options = [
    { value: 0, label: 'No state income tax (0%)' },
    { value: 3, label: 'Low tax state (3%)' },
    { value: 5, label: 'Middle of the pack (5%)' },
    { value: 8, label: 'High tax state (8%)' },
  ];
  const select = el('select', {
    'aria-label': 'State income tax rate',
    onchange: (e) => {
      const v = Number(e.target.value) || 0;
      ctx.update((draft) => { draft.job.statePct = v; });
    },
  }, options.map((o) => el('option', { value: o.value, selected: o.value === current }, o.label)));

  const extraInput = el('input', {
    type: 'number', min: 0, max: 500, step: 5,
    value: state.settings.extraWithholding || 0,
    'aria-label': 'Extra withholding dollars per month',
    onchange: (e) => {
      const v = clamp(Math.round(Number(e.target.value) || 0), 0, 500);
      e.target.value = v;
      ctx.update((draft) => { draft.settings.extraWithholding = v; });
    },
  });

  return el('div', {},
    el('h3', { class: 'mt' }, 'Paycheck taxes'),
    el('div', { class: 'grid cols-2' },
      el('label', { class: 'field' },
        el('span', {}, 'State income tax ', whyButton('state-income-tax')),
        select),
      el('label', { class: 'field' },
        el('span', {}, 'Extra withholding ($/month) ', whyButton('withholding')),
        extraInput),
    ),
    el('p', { class: 'tiny' },
      'Extra withholding sends a bit more of each paycheck to the government now. If you overpay, it comes back to you as a refund at tax season. ',
      whyButton('tax-refund')),
  );
}

/* ---- Empty state (no job yet) ---- */

function emptyStateCard() {
  return el('div', { class: 'card' },
    el('h2', {}, icon('briefcase', 20), ' No job yet'),
    el('p', { class: 'muted' },
      'A job is what starts the money flowing. Pick one below, and every time you hit Next Month a paycheck lands in your checking account, with a real breakdown of where every dollar goes.'),
    el('p', { class: 'tiny' }, 'You can switch or quit any time. Nothing here is permanent.'),
  );
}

/* ---- Section 4: the job picker modal (search first, list second) ---- */

function openJobPicker(ctx) {
  const state = ctx.state;
  const age = currentAge(state);
  /* Only jobs this character is old enough to hold right now. */
  const eligible = JOBS.filter((j) => age >= j.minAge);
  const cats = JOB_CATEGORIES.filter((c) => eligible.some((j) => j.category === c));

  let filter = 'all';
  let query = '';

  openModal((close) => {
    const tabsWrap = el('div', { class: 'mb', style: 'margin-top:10px' });
    const listWrap = el('div', { class: 'picker-list' });

    function renderTabs() {
      mount(tabsWrap, segmented(
        [{ value: 'all', label: 'All' }, ...cats.map((c) => ({ value: c, label: c }))],
        filter,
        (v) => { filter = v; renderTabs(); renderList(); },
      ));
    }

    function renderList() {
      const q = query.toLowerCase();
      const shown = eligible.filter((j) =>
        (filter === 'all' || j.category === filter) &&
        (!q || j.title.toLowerCase().includes(q) || j.blurb.toLowerCase().includes(q)));
      mount(listWrap, shown.length
        ? shown.map((j) => jobCardButton(ctx, j, close))
        : el('p', { class: 'muted' }, 'No jobs match. Try another word, or create a custom job instead.'));
    }

    const search = el('input', {
      type: 'text', placeholder: 'Search ' + eligible.length + ' jobs (barista, nurse, ...)',
      oninput: (e) => { query = e.target.value; renderList(); },
    });
    setTimeout(() => search.focus(), 50);

    renderTabs();
    renderList();

    return [
      closeBtn(close),
      el('h2', {}, 'Find a job'),
      el('p', { class: 'tiny' }, 'Pay figures are realistic averages. Jobs you are not old enough for yet will appear as you age.'),
      search,
      tabsWrap,
      listWrap,
    ];
  });
}

/* One clickable job card in the picker list. */
function jobCardButton(ctx, job, closePicker) {
  return el('button', { class: 'jobcard', onclick: () => openJobDetails(ctx, job, closePicker) },
    el('div', { class: 'row between' },
      el('span', { class: 't' }, job.title),
      pill(job.category)),
    el('div', { class: 'pay' }, payLabel(job), ' ', job.benefitsEligible ? pill('Benefits', 'good') : null),
    el('div', { class: 'b' }, job.blurb),
  );
}

/* The details + confirm modal before taking a job. */
function openJobDetails(ctx, job, closePicker) {
  const current = ctx.state.job;
  const isCurrent = !!current && current.jobId === job.id;
  const kindId = job.retirementKind === '403b' ? '403b' : '401k';

  openModal((close) => [
    closeBtn(close),
    el('h2', {}, job.title, ' ', pill(job.category)),
    el('p', { class: 'muted' }, job.blurb),
    statRow('Pay', payLabel(job), { why: 'hourly-vs-salary' }),
    statRow('Hours', job.defaultHours + ' hrs/week to start, up to ' + job.maxHours),
    job.benefitsEligible
      ? [
        statRow('Retirement plan', (job.retirementKind || '401k') + ' with an employer match', { why: kindId }),
        statRow('Employer match (free money)',
          'Up to ' + job.matchPct + '% of pay when you contribute ' + job.matchCapPct + '%',
          { why: 'employer-match', tone: 'good' }),
        statRow('Health insurance', usd(job.healthMonthly) + '/month, taken out before taxes'),
      ]
      : statRow('Benefits', 'None. No health plan or retirement match here.'),
    current
      ? el('p', { class: 'tiny mt' },
        'Switching jobs partway through the year keeps your year-to-date taxes, exactly like real life.')
      : null,
    el('div', { class: 'row mt' },
      el('button', { class: 'btn', onclick: close }, 'Not now'),
      isCurrent
        ? el('button', { class: 'btn', disabled: true }, 'This is your current job')
        : el('button', {
          class: 'btn primary',
          onclick: () => { close(); if (closePicker) closePicker(); takeJob(ctx, job); },
        }, 'Take this job'),
    ),
  ]);
}

/* Take a catalog job, defaulting the contribution to grab the full match. */
function takeJob(ctx, job) {
  ctx.update((draft) => {
    const prevStatePct = draft.job ? draft.job.statePct || 0 : 0;
    draft.job = {
      jobId: job.id,
      title: job.title,
      type: job.type,
      wage: job.wage,
      salary: job.salary,
      hoursPerWeek: job.defaultHours,
      maxHours: job.maxHours,
      benefitsEligible: job.benefitsEligible,
      contribPct: job.benefitsEligible ? job.matchCapPct : 0,
      matchPct: job.matchPct,
      matchCapPct: job.matchCapPct,
      healthMonthly: job.healthMonthly,
      retirementKind: job.retirementKind,
      statePct: prevStatePct,
    };
  });
  completeStep(ctx, 'job');
}

/* ---- Section 5: create a custom job ---- */

function openCustomJobModal(ctx) {
  /*
   * A local form model. Text and number inputs write straight into it on
   * input (no rerender, so focus never jumps); structural toggles like
   * hourly/salary rerender just this form. Nothing global changes until
   * the player hits Create.
   */
  const model = {
    title: '', type: 'hourly', wage: 15, salary: 40000, hours: 15,
    benefits: false, matchPct: 4, matchCapPct: 5, healthMonthly: 120,
    retirementKind: '401k',
  };
  let error = '';
  const body = el('div', {});
  let closeModal = null;

  function numField(label, key, opts = {}) {
    return el('label', { class: 'field' },
      el('span', {}, label),
      el('input', {
        type: 'number', value: model[key], min: 0, step: opts.step || 1,
        oninput: (e) => { model[key] = e.target.value; },
      }));
  }

  function render() {
    mount(body,
      el('label', { class: 'field' },
        el('span', {}, 'Job title'),
        el('input', {
          type: 'text', value: model.title, placeholder: 'e.g. Sneaker reseller',
          oninput: (e) => { model.title = e.target.value; },
        })),
      el('div', { class: 'row mb' },
        segmented([
          { value: 'hourly', label: 'Hourly' },
          { value: 'salary', label: 'Salary' },
        ], model.type, (v) => { model.type = v; render(); }),
        whyButton('hourly-vs-salary')),
      el('div', { class: 'grid cols-2' },
        model.type === 'hourly'
          ? [numField('Pay per hour ($)', 'wage', { step: 0.5 }), numField('Hours per week', 'hours')]
          : numField('Salary per year ($)', 'salary', { step: 1000 })),
      el('div', { class: 'row mb' },
        el('span', { class: 'muted' }, 'Benefits'),
        segmented([
          { value: 'no', label: 'No benefits' },
          { value: 'yes', label: 'Health + retirement' },
        ], model.benefits ? 'yes' : 'no', (v) => { model.benefits = v === 'yes'; render(); })),
      model.benefits ? el('div', { class: 'grid cols-2' },
        numField('Employer match (% of pay)', 'matchPct'),
        numField('Contribution needed for the full match (%)', 'matchCapPct'),
        numField('Health premium ($/month)', 'healthMonthly'),
        el('label', { class: 'field' },
          el('span', {}, 'Plan type ', whyButton(model.retirementKind === '403b' ? '403b' : '401k')),
          segmented([
            { value: '401k', label: '401k' },
            { value: '403b', label: '403b' },
          ], model.retirementKind, (v) => { model.retirementKind = v; render(); })),
      ) : null,
      error ? el('p', { class: 'tiny bad-text' }, error) : null,
      el('button', { class: 'btn primary', onclick: create }, 'Create this job'),
    );
  }

  /* Validate with friendly inline messages, then commit through ctx.update. */
  function create() {
    const title = String(model.title || '').trim();
    const wage = Number(model.wage);
    const salary = Number(model.salary);
    const hours = Math.round(Number(model.hours));

    if (!title) { error = 'Give your job a title first.'; return render(); }
    if (model.type === 'hourly' && !(wage > 0)) {
      error = 'Pay per hour needs to be a number above zero.'; return render();
    }
    if (model.type === 'hourly' && !(hours > 0 && hours <= 80)) {
      error = 'Pick weekly hours between 1 and 80.'; return render();
    }
    if (model.type === 'salary' && !(salary > 0)) {
      error = 'Salary needs to be a number above zero.'; return render();
    }
    const matchPct = Math.max(0, Number(model.matchPct) || 0);
    const matchCapPct = Math.max(0, Number(model.matchCapPct) || 0);
    const healthMonthly = Math.max(0, Number(model.healthMonthly) || 0);
    error = '';

    ctx.update((draft) => {
      const prevStatePct = draft.job ? draft.job.statePct || 0 : 0;
      draft.job = {
        jobId: 'custom-' + Date.now().toString(36),
        title,
        type: model.type,
        wage: model.type === 'hourly' ? wage : null,
        salary: model.type === 'salary' ? salary : null,
        hoursPerWeek: model.type === 'hourly' ? hours : 40,
        maxHours: model.type === 'hourly' ? clamp(Math.max(hours, 40), 1, 80) : 50,
        benefitsEligible: model.benefits,
        contribPct: model.benefits ? matchCapPct : 0,
        matchPct: model.benefits ? matchPct : 0,
        matchCapPct: model.benefits ? matchCapPct : 0,
        healthMonthly: model.benefits ? healthMonthly : 0,
        retirementKind: model.benefits ? model.retirementKind : null,
        statePct: prevStatePct,
      };
    });
    if (closeModal) closeModal();
    completeStep(ctx, 'job');
  }

  render();

  openModal((close) => {
    closeModal = close;
    return [
      closeBtn(close),
      el('h2', {}, 'Create a custom job'),
      el('p', { class: 'muted' },
        'Model a real offer, a side hustle, or a dream gig. The paycheck math treats it exactly like any other job.'),
      body,
    ];
  });
}
