import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertTriangle,
  Calendar,
  Store,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { ReceiptData } from '../types/receipt';
import {
  getWarrantyStatus,
  formatDate,
  formatCurrency,
  getDaysRemaining,
} from '../utils/dateUtils';

interface WarrantyDashboardProps {
  receipts: ReceiptData[];
  onSelectReceipt: (receipt: ReceiptData) => void;
}

export const WarrantyDashboard: React.FC<WarrantyDashboardProps> = ({
  receipts,
  onSelectReceipt,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'expiring_soon' | 'active' | 'expired'>('all');

  // Compute metric stats
  const metrics = useMemo(() => {
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;
    let totalItemsCovered = 0;

    receipts.forEach((r) => {
      const w = getWarrantyStatus(r.overallWarrantyExpirationDate);
      if (w.status === 'active') active++;
      if (w.status === 'expiring_soon') expiringSoon++;
      if (w.status === 'expired') expired++;

      r.items.forEach((item) => {
        if (item.hasWarranty || item.warrantyExpirationDate) {
          totalItemsCovered++;
        }
      });
    });

    return { active, expiringSoon, expired, totalItemsCovered };
  }, [receipts]);

  // Receipts with warranties sorted by expiration date ascending
  const warrantyReceipts = useMemo(() => {
    return receipts
      .filter((r) => r.overallWarrantyExpirationDate)
      .map((r) => {
        const w = getWarrantyStatus(r.overallWarrantyExpirationDate);
        return { receipt: r, warrantyInfo: w };
      })
      .filter(({ warrantyInfo }) => {
        if (filterTab === 'all') return true;
        return warrantyInfo.status === filterTab;
      })
      .sort((a, b) => {
        const dateA = new Date(a.receipt.overallWarrantyExpirationDate!).getTime();
        const dateB = new Date(b.receipt.overallWarrantyExpirationDate!).getTime();
        return dateA - dateB;
      });
  }, [receipts, filterTab]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Warranty Expiration Center
            </h1>
            <p className="text-xs text-slate-500">
              Track active manufacturer warranties, extended protection plans, and claims
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expiring Soon Card */}
        <div className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-bold uppercase tracking-wider">Expiring Soon (&lt; 30d)</span>
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono">
            {metrics.expiringSoon}
          </div>
          <p className="text-[11px] text-slate-500">Require immediate claim or renewal review</p>
        </div>

        {/* Active Warranties */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider">Active Warranties</span>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono">
            {metrics.active}
          </div>
          <p className="text-[11px] text-slate-500">Fully covered under active plan</p>
        </div>

        {/* Expired Warranties */}
        <div className="bg-white rounded-2xl p-5 border border-rose-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-bold uppercase tracking-wider">Expired Warranties</span>
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono">
            {metrics.expired}
          </div>
          <p className="text-[11px] text-slate-500">Passed warranty protection date</p>
        </div>

        {/* Total Warranted Items */}
        <div className="bg-white rounded-2xl p-5 border border-blue-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-xs font-bold uppercase tracking-wider">Total Covered Items</span>
            <FileText className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono">
            {metrics.totalItemsCovered}
          </div>
          <p className="text-[11px] text-slate-500">Products with protection terms</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterTab === 'all'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Warranties ({receipts.filter((r) => r.overallWarrantyExpirationDate).length})
        </button>
        <button
          onClick={() => setFilterTab('expiring_soon')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterTab === 'expiring_soon'
              ? 'bg-amber-500 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Expiring Soon ({metrics.expiringSoon})
        </button>
        <button
          onClick={() => setFilterTab('active')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterTab === 'active'
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Active ({metrics.active})
        </button>
        <button
          onClick={() => setFilterTab('expired')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterTab === 'expired'
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Expired ({metrics.expired})
        </button>
      </div>

      {/* Warranty Items Timeline List */}
      {warrantyReceipts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No matching warranties found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Scan store receipts with electronics, tools, or extended service plans to automatically populate this calendar.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {warrantyReceipts.map(({ receipt: rcpt, warrantyInfo }) => (
            <div
              key={rcpt.id}
              onClick={() => onSelectReceipt(rcpt)}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    warrantyInfo.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : warrantyInfo.status === 'expiring_soon'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {warrantyInfo.status === 'active' ? (
                    <ShieldCheck className="w-6 h-6" />
                  ) : warrantyInfo.status === 'expiring_soon' ? (
                    <Clock className="w-6 h-6 animate-pulse" />
                  ) : (
                    <ShieldAlert className="w-6 h-6" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-base">
                      {rcpt.storeName}
                    </h3>
                    <span className="text-xs font-mono text-slate-400">
                      Purchased {formatDate(rcpt.purchaseDate)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 font-medium">
                    {rcpt.warrantySummary || 'Coverage details extracted from OCR'}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    {rcpt.items
                      .filter((i) => i.hasWarranty || i.warrantyExpirationDate)
                      .map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700"
                        >
                          {item.name}
                        </span>
                      ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Expires On
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono">
                    {formatDate(rcpt.overallWarrantyExpirationDate)}
                  </span>
                  <span
                    className={`block text-[11px] font-bold ${
                      warrantyInfo.status === 'active'
                        ? 'text-emerald-600'
                        : warrantyInfo.status === 'expiring_soon'
                        ? 'text-amber-600 font-extrabold animate-bounce'
                        : 'text-rose-600'
                    }`}
                  >
                    {warrantyInfo.label}
                  </span>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
