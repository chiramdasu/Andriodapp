import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Calendar,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { ReceiptData, ReceiptItem } from '../types/receipt';
import {
  getWarrantyStatus,
  formatDate,
  formatCurrency,
} from '../utils/dateUtils';

interface WarrantyDashboardProps {
  receipts: ReceiptData[];
  onSelectReceipt: (receipt: ReceiptData) => void;
}

interface WarrantyEntry {
  receipt: ReceiptData;
  item: ReceiptItem;
  status: ReturnType<typeof getWarrantyStatus>;
}

export const WarrantyDashboard: React.FC<WarrantyDashboardProps> = ({
  receipts,
  onSelectReceipt,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'expiring_soon' | 'active' | 'expired'>('all');

  // Flatten every warrantied item across all receipts
  const allEntries = useMemo<WarrantyEntry[]>(() => {
    const entries: WarrantyEntry[] = [];
    receipts.forEach((receipt) => {
      receipt.items.forEach((item) => {
        if (item.warrantyExpirationDate || item.hasWarranty) {
          entries.push({
            receipt,
            item,
            status: getWarrantyStatus(item.warrantyExpirationDate),
          });
        }
      });
    });
    // Sort by expiration date ascending (soonest first; no-date last)
    return entries.sort((a, b) => {
      const da = a.item.warrantyExpirationDate
        ? new Date(a.item.warrantyExpirationDate).getTime()
        : Number.POSITIVE_INFINITY;
      const db = b.item.warrantyExpirationDate
        ? new Date(b.item.warrantyExpirationDate).getTime()
        : Number.POSITIVE_INFINITY;
      return da - db;
    });
  }, [receipts]);

  const metrics = useMemo(() => {
    let active = 0;
    let expiringSoon = 0;
    let expired = 0;
    allEntries.forEach(({ status }) => {
      if (status.status === 'active') active++;
      if (status.status === 'expiring_soon') expiringSoon++;
      if (status.status === 'expired') expired++;
    });
    return { active, expiringSoon, expired, totalItemsCovered: allEntries.length };
  }, [allEntries]);

  const filteredEntries = useMemo(() => {
    if (filterTab === 'all') return allEntries;
    return allEntries.filter(({ status }) => status.status === filterTab);
  }, [allEntries, filterTab]);

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
              Every warrantied item across all receipts, sorted by expiration date
            </p>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-bold uppercase tracking-wider">Expiring Soon (≤ 30d)</span>
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono">
            {metrics.expiringSoon}
          </div>
          <p className="text-[11px] text-slate-500">Items needing immediate claim or renewal review</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-emerald-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider">Active Warranties</span>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono">
            {metrics.active}
          </div>
          <p className="text-[11px] text-slate-500">Items fully covered under an active plan</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-rose-200/80 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-bold uppercase tracking-wider">Expired Warranties</span>
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-mono">
            {metrics.expired}
          </div>
          <p className="text-[11px] text-slate-500">Items past their warranty protection date</p>
        </div>

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
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 flex-wrap">
        <button
          onClick={() => setFilterTab('all')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterTab === 'all'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Items ({metrics.totalItemsCovered})
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

      {/* Warranty Items List, soonest expiry first */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No matching warranties found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Scan store receipts with electronics, appliances, tools, or extended service plans
            to automatically populate this tracker.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map(({ receipt: rcpt, item, status }) => (
            <div
              key={`${rcpt.id}-${item.id}`}
              onClick={() => onSelectReceipt(rcpt)}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    status.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : status.status === 'expiring_soon'
                      ? 'bg-amber-100 text-amber-700'
                      : status.status === 'expired'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {status.status === 'active' ? (
                    <ShieldCheck className="w-6 h-6" />
                  ) : status.status === 'expiring_soon' ? (
                    <Clock className="w-6 h-6 animate-pulse" />
                  ) : status.status === 'expired' ? (
                    <ShieldAlert className="w-6 h-6" />
                  ) : (
                    <ShieldCheck className="w-6 h-6" />
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="font-extrabold text-slate-900 text-base">{item.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 font-medium">
                    <span className="font-semibold text-slate-700">{rcpt.storeName}</span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Purchased {formatDate(rcpt.purchaseDate)}
                    </span>
                    <span className="font-mono">{formatCurrency(item.price, rcpt.currency)}</span>
                    {item.category && (
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                        {item.category}
                      </span>
                    )}
                    {item.warrantyDurationMonths ? (
                      <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                        {item.warrantyDurationMonths} mo warranty
                      </span>
                    ) : null}
                  </div>
                  {item.warrantyNotes && (
                    <p className="text-[11px] text-slate-500 line-clamp-1">{item.warrantyNotes}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">
                    Expires On
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 font-mono">
                    {formatDate(item.warrantyExpirationDate)}
                  </span>
                  <span
                    className={`block text-[11px] font-bold ${
                      status.status === 'active'
                        ? 'text-emerald-600'
                        : status.status === 'expiring_soon'
                        ? 'text-amber-600 font-extrabold'
                        : status.status === 'expired'
                        ? 'text-rose-600'
                        : 'text-slate-500'
                    }`}
                  >
                    {status.label}
                    {status.daysRemaining !== null && status.daysRemaining >= 0
                      ? ` · ${status.daysRemaining} days left`
                      : ''}
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
