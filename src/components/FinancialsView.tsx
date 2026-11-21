import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowUpDown,
  Check,
  Copy,
  Download,
  FileText,
  Plus,
  Printer,
  SlidersHorizontal,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  FINANCIAL_TRAJECTORY,
  SERVER_TIERS,
  SPENTA_APPS,
  SPENTA_LOGO_URL,
} from '../data/spentaManifest';
import { useStack } from '../store/StackContext';
import {
  QuarterRow,
  QuarterlyExecutiveSummaryData,
  exportQuarterlySummaryToPdf,
} from '../utils/exportQuarterlySummaryPdf';

type ScenarioMode = 'conservative' | 'upside';
type SortField = 'gmPct' | 'setupUsd' | 'minServerTier' | 'name';
type QuarterKey = 'Q1' | 'Q2' | 'Q3' | 'Q4';

const QUARTER_WEIGHTS: { quarter: QuarterKey; weight: number }[] = [
  { quarter: 'Q1', weight: 0.21 },
  { quarter: 'Q2', weight: 0.24 },
  { quarter: 'Q3', weight: 0.26 },
  { quarter: 'Q4', weight: 0.29 },
];

function formatCompactUsdK(valK: number): string {
  if (valK >= 1000) return `$${(valK / 1000).toFixed(2)}M`;
  return `$${valK.toFixed(1)}K`;
}

export function FinancialsView() {
  const { theme, selectedIds, selectedApps, stackMetrics, toggleApp } = useStack();
  const [scenario, setScenario] = useState<ScenarioMode>('conservative');
  const [fxRate, setFxRate] = useState<number>(120);
  const [taxRate, setTaxRate] = useState<number>(25);
  const [sortField, setSortField] = useState<SortField>('gmPct');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const [summaryOpen, setSummaryOpen] = useState<boolean>(false);
  const [summaryYearIndex, setSummaryYearIndex] = useState<number>(0);
  const [summaryQuarter, setSummaryQuarter] = useState<QuarterKey>('Q4');
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  const isDark = theme === 'dark';

  useEffect(() => {
    if (!summaryOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSummaryOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [summaryOpen]);

  const modeledSeries = useMemo(() => {
    const baseBdtBurnRatio = 0.65;
    const fxDeltaFactor = 120 / fxRate - 1;

    let cumEbitda = 0;
    let cumNet = 0;

    return FINANCIAL_TRAJECTORY.map((row) => {
      const revK = scenario === 'conservative' ? row.conservativeRevK : row.upsideRevK;
      const baseEbitdaK = scenario === 'conservative' ? row.conservativeEbitdaK : row.upsideEbitdaK;
      const impliedOpexK = revK - baseEbitdaK;
      const fxCostAdjustmentK = impliedOpexK * baseBdtBurnRatio * fxDeltaFactor;
      const ebitdaK = Math.max(0, Number((baseEbitdaK - fxCostAdjustmentK).toFixed(1)));
      const netProfitK = Number((ebitdaK * (1 - taxRate / 100)).toFixed(1));

      cumEbitda += ebitdaK;
      cumNet += netProfitK;

      return {
        ...row,
        revK,
        ebitdaK,
        netProfitK,
        cumEbitdaK: Number(cumEbitda.toFixed(1)),
        cumNetK: Number(cumNet.toFixed(1)),
        cashMultiple: Number((cumNet / 500).toFixed(2)),
      };
    });
  }, [scenario, fxRate, taxRate]);

  const y1 = modeledSeries[0];
  const y4 = modeledSeries[3];
  const y5 = modeledSeries[4];
  const dhakaY1UsdK = Number((64800 / fxRate).toFixed(1));

  const summaryData = useMemo<QuarterlyExecutiveSummaryData>(() => {
    const activeRow = modeledSeries[summaryYearIndex] ?? modeledSeries[0];
    const quarters: QuarterRow[] = QUARTER_WEIGHTS.map(({ quarter, weight }) => {
      const revK = Number((activeRow.revK * weight).toFixed(1));
      const ebitdaK = Number((activeRow.ebitdaK * weight).toFixed(1));
      const netProfitK = Number((activeRow.netProfitK * weight).toFixed(1));
      const ebitdaMarginPct = revK > 0 ? Number(((ebitdaK / revK) * 100).toFixed(1)) : 0;
      return {
        quarter,
        weightPct: Math.round(weight * 100),
        revK,
        ebitdaK,
        netProfitK,
        ebitdaMarginPct,
      };
    });

    const selectedQuarterRow =
      quarters.find((q) => q.quarter === summaryQuarter) ?? quarters[3];
    const tierSpec = SERVER_TIERS[stackMetrics.tier];

    return {
      fiscalYear: activeRow.year,
      fiscalLabel: activeRow.label,
      quarter: summaryQuarter,
      scenarioLabel:
        scenario === 'conservative'
          ? 'Conservative Base (0.5825x)'
          : 'Healthcare Upside ($4.80M Y3)',
      fxRate,
      taxRate,
      dhakaY1UsdK,
      annualRevK: activeRow.revK,
      annualEbitdaK: activeRow.ebitdaK,
      annualNetProfitK: activeRow.netProfitK,
      cumNetK: activeRow.cumNetK,
      cashMultiple: activeRow.cashMultiple,
      fiveYearMultiple: y5.cashMultiple,
      fiveYearCumNetM: Number((y5.cumNetK / 1000).toFixed(3)),
      milestone: activeRow.milestone,
      quarters,
      selectedQuarterRow,
      stackModuleCount: selectedApps.length,
      stackModuleNames: selectedApps.map((a) => a.shortName),
      stackSetupUsd: stackMetrics.totalSetupUsd,
      stackBlendedGmPct: stackMetrics.blendedGmPct,
      recommendedTierCode: tierSpec.code,
      recommendedTierName: tierSpec.name,
      recommendedTierCapex: tierSpec.capex,
      generatedAtLabel: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      }),
    };
  }, [
    modeledSeries,
    summaryYearIndex,
    summaryQuarter,
    scenario,
    fxRate,
    taxRate,
    dhakaY1UsdK,
    y5,
    selectedApps,
    stackMetrics,
  ]);

  const handleCopySummaryText = async () => {
    const q = summaryData.selectedQuarterRow;
    const text = [
      `SPENTA SOVEREIGN OS — ${summaryData.quarter} ${summaryData.fiscalYear} (${summaryData.fiscalLabel}) EXECUTIVE SUMMARY`,
      '========================================================================',
      `Scenario: ${summaryData.scenarioLabel} | FX: ${summaryData.fxRate} BDT/USD | Tax: ${summaryData.taxRate.toFixed(1)}%`,
      '',
      `[${summaryData.quarter} ${summaryData.fiscalYear} HEADLINE PERFORMANCE — ${q.weightPct}% ANNUAL SHARE]`,
      `  • Quarterly Revenue:   ${formatCompactUsdK(q.revK)} (Annualized Run-Rate: ${formatCompactUsdK(q.revK * 4)}/yr)`,
      `  • Quarterly EBITDA:    ${formatCompactUsdK(q.ebitdaK)} (${q.ebitdaMarginPct.toFixed(1)}% margin)`,
      `  • Quarterly Net Profit:${formatCompactUsdK(q.netProfitK)} (after ${summaryData.taxRate.toFixed(1)}% corp. tax)`,
      `  • Cum. SAFE Return:    ${summaryData.cashMultiple.toFixed(2)}x through ${summaryData.fiscalYear} (5-Yr: ${summaryData.fiveYearMultiple.toFixed(2)}x)`,
      '',
      `[FULL-YEAR ${summaryData.fiscalYear} RECONCILIATION]`,
      `  • Revenue: ${formatCompactUsdK(summaryData.annualRevK)} | EBITDA: ${formatCompactUsdK(summaryData.annualEbitdaK)} | Net Profit: ${formatCompactUsdK(summaryData.annualNetProfitK)}`,
      `  • 20-FTE Dhaka Hub (64.8M BDT): $${summaryData.dhakaY1UsdK}K/yr`,
      `  • Operating Milestone: ${summaryData.milestone}`,
      '',
      `[COMPOSED STACK CONTEXT]`,
      `  • Modules (${summaryData.stackModuleCount}/13): ${summaryData.stackModuleNames.join(', ') || 'None selected'}`,
      `  • Build Scope: $${(summaryData.stackSetupUsd / 1000).toFixed(1)}K | Blended GM: ${summaryData.stackBlendedGmPct.toFixed(1)}% | Hardware: ${summaryData.recommendedTierCode} (${summaryData.recommendedTierCapex})`,
      '',
      'Spenta Technology (spenta.tech) · hello@spenta.tech',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      window.setTimeout(() => setCopiedSummary(false), 2200);
    } catch {
      // Clipboard API unavailable in restricted iframe contexts
    }
  };

  const sortedApps = useMemo(() => {
    return [...SPENTA_APPS].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else cmp = a[sortField] - b[sortField];
      return sortAsc ? cmp : -cmp;
    });
  }, [sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc((v) => !v);
    } else {
      setSortField(field);
      setSortAsc(field === 'name' || field === 'minServerTier');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-400">
            RECONCILED 5-YEAR MODEL (FY2027–FY2031) · $500K SAFE ($4.5M CAP · 20% DISC.)
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight mt-1">
            Financials — P&amp;L Trajectory, FX/Tax Sensitivity &amp; 13-Product GM Matrix
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start xl:self-auto">
          <div className="inline-flex flex-wrap rounded-xl bg-zinc-100 dark:bg-[#18181B] p-1 border border-zinc-200 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setScenario('conservative')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                scenario === 'conservative'
                  ? 'bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
              }`}
            >
              Conservative Base (0.5825×)
            </button>
            <button
              type="button"
              onClick={() => setScenario('upside')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                scenario === 'upside'
                  ? 'bg-emerald-500 text-zinc-950'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
              }`}
            >
              Healthcare Upside ($4.80M Y3)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSummaryOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
            <span>Quick Generate</span>
          </button>
        </div>
      </section>

      {/* Monospace KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl p-5 bg-zinc-950 dark:bg-[#111315] text-white border border-emerald-500/35">
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-emerald-400">
            Capital Ask
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold mt-1 tabular-nums">
            $500K SAFE
          </div>
          <div className="text-xs text-zinc-400 font-mono mt-1">
            $4.5M Cap · 20% Disc. · $60K MRR Y1
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-white dark:bg-[#111315] border border-zinc-200 dark:border-white/[0.08]">
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            5-Year Net Cash Return
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
            {y5.cashMultiple.toFixed(2)}×
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono mt-1 tabular-nums">
            Y4: {y4.cashMultiple.toFixed(2)}× · Cum. Net ${(y5.cumNetK / 1000).toFixed(3)}M
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-white dark:bg-[#111315] border border-zinc-200 dark:border-white/[0.08]">
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            FY2031 (Y5) Revenue
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 tabular-nums">
            ${(y5.revK / 1000).toFixed(2)}M
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono mt-1 tabular-nums">
            Y1: ${y1.revK}K · Cum. EBITDA ${(y5.cumEbitdaK / 1000).toFixed(3)}M
          </div>
        </div>

        <div className="rounded-2xl p-5 bg-white dark:bg-[#111315] border border-zinc-200 dark:border-white/[0.08]">
          <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            Client ROI Framing
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 tabular-nums">
            250%–350%
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 font-mono mt-1">
            Banking Proofs (Prime/Secure): 450%–580%
          </div>
        </div>
      </section>

      {/* Main Chart + Live FX & Tax Sensitivity Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-8 rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="inline-flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
              <h2 className="font-bold text-sm sm:text-base text-zinc-950 dark:text-zinc-50">
                FY2027–FY2031 Revenue, EBITDA &amp; Net Profit ($K USD)
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400 tabular-nums">
              FX: {fxRate} BDT/USD · Tax: {taxRate.toFixed(1)}%
            </span>
          </div>

          <div className="h-[300px] sm:h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={modeledSeries} margin={{ top: 10, right: 14, left: 2, bottom: 8 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDark ? '#27272A' : '#E4E4E7'}
                  vertical={false}
                />
                <XAxis
                  dataKey="year"
                  tick={{
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                    fill: isDark ? '#A1A1AA' : '#52525B',
                  }}
                  axisLine={{ stroke: isDark ? '#27272A' : '#E4E4E7' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}M` : `${v}K`}`}
                  tick={{
                    fontSize: 11,
                    fontFamily: 'JetBrains Mono, monospace',
                    fill: isDark ? '#A1A1AA' : '#52525B',
                  }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [
                    `$${Number(value).toLocaleString()}K`,
                    String(name),
                  ]}
                  contentStyle={{
                    borderRadius: '10px',
                    backgroundColor: isDark ? '#111315' : '#FFFFFF',
                    border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E4E4E7',
                    color: isDark ? '#FAFAFA' : '#09090B',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: isDark ? '#E4E4E7' : '#18181B' }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: '11px',
                    fontFamily: 'JetBrains Mono, monospace',
                    color: isDark ? '#A1A1AA' : '#52525B',
                  }}
                />
                <Bar
                  dataKey="revK"
                  name="Revenue ($K)"
                  fill={isDark ? '#3F3F46' : '#18181B'}
                  radius={[5, 5, 0, 0]}
                  barSize={34}
                />
                <Line
                  type="monotone"
                  dataKey="ebitdaK"
                  name="EBITDA ($K)"
                  stroke="#0D9488"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#0D9488' }}
                />
                <Line
                  type="monotone"
                  dataKey="netProfitK"
                  name="Net Profit ($K)"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#10B981' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-white/[0.08] overflow-x-auto">
            <table className="w-full min-w-[520px] text-left font-mono text-xs tabular-nums">
              <thead>
                <tr className="text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-white/[0.08]">
                  <th className="py-2 pr-3">Fiscal Year</th>
                  <th className="py-2 px-3 text-right">Revenue</th>
                  <th className="py-2 px-3 text-right">EBITDA</th>
                  <th className="py-2 px-3 text-right">Net Profit</th>
                  <th className="py-2 pl-3 text-right">Cum. SAFE Return</th>
                </tr>
              </thead>
              <tbody>
                {modeledSeries.map((r) => (
                  <tr
                    key={r.year}
                    className="border-b border-zinc-100 dark:border-white/[0.05] last:border-0"
                  >
                    <td className="py-2 pr-3 font-bold text-zinc-950 dark:text-zinc-100">
                      {r.year}{' '}
                      <span className="text-zinc-400 dark:text-zinc-500 font-normal">({r.label})</span>
                    </td>
                    <td className="py-2 px-3 text-right text-zinc-800 dark:text-zinc-200">
                      ${r.revK.toLocaleString()}K
                    </td>
                    <td className="py-2 px-3 text-right text-teal-700 dark:text-teal-400">
                      ${r.ebitdaK.toLocaleString()}K
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-700 dark:text-emerald-400 font-semibold">
                      ${r.netProfitK.toLocaleString()}K
                    </td>
                    <td className="py-2 pl-3 text-right font-bold text-zinc-950 dark:text-zinc-50">
                      {r.cashMultiple.toFixed(2)}×
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Live Sensitivity Controls */}
        <section className="lg:col-span-4 rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>FX &amp; Tax Sensitivity Stress Test</span>
            </div>

            <div className="rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  BDT / USD Exchange Rate
                </span>
                <span className="font-mono text-lg font-extrabold text-zinc-950 dark:text-zinc-50 tabular-nums">
                  {fxRate} BDT
                </span>
              </div>
              <input
                type="range"
                min={115}
                max={130}
                step={1}
                value={fxRate}
                onChange={(e) => setFxRate(Number(e.target.value))}
                aria-label="BDT per USD exchange rate"
                className="w-full spenta-slider mt-3"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-1">
                <span>115 BDT</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">120 Base</span>
                <span>130 BDT</span>
              </div>
              <div className="mt-2.5 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 tabular-nums">
                20-FTE Dhaka Hub (64.8M BDT):{' '}
                <strong className="text-zinc-950 dark:text-zinc-100">${dhakaY1UsdK}K/yr</strong>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Effective Corporate Tax
                </span>
                <span className="font-mono text-lg font-extrabold text-zinc-950 dark:text-zinc-50 tabular-nums">
                  {taxRate.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min={20}
                max={30}
                step={0.5}
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                aria-label="Effective corporate tax rate"
                className="w-full spenta-slider mt-3"
              />
              <div className="flex justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mt-1">
                <span>20.0%</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">25.0% Base</span>
                <span>30.0%</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFxRate(120);
                setTaxRate(25);
                setScenario('conservative');
              }}
              className="w-full py-2 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#18181B] hover:border-emerald-500/40 text-xs font-semibold text-zinc-900 dark:text-zinc-100 cursor-pointer transition-colors"
            >
              Reset to Reconciled Baseline (120 BDT · 25% Tax)
            </button>
          </div>

          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <div className="font-mono text-[10px] font-bold uppercase mb-1">
              Natural Hard-Currency FX Hedge
            </div>
            Enterprise contracts billed in USD/AUD/EUR naturally hedge BDT engineering payroll—a move from 120 to 125 BDT/USD reduces Dhaka USD OpEx while lifting 5-year net return.
          </div>
        </section>
      </div>

      {/* Sortable 13-Product Gross Margin Matrix */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#111315] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-bold text-base sm:text-lg text-zinc-950 dark:text-zinc-50">
              13-Product Conservative Gross Margin Matrix
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              High-Margin IP &amp; SaaS (&gt;=55% GM highlighted in Emerald) paired with predictable Enterprise Delivery Pods (29%–35% GM).
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> High-Margin IP (&gt;=55%)
            </span>
            <span className="inline-flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600" /> Delivery Pods (29%–35%)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[740px] text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/[0.08] text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
                <th className="py-2.5 pr-3">
                  <button
                    type="button"
                    onClick={() => handleSort('name')}
                    className="inline-flex items-center gap-1 hover:text-zinc-950 dark:hover:text-zinc-100 cursor-pointer"
                  >
                    Product Line <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('setupUsd')}
                    className="inline-flex items-center gap-1 hover:text-zinc-950 dark:hover:text-zinc-100 cursor-pointer"
                  >
                    Setup / Build <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3">Recurring / License Model</th>
                <th className="py-2.5 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('gmPct')}
                    className="inline-flex items-center gap-1 hover:text-zinc-950 dark:hover:text-zinc-100 cursor-pointer"
                  >
                    Cons. GM% <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => handleSort('minServerTier')}
                    className="inline-flex items-center gap-1 hover:text-zinc-950 dark:hover:text-zinc-100 cursor-pointer"
                  >
                    Min Tier <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="py-2.5 pl-3 text-right">Stack</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.06]">
              {sortedApps.map((app) => {
                const isHighMargin = app.gmPct >= 55;
                const inStack = selectedIds.includes(app.id);
                return (
                  <tr
                    key={app.id}
                    className={`transition-colors ${
                      inStack
                        ? 'bg-emerald-500/[0.06] dark:bg-emerald-500/[0.07]'
                        : 'hover:bg-zinc-50 dark:hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="py-3 pr-3">
                      <div className="font-bold text-zinc-950 dark:text-zinc-100">{app.name}</div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {app.proofClient}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">{app.category}</td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-zinc-950 dark:text-zinc-100 tabular-nums whitespace-nowrap">
                      ${(app.setupUsd / 1000).toFixed(1)}K
                    </td>
                    <td className="py-3 px-3 text-zinc-600 dark:text-zinc-400">
                      {app.recurringLabel}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-extrabold tabular-nums">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          isHighMargin
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {app.gmPct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-zinc-700 dark:text-zinc-300">
                      T{app.minServerTier}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleApp(app.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold transition-colors cursor-pointer ${
                          inStack
                            ? 'bg-emerald-500 text-zinc-950'
                            : 'bg-zinc-100 dark:bg-white/[0.06] text-zinc-900 dark:text-zinc-100 hover:bg-emerald-500 hover:text-zinc-950'
                        }`}
                      >
                        {inStack ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        <span>{inStack ? 'Added' : 'Add'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* One-Page Quarterly Executive Summary Modal */}
      {summaryOpen && (
        <div
          className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-6 overflow-y-auto"
          onClick={() => setSummaryOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="One-Page Quarterly Executive Summary"
        >
          <div
            className="w-full max-w-4xl bg-zinc-50 dark:bg-[#0C0E10] rounded-2xl border border-zinc-200 dark:border-white/[0.12] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Control Bar */}
            <div className="bg-white dark:bg-[#111315] border-b border-zinc-200 dark:border-white/[0.08] px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  One-Page Brief
                </span>

                <div className="inline-flex flex-wrap rounded-lg bg-zinc-100 dark:bg-[#18181B] p-0.5 border border-zinc-200 dark:border-white/[0.08]">
                  {modeledSeries.map((row, idx) => (
                    <button
                      key={row.year}
                      type="button"
                      onClick={() => setSummaryYearIndex(idx)}
                      className={`px-2 py-1 rounded-md font-mono text-[11px] font-bold transition-colors cursor-pointer ${
                        summaryYearIndex === idx
                          ? 'bg-zinc-950 text-emerald-400 dark:bg-zinc-100 dark:text-zinc-950'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                      }`}
                    >
                      {row.year}
                    </button>
                  ))}
                </div>

                <div className="inline-flex rounded-lg bg-zinc-100 dark:bg-[#18181B] p-0.5 border border-zinc-200 dark:border-white/[0.08]">
                  {QUARTER_WEIGHTS.map(({ quarter }) => (
                    <button
                      key={quarter}
                      type="button"
                      onClick={() => setSummaryQuarter(quarter)}
                      className={`px-2 py-1 rounded-md font-mono text-[11px] font-bold transition-colors cursor-pointer ${
                        summaryQuarter === quarter
                          ? 'bg-emerald-500 text-zinc-950'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100'
                      }`}
                    >
                      {quarter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySummaryText}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#18181B] hover:border-emerald-500/40 text-xs font-semibold text-zinc-900 dark:text-zinc-100 cursor-pointer"
                >
                  {copiedSummary ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/[0.12] bg-white dark:bg-[#18181B] hover:border-emerald-500/40 text-xs font-semibold text-zinc-900 dark:text-zinc-100 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportQuarterlySummaryToPdf(summaryData)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Export 1-Page PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryOpen(false)}
                  aria-label="Close executive summary"
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.08] cursor-pointer"
                >
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* One-Page Executive Brief Sheet */}
            <div className="p-3 sm:p-6 overflow-y-auto">
              <div className="bg-white dark:bg-[#111315] rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-hidden">
                <div className="bg-[#09090B] text-white px-5 sm:px-6 py-5 border-b border-emerald-500/35">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={SPENTA_LOGO_URL}
                        alt="Spenta Technology"
                        className="h-7 w-auto object-contain"
                      />
                      <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
                        QUARTERLY EXECUTIVE BRIEF
                      </span>
                    </div>
                    <span className="font-mono text-xs font-extrabold bg-emerald-500 text-zinc-950 px-3 py-1 rounded-md">
                      {summaryData.quarter} {summaryData.fiscalYear} ({summaryData.fiscalLabel})
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-extrabold tracking-tight mt-3">
                    {summaryData.quarter} {summaryData.fiscalYear} Financial &amp; Sovereign Deployment Summary
                  </h2>
                  <p className="font-mono text-[11px] text-zinc-400 mt-1 tabular-nums">
                    Scenario: {summaryData.scenarioLabel} · FX: {summaryData.fxRate} BDT/USD · Tax:{' '}
                    {summaryData.taxRate.toFixed(1)}% · Generated {summaryData.generatedAtLabel}
                  </p>
                </div>

                <div className="p-4 sm:p-6 space-y-5">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] p-3.5">
                      <div className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
                        {summaryData.quarter} Revenue ({summaryData.selectedQuarterRow.weightPct}%)
                      </div>
                      <div className="font-mono text-xl font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 tabular-nums">
                        {formatCompactUsdK(summaryData.selectedQuarterRow.revK)}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 mt-0.5 tabular-nums">
                        Run-rate: {formatCompactUsdK(summaryData.selectedQuarterRow.revK * 4)}/yr
                      </div>
                    </div>

                    <div className="rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] p-3.5">
                      <div className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
                        {summaryData.quarter} EBITDA
                      </div>
                      <div className="font-mono text-xl font-extrabold text-teal-700 dark:text-teal-400 mt-1 tabular-nums">
                        {formatCompactUsdK(summaryData.selectedQuarterRow.ebitdaK)}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 mt-0.5 tabular-nums">
                        Margin: {summaryData.selectedQuarterRow.ebitdaMarginPct.toFixed(1)}%
                      </div>
                    </div>

                    <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5">
                      <div className="text-[10px] font-mono uppercase text-emerald-800 dark:text-emerald-300">
                        {summaryData.quarter} Net Profit
                      </div>
                      <div className="font-mono text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
                        {formatCompactUsdK(summaryData.selectedQuarterRow.netProfitK)}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 mt-0.5 tabular-nums">
                        After {summaryData.taxRate.toFixed(1)}% corp. tax
                      </div>
                    </div>

                    <div className="rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] p-3.5">
                      <div className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400">
                        SAFE Return ({summaryData.fiscalYear})
                      </div>
                      <div className="font-mono text-xl font-extrabold text-zinc-950 dark:text-zinc-50 mt-1 tabular-nums">
                        {summaryData.cashMultiple.toFixed(2)}×
                      </div>
                      <div className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 mt-0.5 tabular-nums">
                        5-Yr: {summaryData.fiveYearMultiple.toFixed(2)}× ($
                        {summaryData.fiveYearCumNetM.toFixed(3)}M)
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        {summaryData.fiscalYear} Quarterly Phasing &amp; Full-Year Reconciliation
                      </span>
                      <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                        Seasonal ramp: 21% / 24% / 26% / 29%
                      </span>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.08]">
                      <table className="w-full min-w-[520px] text-left font-mono text-xs tabular-nums">
                        <thead className="bg-zinc-950 text-emerald-400">
                          <tr>
                            <th className="py-2 px-3">Quarter</th>
                            <th className="py-2 px-3 text-right">Share</th>
                            <th className="py-2 px-3 text-right">Revenue</th>
                            <th className="py-2 px-3 text-right">EBITDA</th>
                            <th className="py-2 px-3 text-right">EBITDA %</th>
                            <th className="py-2 px-3 text-right">Net Profit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.06]">
                          {summaryData.quarters.map((qRow) => {
                            const active = qRow.quarter === summaryData.quarter;
                            return (
                              <tr
                                key={qRow.quarter}
                                onClick={() => setSummaryQuarter(qRow.quarter)}
                                className={`cursor-pointer transition-colors ${
                                  active
                                    ? 'bg-emerald-500/12 font-bold text-zinc-950 dark:text-white'
                                    : 'hover:bg-zinc-50 dark:hover:bg-white/[0.03] text-zinc-700 dark:text-zinc-300'
                                }`}
                              >
                                <td className="py-2 px-3">
                                  {qRow.quarter} {summaryData.fiscalYear}
                                  {active && (
                                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500 text-zinc-950">
                                      ACTIVE
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right">{qRow.weightPct}%</td>
                                <td className="py-2 px-3 text-right">{formatCompactUsdK(qRow.revK)}</td>
                                <td className="py-2 px-3 text-right text-teal-700 dark:text-teal-400">
                                  {formatCompactUsdK(qRow.ebitdaK)}
                                </td>
                                <td className="py-2 px-3 text-right">
                                  {qRow.ebitdaMarginPct.toFixed(1)}%
                                </td>
                                <td className="py-2 px-3 text-right text-emerald-700 dark:text-emerald-400 font-semibold">
                                  {formatCompactUsdK(qRow.netProfitK)}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="bg-zinc-100 dark:bg-[#18181B] font-bold text-zinc-950 dark:text-zinc-50">
                            <td className="py-2.5 px-3">
                              Total {summaryData.fiscalYear} ({summaryData.fiscalLabel})
                            </td>
                            <td className="py-2.5 px-3 text-right">100%</td>
                            <td className="py-2.5 px-3 text-right">
                              {formatCompactUsdK(summaryData.annualRevK)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-teal-700 dark:text-teal-400">
                              {formatCompactUsdK(summaryData.annualEbitdaK)}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              {summaryData.annualRevK > 0
                                ? `${((summaryData.annualEbitdaK / summaryData.annualRevK) * 100).toFixed(1)}%`
                                : '0.0%'}
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400">
                              {formatCompactUsdK(summaryData.annualNetProfitK)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] p-4">
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2.5">
                        Model Assumptions &amp; FX Hedge
                      </div>
                      <dl className="space-y-1.5 text-xs">
                        <div className="flex justify-between gap-2">
                          <dt className="text-zinc-600 dark:text-zinc-400">Active Scenario</dt>
                          <dd className="font-mono font-bold text-zinc-950 dark:text-zinc-100 text-right">
                            {summaryData.scenarioLabel}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-zinc-600 dark:text-zinc-400">BDT / USD FX Rate</dt>
                          <dd className="font-mono font-bold text-zinc-950 dark:text-zinc-100 tabular-nums">
                            {summaryData.fxRate} BDT (120 base)
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-zinc-600 dark:text-zinc-400">Effective Corp. Tax</dt>
                          <dd className="font-mono font-bold text-zinc-950 dark:text-zinc-100 tabular-nums">
                            {summaryData.taxRate.toFixed(1)}% (25.0% base)
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-zinc-600 dark:text-zinc-400">20-FTE Dhaka Burn</dt>
                          <dd className="font-mono font-bold text-zinc-950 dark:text-zinc-100 tabular-nums">
                            ${summaryData.dhakaY1UsdK}K/yr (64.8M BDT)
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-zinc-600 dark:text-zinc-400">SAFE Capital Ask</dt>
                          <dd className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            $500K · $4.5M Cap · 20% Disc.
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <div className="rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-white/[0.08] p-4">
                      <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2.5">
                        Composed Sovereign Stack Snapshot
                      </div>
                      <dl className="space-y-1.5 text-xs">
                        <div className="flex justify-between gap-2">
                          <dt className="text-zinc-600 dark:text-zinc-400">Selected Modules</dt>
                          <dd className="font-mono font-bold text-zinc-950 dark:text-zinc-100 tabular-nums">
                            {summaryData.stackModuleCount} / 13 Spenta Apps
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-zinc-600 dark:text-zinc-400">Est. Build Scope</dt>
                          <dd className="font-mono font-bold text-zinc-950 dark:text-zinc-100 tabular-nums">
                            ${(summaryData.stackSetupUsd / 1000).toFixed(1)}K one-time
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-zinc-600 dark:text-zinc-400">Blended Cons. GM%</dt>
                          <dd className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                            {summaryData.stackBlendedGmPct.toFixed(1)}%
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-zinc-600 dark:text-zinc-400">Server PC Tier</dt>
                          <dd className="font-mono font-bold text-zinc-950 dark:text-zinc-100">
                            {summaryData.recommendedTierCode} ({summaryData.recommendedTierCapex})
                          </dd>
                        </div>
                      </dl>
                      {summaryData.stackModuleNames.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-200 dark:border-white/[0.08] text-[11px] text-zinc-600 dark:text-zinc-400">
                          <strong className="text-zinc-950 dark:text-zinc-100">Modules:</strong>{' '}
                          {summaryData.stackModuleNames.join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#09090B] text-white border border-white/[0.08] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                        {summaryData.fiscalYear} Operating Milestone &amp; Governance
                      </div>
                      <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                        {summaryData.milestone}. Backed by L1–L6 Sovereign Core (OPA ≥0.88 HITL gate, zero external LLM cloud egress) and 250%–350% enterprise client ROI.
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-zinc-400 shrink-0">
                      spenta.tech · hello@spenta.tech
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
