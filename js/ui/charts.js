/*
 * charts.js
 * Tiny dependency-free SVG line charts for history data.
 * Everything scales off the container width via viewBox.
 */

import { el } from './components.js';
import { usd, monthLabel } from '../engine/format.js';

const W = 640;
const H = 200;
const PAD = { top: 14, right: 12, bottom: 24, left: 52 };

/*
 * A multi-series line chart.
 * `series` = [{ label, color (css var name like 'var(--brand)'), points: [{x, y}] }]
 * X values are month indexes; Y values are dollars (or score points).
 * `opts.yFormat` formats axis labels (defaults to usd without cents).
 */
export function lineChart(series, opts = {}) {
  const yFormat = opts.yFormat || ((v) => usd(v, { cents: false }));
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) {
    return el('p', { class: 'muted center' }, opts.emptyText || 'Play a month to start your chart.');
  }

  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs, xMin + 1);
  let yMin = Math.min(...ys, 0);
  let yMax = Math.max(...ys);
  if (yMax === yMin) yMax = yMin + 1;
  const ySpan = yMax - yMin;
  yMax += ySpan * 0.08;
  yMin -= ySpan * 0.04;

  const px = (x) => PAD.left + ((x - xMin) / (xMax - xMin)) * (W - PAD.left - PAD.right);
  const py = (y) => PAD.top + (1 - (y - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);

  const svgParts = [];

  /* Horizontal gridlines with labels at four levels. */
  for (let i = 0; i <= 3; i++) {
    const yVal = yMin + ((yMax - yMin) * i) / 3;
    const y = py(yVal);
    svgParts.push(`<line x1="${PAD.left}" y1="${y}" x2="${W - PAD.right}" y2="${y}" stroke="var(--line)" stroke-width="1"/>`);
    svgParts.push(`<text x="${PAD.left - 6}" y="${y + 4}" text-anchor="end" font-size="10" fill="var(--text-faint)">${escapeXml(yFormat(yVal))}</text>`);
  }
  /* Zero line stands out when the range crosses zero. */
  if (yMin < 0 && yMax > 0) {
    svgParts.push(`<line x1="${PAD.left}" y1="${py(0)}" x2="${W - PAD.right}" y2="${py(0)}" stroke="var(--text-faint)" stroke-width="1" stroke-dasharray="3 3"/>`);
  }

  for (const s of series) {
    if (!s.points.length) continue;
    const path = s.points
      .map((p, i) => (i === 0 ? 'M' : 'L') + px(p.x).toFixed(1) + ' ' + py(p.y).toFixed(1))
      .join(' ');
    svgParts.push(`<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`);
    const last = s.points[s.points.length - 1];
    svgParts.push(`<circle cx="${px(last.x).toFixed(1)}" cy="${py(last.y).toFixed(1)}" r="3.5" fill="${s.color}"/>`);
  }

  /* First and last month labels on the x axis. */
  const startLabel = opts.xLabel ? opts.xLabel(xMin) : monthLabel(xMin);
  const endLabel = opts.xLabel ? opts.xLabel(xMax) : monthLabel(xMax);
  svgParts.push(`<text x="${PAD.left}" y="${H - 6}" font-size="10" fill="var(--text-faint)">${escapeXml(startLabel)}</text>`);
  svgParts.push(`<text x="${W - PAD.right}" y="${H - 6}" text-anchor="end" font-size="10" fill="var(--text-faint)">${escapeXml(endLabel)}</text>`);

  const wrap = el('div', { class: 'chart-wrap' });
  wrap.innerHTML = `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="chart">${svgParts.join('')}</svg>`;

  const legend = el('div', { class: 'legend' },
    series.map((s) => el('span', {}, el('i', { style: 'background:' + s.color }), s.label)));
  return el('div', {}, wrap, series.length > 1 ? legend : null);
}

/* Build chart series from state.history for the given keys. */
export function historySeries(history, keys) {
  return keys.map(({ key, label, color }) => ({
    label,
    color,
    points: history
      .filter((h) => h[key] != null)
      .map((h) => ({ x: h.monthIndex, y: h[key] })),
  }));
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
