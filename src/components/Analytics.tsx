import React, { useMemo } from 'react';
import { BarChart2, PieChart, DollarSign, Tag, TrendingUp, Calendar, ShoppingBag } from 'lucide-react';
import { ReceiptData } from '../types/receipt';
import { formatCurrency } from '../utils/dateUtils';

interface AnalyticsProps {
  receipts: ReceiptData[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ receipts }) => {
  const stats = useMemo(() => {
    let totalSpend = 0;
    const categoryTotals: Record<string, number> = {};
    const monthlyTotals: Record<string, number> = {};

    receipts.forEach((r) => {
      totalSpend += r.totalAmount;

      // Category breakdown
      const cat = r.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + r.totalAmount;

      // Monthly breakdown
      if (r.purchaseDate) {
        const monthKey = r.purchaseDate.slice(0, 7); // YYYY-MM
        monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + r.totalAmount;
      }
    });

    const averageSpend = receipts.length > 0 ? totalSpend / receipts.length : 0;

    const categoryList = Object.entries(categoryTotals)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpend > 0 ? (amount / totalSpend) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const monthlyList = Object.entries(monthlyTotals)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return { totalSpend, averageSpend, categoryList, monthlyList };
  }, [receipts]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Spending Analytics
            </h1>
            <p className="text-xs text-slate-500">
              Category totals, purchase history, and expenditure summaries
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Spent</span>
          <div className="text-3xl font-extrabold text-slate-900 font-mono">
            {formatCurrency(stats.totalSpend)}
          </div>
          <p className="text-[11px] text-slate-500">Across {receipts.length} stored receipts</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Receipt</span>
          <div className="text-3xl font-extrabold text-blue-600 font-mono">
            {formatCurrency(stats.averageSpend)}
          </div>
          <p className="text-[11px] text-slate-500">Average transaction size</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Top Category</span>
          <div className="text-2xl font-extrabold text-slate-900 truncate">
            {stats.categoryList[0]?.category || 'N/A'}
          </div>
          <p className="text-[11px] text-slate-500">
            {stats.categoryList[0] ? formatCurrency(stats.categoryList[0].amount) : '$0.00'}
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <PieChart className="w-4 h-4 text-blue-600" /> Spending by Category
        </h3>

        {stats.categoryList.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No spending data available yet.</p>
        ) : (
          <div className="space-y-3">
            {stats.categoryList.map((item) => (
              <div key={item.category} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    {item.category}
                  </span>
                  <span className="font-mono">{formatCurrency(item.amount)} ({item.percentage.toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
