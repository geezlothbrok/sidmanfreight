import { useCallback, useEffect, useState } from 'react';
import { FiPrinter, FiRefreshCw } from 'react-icons/fi';
import {
  Card, CardHeader, CardTitle, CardActions, Button,
  Field, FieldLabel, FieldControl, Input, Dropdown, MetricCard,
} from '@rfdtech/components';

import { authFetch } from '../../../utils/authFetch';
import { getCurrentUser } from '../../../utils/auth';
import { money, periodLabel, printPeriodReport, quarterRange } from '../../../utils/periodReport';

const YEAR = new Date().getFullYear();
const QUARTERS = [1, 2, 3, 4].map((q) => ({ value: String(q), label: `${q}${['st', 'nd', 'rd', 'th'][q - 1]} Quarter` }));
const YEARS = [YEAR, YEAR - 1, YEAR - 2].map((y) => ({ value: String(y), label: String(y) }));

/** Horizontal bar list — same shape as the printed report, so they match. */
function BarList({ title, rows, total }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.n)));
  const sum = total ?? rows.reduce((a, r) => a + Number(r.n), 0);
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <div className="rpt-bars">
        {rows.length === 0 ? (
          <p className="rpt-empty">No data for this period.</p>
        ) : rows.map((r) => (
          <div className="rpt-bar" key={r.label}>
            <span className="rpt-bar-label">{r.label}</span>
            <span className="rpt-bar-track">
              <span className="rpt-bar-fill" style={{ width: `${Math.round((Number(r.n) / max) * 100)}%` }} />
            </span>
            <span className="rpt-bar-value">
              {r.n} <em>({sum > 0 ? Math.round((Number(r.n) / sum) * 100) : 0}%)</em>
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function ReportsPanel({ apiUrl }) {
  const initial = quarterRange(YEAR, Math.floor(new Date().getMonth() / 3) + 1);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [year, setYear] = useState(String(YEAR));
  const [quarter, setQuarter] = useState(String(Math.floor(new Date().getMonth() / 3) + 1));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (f, t) => {
    setLoading(true); setError('');
    try {
      const res = await authFetch(`${apiUrl}?action=get_report&from=${f}&to=${t}`);
      const json = await res.json().catch(() => ({}));
      if (res.ok && !json.error) setData(json);
      else setError(json.error || 'Could not build the report.');
    } catch {
      setError('Could not reach the portal.');
    }
    setLoading(false);
  }, [apiUrl]);

  useEffect(() => { load(from, to); }, [load, from, to]);

  const applyQuarter = (y, q) => {
    const r = quarterRange(Number(y), Number(q));
    setFrom(r.from); setTo(r.to);
  };

  const fin = data?.finance || {};
  const ship = data?.shipments || {};
  const netNegative = Number(fin.net) < 0;

  return (
    <div className="rpt-panel">
      <Card>
        <CardHeader>
          <CardTitle>Report period</CardTitle>
          <CardActions>
            <Button variant="secondary" size="sm" onClick={() => load(from, to)} disabled={loading}>
              <FiRefreshCw className={loading ? 'mgr-spin' : ''} /> Refresh
            </Button>
            <Button
              variant="primary" size="sm"
              disabled={!data}
              onClick={() => printPeriodReport(data, getCurrentUser()?.email)}
            >
              <FiPrinter /> Print / Save as PDF
            </Button>
          </CardActions>
        </CardHeader>

        <div className="rpt-period">
          <Field>
            <FieldLabel>Year</FieldLabel>
            <FieldControl>
              <Dropdown
                aria-label="Year" value={year} options={YEARS}
                onValueChange={(v) => { const y = v ?? String(YEAR); setYear(y); applyQuarter(y, quarter); }}
              />
            </FieldControl>
          </Field>
          <Field>
            <FieldLabel>Quarter</FieldLabel>
            <FieldControl>
              <Dropdown
                aria-label="Quarter" value={quarter} options={QUARTERS}
                onValueChange={(v) => { const q = v ?? '1'; setQuarter(q); applyQuarter(year, q); }}
              />
            </FieldControl>
          </Field>
          <Field>
            <FieldLabel>From</FieldLabel>
            <FieldControl><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></FieldControl>
          </Field>
          <Field>
            <FieldLabel>To</FieldLabel>
            <FieldControl><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></FieldControl>
          </Field>
        </div>
        {data ? <p className="rpt-period-label">Covering {periodLabel(data.from, data.to)}</p> : null}
        {error ? <p className="mgr-inline-error">{error}</p> : null}
      </Card>

      {data ? (
        <>
          <div className="rpt-kpis">
            <MetricCard variant="soft" className="sidman-metric sidman-metric--blue" label="Shipments" value={ship.total ?? 0}
              description={`${ship.avg_per_month ?? 0} per month on average`} />
            <MetricCard variant="soft" className="sidman-metric sidman-metric--purple" label="Clients Served" value={ship.clients ?? 0}
              description="Distinct clients in period" />
            <MetricCard variant="soft" className="sidman-metric sidman-metric--green" label="Income" value={money(fin.income)}
              description={`${fin.income_count ?? 0} entries`} trend="up" />
            <MetricCard variant="soft" className="sidman-metric sidman-metric--red" label="Expenditure" value={money(fin.expense)}
              description={`${fin.expense_count ?? 0} entries`} trend="down" />
            {/* Net position takes its colour from its sign, so the tile reads
                the same way the figure does. */}
            <MetricCard variant="soft" className={`sidman-metric ${netNegative ? 'sidman-metric--red' : 'sidman-metric--teal'}`} label="Net Position" value={money(fin.net)}
              description={`${fin.margin_pct ?? 0}% margin`}
              trend={netNegative ? 'down' : 'up'} />
          </div>

          <Card>
            <CardHeader><CardTitle>Income vs Expenditure</CardTitle></CardHeader>
            <div className="rpt-bars">
              {[['Income', fin.income, 'in'], ['Expenditure', fin.expense, 'ex']].map(([label, val, tone]) => {
                const scale = Math.max(Number(fin.income || 0), Number(fin.expense || 0), 1);
                return (
                  <div className="rpt-bar" key={label}>
                    <span className="rpt-bar-label">{label}</span>
                    <span className="rpt-bar-track">
                      <span className={`rpt-bar-fill ${tone}`} style={{ width: `${Math.round((Number(val || 0) / scale) * 100)}%` }} />
                    </span>
                    <span className="rpt-bar-value">{money(val)}</span>
                  </div>
                );
              })}
            </div>

            {(data.finance_by_category || []).length > 0 ? (
              <table className="rpt-cat-table">
                <thead>
                  <tr><th>Category</th><th>Type</th><th>Entries</th><th>Amount</th></tr>
                </thead>
                <tbody>
                  {data.finance_by_category.map((c, i) => (
                    <tr key={`${c.category}-${c.t}-${i}`}>
                      <td>{c.category}</td>
                      <td className="c">{String(c.t || '').replace(/^./, (x) => x.toUpperCase())}</td>
                      <td className="c">{c.n}</td>
                      <td className="n">{money(c.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </Card>

          <div className="rpt-two">
            <BarList title="Shipments by Regime" rows={data.by_regime || []} total={ship.total} />
            <BarList title="Shipments by Consignment Type" rows={data.by_consignment || []} total={ship.total} />
          </div>
          <div className="rpt-two">
            <BarList title="Shipments by Clearance Status" rows={data.by_status || []} total={ship.total} />
            <BarList title="Shipments by Agent" rows={data.by_agent || []} total={ship.total} />
          </div>

          {data.demographics?.n ? (
            <>
              <h3 className="rpt-section-head">
                Customer Demographics <em>N={data.demographics.n}</em>
              </h3>
              <div className="rpt-two">
                <BarList title="Gender" rows={data.demographics.gender || []} total={data.demographics.n} />
                <BarList title="Marital Status" rows={data.demographics.marital || []} total={data.demographics.n} />
              </div>
              <div className="rpt-two">
                <BarList title="Religion" rows={data.demographics.religion || []} total={data.demographics.n} />
                <BarList title="Nationality" rows={data.demographics.nationality || []} total={data.demographics.n} />
              </div>
              <div className="rpt-two">
                <BarList title="Occupation" rows={data.demographics.occupation || []} total={data.demographics.n} />
                <BarList title="Location" rows={data.demographics.location || []} total={data.demographics.n} />
              </div>
            </>
          ) : (
            <Card>
              <CardHeader><CardTitle>Customer Demographics</CardTitle></CardHeader>
              <p className="rpt-empty rpt-empty-pad">
                No customer records are linked to shipments in this period. Add
                customers under the Customers tab and pick one when logging a
                shipment, and these breakdowns will fill in.
              </p>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
