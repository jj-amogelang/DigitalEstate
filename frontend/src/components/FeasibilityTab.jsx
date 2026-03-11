/**
 * FeasibilityTab.jsx
 * -------------------
 * Six embedded investment calculators rendered inside the CoG result pane.
 *
 * Calculators
 * ----------
 *  1. bond              – Bond affordability (monthly payment / total interest)
 *  2. cash_on_cash      – Cash-on-Cash ROI, cap rate, gross/net yield
 *  3. irr               – Internal Rate of Return + equity multiple
 *  4. rent_sensitivity  – NOI/cash-flow across a vacancy sweep (0–50 %)
 *  5. vacancy_stress    – Scenario-based vacancy stress test
 *  6. renovation_uplift – Before / after valuation + ROI on reno spend
 *
 * Props
 * -----
 *  cogResult  object|null   – current CoG solve result (used for smart defaults)
 *  areaStats  object|null   – area statistics (rental_yield, price_per_sqm, …)
 *  apiBase    string        – resolved backend base URL
 */
import React, { useState, useCallback } from 'react';
import './styles/FeasibilityTab.css';

// ── Helpers ───────────────────────────────────────────────────────────────

const R = (v, dp = 0) =>
  v == null ? '—' : Number(v).toLocaleString('en-ZA', { maximumFractionDigits: dp });

const Rands = (v, dp = 0) => v == null ? '—' : `R ${R(v, dp)}`;
const Pct   = (v, dp = 1) => v == null ? '—' : `${Number(v).toFixed(dp)} %`;

function cls(...parts) { return parts.filter(Boolean).join(' '); }

// ── Calc meta ─────────────────────────────────────────────────────────────

const CALCS = [
  { key: 'bond',              label: 'Bond',          icon: '🏦' },
  { key: 'cash_on_cash',      label: 'Cash on Cash',  icon: '💰' },
  { key: 'irr',               label: 'IRR',           icon: '📈' },
  { key: 'rent_sensitivity',  label: 'Rent Sensitivity', icon: '🔄' },
  { key: 'vacancy_stress',    label: 'Vacancy Stress', icon: '⚠️' },
  { key: 'renovation_uplift', label: 'Reno Uplift',   icon: '🔨' },
];

// ── Field definitions per calculator ─────────────────────────────────────

function fieldDefs(calcKey, cogResult, areaStats) {
  // Smart defaults lifted from available context
  const price  = null;   // User must enter
  const rent   = null;
  const primeRate = 11.75;  // SA prime as of 2026 (indicative)
  const primePlus = primeRate + 2;  // Typical bond rate

  switch (calcKey) {
    case 'bond':
      return [
        { key: 'purchase_price', label: 'Purchase Price',   unit: 'R',  type: 'number', default: price ?? '',    required: true },
        { key: 'deposit',        label: 'Deposit',           unit: 'R',  type: 'number', default: '',             required: false },
        { key: 'annual_rate',    label: 'Interest Rate',     unit: '%',  type: 'number', default: primePlus,      required: true,  step: 0.25 },
        { key: 'term_years',     label: 'Term',              unit: 'yrs',type: 'number', default: 20,             required: true },
      ];

    case 'cash_on_cash':
      return [
        { key: 'purchase_price',       label: 'Purchase Price',        unit: 'R',  type: 'number', default: price ?? '', required: true },
        { key: 'deposit',              label: 'Deposit',               unit: 'R',  type: 'number', default: '', required: false },
        { key: 'gross_monthly_rent',   label: 'Gross Monthly Rent',    unit: 'R',  type: 'number', default: rent ?? '', required: true },
        { key: 'vacancy_rate',         label: 'Vacancy Rate',          unit: '%',  type: 'number', default: 8,  required: false, step: 1 },
        { key: 'monthly_opex',         label: 'Monthly Operating Costs', unit: 'R', type: 'number', default: 0, required: false },
        { key: 'monthly_debt_service', label: 'Monthly Bond Payment',  unit: 'R',  type: 'number', default: 0, required: false,
          hint: 'Leave 0 to evaluate unleveraged' },
      ];

    case 'irr':
      return [
        { key: 'initial_investment',    label: 'Total Investment',         unit: 'R',  type: 'number', default: price ?? '', required: true,
          hint: 'Purchase price + acquisition costs' },
        { key: 'annual_rent_income',    label: 'Gross Annual Rent',        unit: 'R',  type: 'number', default: '', required: true },
        { key: 'annual_opex',           label: 'Annual Operating Costs',   unit: 'R',  type: 'number', default: 0, required: false },
        { key: 'holding_years',         label: 'Holding Period',           unit: 'yrs',type: 'number', default: 5, required: false },
        { key: 'annual_rent_growth_pct',label: 'Annual Rent Growth',       unit: '%',  type: 'number', default: 3, required: false, step: 0.5 },
        { key: 'terminal_cap_rate_pct', label: 'Exit Cap Rate',            unit: '%',  type: 'number', default: 7, required: false, step: 0.25,
          hint: 'Used to calculate terminal value' },
      ];

    case 'rent_sensitivity':
      return [
        { key: 'property_value',         label: 'Property Value',            unit: 'R',  type: 'number', default: '', required: false },
        { key: 'monthly_rent',           label: 'Full-Occupancy Monthly Rent', unit: 'R', type: 'number', default: '', required: true },
        { key: 'monthly_opex',           label: 'Monthly Operating Costs',   unit: 'R',  type: 'number', default: 0,  required: false },
        { key: 'monthly_debt_service',   label: 'Monthly Bond Payment',      unit: 'R',  type: 'number', default: 0,  required: false },
        { key: 'current_vacancy_pct',    label: 'Current Vacancy',           unit: '%',  type: 'number', default: 8,  required: false, step: 1 },
      ];

    case 'vacancy_stress':
      return [
        { key: 'current_monthly_rent', label: 'Monthly Rent Income',       unit: 'R',  type: 'number', default: '', required: true },
        { key: 'monthly_opex',         label: 'Monthly Operating Costs',   unit: 'R',  type: 'number', default: 0,  required: false },
        { key: 'monthly_debt_service', label: 'Monthly Bond Payment',      unit: 'R',  type: 'number', default: 0,  required: false },
        { key: 'current_vacancy_pct',  label: 'Current Vacancy',           unit: '%',  type: 'number', default: 5,  required: false, step: 1 },
        { key: 'monthly_cash_reserves',label: 'Monthly Cash Reserves',     unit: 'R',  type: 'number', default: 0,  required: false,
          hint: 'How much buffer you have to absorb shortfalls' },
      ];

    case 'renovation_uplift':
      return [
        { key: 'current_value',        label: 'Current Property Value',    unit: 'R',  type: 'number', default: '', required: true },
        { key: 'reno_cost',            label: 'Renovation Budget',         unit: 'R',  type: 'number', default: '', required: true },
        { key: 'expected_uplift_pct',  label: 'Expected Value Uplift',     unit: '%',  type: 'number', default: 15, required: true, step: 1 },
        { key: 'holding_years',        label: 'Holding Period',            unit: 'yrs',type: 'number', default: 1,  required: false },
        { key: 'monthly_rent',         label: 'Monthly Rental Income',     unit: 'R',  type: 'number', default: 0,  required: false,
          hint: 'Optional — for net yield before/after' },
        { key: 'monthly_opex',         label: 'Monthly Operating Costs',   unit: 'R',  type: 'number', default: 0,  required: false },
      ];

    default:
      return [];
  }
}

// ── Input form ────────────────────────────────────────────────────────────

function CalcForm({ calcKey, cogResult, areaStats, onResult }) {
  const fields = fieldDefs(calcKey, cogResult, areaStats);
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map(f => [f.key, f.default ?? '']))
  );
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  // Re-initialise when the calc switches
  const prevKey = React.useRef(calcKey);
  if (prevKey.current !== calcKey) {
    prevKey.current = calcKey;
    // Reset is handled by the parent unmounting/remounting this component
  }

  const set = (key, val) => setValues(v => ({ ...v, [key]: val }));

  async function run(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    onResult(null);

    // Convert all numeric values
    const inputs = {};
    fields.forEach(f => {
      const raw = values[f.key];
      inputs[f.key] = raw === '' ? undefined : Number(raw);
    });

    try {
      const base = window.__DIGITAL_ESTATE_API_BASE__ || 'http://localhost:5002';
      const resp = await fetch(`${base}/api/feasibility/run`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ calculator: calcKey, inputs }),
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'Calculation failed');
      onResult(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="ft-form" onSubmit={run}>
      <div className="ft-fields">
        {fields.map(f => (
          <div key={f.key} className="ft-field">
            <label className="ft-field-label" htmlFor={`ft-${f.key}`}>
              {f.label}
              {f.unit && <span className="ft-field-unit">{f.unit}</span>}
            </label>
            <input
              id={`ft-${f.key}`}
              type="number"
              step={f.step ?? 'any'}
              min={0}
              required={f.required}
              value={values[f.key]}
              onChange={e => set(f.key, e.target.value)}
              className="ft-input"
              placeholder={f.required ? 'Required' : 'Optional'}
            />
            {f.hint && <p className="ft-field-hint">{f.hint}</p>}
          </div>
        ))}
      </div>

      {error && <p className="ft-error">{error}</p>}

      <button className="ft-run-btn" type="submit" disabled={loading}>
        {loading ? <><span className="ft-spinner" /> Calculating…</> : 'Calculate'}
      </button>
    </form>
  );
}

// ── Result renderers ──────────────────────────────────────────────────────

function KPIGroup({ items }) {
  return (
    <div className="ft-kpi-group">
      {items.map(({ label, value, highlight, warn }) => (
        <div key={label} className={cls('ft-kpi', highlight && 'ft-kpi--hi', warn && 'ft-kpi--warn')}>
          <span className="ft-kpi-value">{value}</span>
          <span className="ft-kpi-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

function ResultsTable({ head, rows, highlightNegative = false }) {
  return (
    <div className="ft-table-wrap">
      <table className="ft-table">
        <thead>
          <tr>{head.map(h => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => {
                const neg = highlightNegative && j > 0 && typeof cell === 'number' && cell < 0;
                return (
                  <td key={j} className={neg ? 'ft-neg' : ''}>
                    {cell == null ? '—' : typeof cell === 'number'
                      ? cell.toLocaleString('en-ZA', { maximumFractionDigits: 0 })
                      : cell}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BondResults({ r }) {
  return <>
    <KPIGroup items={[
      { label: 'Monthly Payment',    value: Rands(r.monthly_payment),         highlight: true },
      { label: 'Loan Amount',        value: Rands(r.loan_amount) },
      { label: 'Total Repayment',    value: Rands(r.total_payment) },
      { label: 'Total Interest',     value: Rands(r.total_interest),            warn: true },
      { label: 'LTV',                value: Pct(r.ltv) },
      { label: 'Min Monthly Income', value: Rands(r.recommended_gross_income) },
    ]} />
    <p className="ft-note">
      Minimum gross monthly income is the amount at which the bond payment does not exceed 30 % of income (SA banking guideline).
    </p>
  </>;
}

function CocResults({ r }) {
  return <KPIGroup items={[
    { label: 'Cash on Cash',    value: Pct(r.cash_on_cash_pct),  highlight: r.cash_on_cash_pct >= 6,
                                                                   warn:      r.cash_on_cash_pct < 0 },
    { label: 'Cap Rate',        value: Pct(r.cap_rate_pct) },
    { label: 'Gross Yield',     value: Pct(r.gross_yield_pct) },
    { label: 'Net Yield',       value: Pct(r.net_yield_pct) },
    { label: 'NOI',             value: Rands(r.noi) },
    { label: 'Annual Cash Flow',value: Rands(r.annual_cash_flow), warn: r.annual_cash_flow < 0 },
    { label: 'Effective Income',value: Rands(r.effective_income) },
    { label: 'Vacancy Loss',    value: Rands(r.vacancy_loss) },
  ]} />;
}

function IrrResults({ r }) {
  return <>
    <KPIGroup items={[
      { label: 'IRR',            value: Pct(r.irr_pct),    highlight: r.irr_pct >= 10, warn: r.irr_pct < 0 },
      { label: 'NPV @ 10 %',     value: Rands(r.npv_at_10pct), highlight: r.npv_at_10pct > 0, warn: r.npv_at_10pct < 0 },
      { label: 'Equity Multiple',value: r.equity_multiple != null ? `${r.equity_multiple.toFixed(2)}×` : '—' },
      { label: 'Exit Value',     value: Rands(r.exit_value) },
      { label: 'Payback',        value: r.payback_years != null ? `${r.payback_years} yr` : 'N/A' },
    ]} />
    {r.cash_flows?.length > 0 && (
      <ResultsTable
        head={['Year', 'Cash Flow (R)']}
        rows={r.cash_flows.map((cf, t) => [t === 0 ? 'Today' : `Yr ${t}`, cf])}
        highlightNegative
      />
    )}
  </>;
}

function RentSensResults({ r }) {
  return <>
    <KPIGroup items={[
      { label: 'Break-Even Monthly Rent', value: Rands(r.break_even_monthly_rent), highlight: true },
      { label: 'Full-Occupancy Gross',    value: Rands(r.gross_annual_at_full_occupancy) },
    ]} />
    <ResultsTable
      head={['Vacancy', 'Eff. Income (R)', 'NOI (R)', 'Cash Flow (R)', 'Net Yield']}
      rows={(r.sensitivity_table ?? []).map(row => [
        `${row.vacancy_pct} %`,
        row.effective_income,
        row.noi,
        row.cash_flow,
        row.net_yield_pct != null ? `${row.net_yield_pct.toFixed(1)} %` : '—',
      ])}
      highlightNegative
    />
  </>;
}

function VacancyStressResults({ r }) {
  const allRows = r.stress_scenarios ?? [];
  return <>
    <div className="ft-stress-base">
      <strong>Base Case ({r.base_case?.vacancy_pct} % vacancy):</strong>
      &nbsp;Monthly CF&nbsp;
      <span className={r.base_case?.monthly_cash_flow >= 0 ? 'ft-pos' : 'ft-neg'}>
        {Rands(r.base_case?.monthly_cash_flow)}
      </span>
    </div>
    <ResultsTable
      head={['Vacancy', 'Monthly CF (R)', 'Shortfall (R)', 'Break-Even Rent (R)', 'Reserve Cover']}
      rows={allRows.map(s => [
        `${s.vacancy_pct} %`,
        s.monthly_cash_flow,
        s.shortfall,
        Math.round(s.break_even_monthly_rent),
        s.months_reserves_cover != null ? `${s.months_reserves_cover} mo` : '—',
      ])}
      highlightNegative
    />
  </>;
}

function RenoResults({ r }) {
  return <KPIGroup items={[
    { label: 'After-Reno Value',       value: Rands(r.after_reno_value),       highlight: true },
    { label: 'Equity Created',         value: Rands(r.equity_created),         highlight: r.equity_created > 0, warn: r.equity_created < 0 },
    { label: 'ROI on Reno Spend',      value: Pct(r.roi_on_reno_spend_pct),    highlight: r.roi_on_reno_spend_pct >= 20 },
    { label: 'ROI on Total Cost',      value: Pct(r.roi_on_total_cost_pct) },
    { label: 'Annualised ROI',         value: Pct(r.annualised_roi_pct) },
    { label: 'Break-Even Uplift',      value: Pct(r.break_even_uplift_pct) },
    { label: 'Net Yield Before',       value: Pct(r.net_yield_before_pct) },
    { label: 'Net Yield After',        value: Pct(r.net_yield_after_pct) },
  ]} />;
}

const RESULT_MAP = {
  bond:              BondResults,
  cash_on_cash:      CocResults,
  irr:               IrrResults,
  rent_sensitivity:  RentSensResults,
  vacancy_stress:    VacancyStressResults,
  renovation_uplift: RenoResults,
};

// ── Root component ────────────────────────────────────────────────────────

export default function FeasibilityTab({ cogResult = null, areaStats = null, apiBase }) {
  const [activeCalc, setActiveCalc] = useState('bond');
  const [result,     setResult]     = useState(null);

  // Store apiBase globally so CalcForm can read it without prop drilling
  if (apiBase && typeof window !== 'undefined') {
    window.__DIGITAL_ESTATE_API_BASE__ = apiBase;
  }

  function switchCalc(key) {
    if (key !== activeCalc) {
      setActiveCalc(key);
      setResult(null);
    }
  }

  const ResultComp = RESULT_MAP[activeCalc];

  return (
    <div className="ft-root">
      {/* Sub-tab bar */}
      <div className="ft-tabs" role="tablist" aria-label="Feasibility calculator">
        {CALCS.map(c => (
          <button
            key={c.key}
            role="tab"
            className={cls('ft-tab', activeCalc === c.key && 'ft-tab--active')}
            aria-selected={activeCalc === c.key}
            onClick={() => switchCalc(c.key)}
            title={c.label}
          >
            <span className="ft-tab-icon" aria-hidden="true">{c.icon}</span>
            <span className="ft-tab-label">{c.label}</span>
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="ft-body">
        {/* Form — key forces remount on tab switch, resetting state */}
        <div className="ft-form-col">
          <CalcForm
            key={activeCalc}
            calcKey={activeCalc}
            cogResult={cogResult}
            areaStats={areaStats}
            onResult={setResult}
          />
        </div>

        {/* Results */}
        {result && (
          <div className="ft-results-col">
            <p className="ft-results-heading">Results</p>
            <ResultComp r={result} />
          </div>
        )}
      </div>
    </div>
  );
}
