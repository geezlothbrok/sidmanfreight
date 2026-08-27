import React, { useMemo } from 'react';
import {
  ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine
} from 'recharts';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildMonthlyTotals(transactions) {
  const byMonth = new Map();

  transactions.forEach((tx) => {
    const rawDate = tx.date_logged ? new Date(tx.date_logged) : null;
    if (!rawDate || isNaN(rawDate.getTime())) return;

    const key = `${rawDate.getFullYear()}-${String(rawDate.getMonth()).padStart(2, '0')}`;
    if (!byMonth.has(key)) {
      byMonth.set(key, {
        key,
        sortKey: rawDate.getFullYear() * 12 + rawDate.getMonth(),
        label: `${MONTH_LABELS[rawDate.getMonth()]} '${String(rawDate.getFullYear()).slice(2)}`,
        income: 0,
        expense: 0,
      });
    }

    const amount = parseFloat(tx.amount) || 0;
    const bucket = byMonth.get(key);
    if (tx.type === 'Income') bucket.income += amount;
    else bucket.expense -= amount; // negative so it renders below the zero baseline
  });

  return Array.from(byMonth.values()).sort((a, b) => a.sortKey - b.sortKey);
}

const formatCurrency = (value) => `GH₵${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  const income = payload.find((p) => p.dataKey === 'income')?.value || 0;
  const expense = payload.find((p) => p.dataKey === 'expense')?.value || 0;
  return (
    <div style={{
      background: '#0f172a', color: '#fff', borderRadius: 10, padding: '0.65rem 0.85rem',
      fontSize: '0.82rem', boxShadow: '0 8px 20px rgba(15,23,42,0.25)'
    }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#4ade80' }}>Income: {formatCurrency(income)}</div>
      <div style={{ color: '#f87171' }}>Expense: {formatCurrency(expense)}</div>
    </div>
  );
}

// Diverging bar chart: income renders above the zero baseline, expense below
// it — direction carries the signal, color is a secondary cue on top of it.
function IncomeExpenseChart({ transactions }) {
  const data = useMemo(() => buildMonthlyTotals(transactions || []), [transactions]);

  if (data.length === 0) {
    return (
      <div className="ds-chart-empty">No transactions logged yet — the income/expense trend will appear here once entries are posted.</div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef0f3" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 12, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCurrency(v)}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
        <Legend wrapperStyle={{ fontSize: '0.82rem', paddingTop: '0.5rem' }} />
        <ReferenceLine y={0} stroke="#cbd5e1" />
        <Bar dataKey="income" name="Income" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={36} />
        <Bar dataKey="expense" name="Expense" fill="#dc2626" radius={[0, 0, 4, 4]} maxBarSize={36} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default IncomeExpenseChart;
