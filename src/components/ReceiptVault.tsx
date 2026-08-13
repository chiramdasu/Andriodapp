import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Receipt as ReceiptIcon,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Calendar,
  DollarSign,
  ChevronRight,
  Trash2,
  FolderArchive,
  PlusCircle,
  Tag,
} from 'lucide-react';
import { ReceiptData } from '../types/receipt';
import {
  getWarrantyStatus,
  formatDate,
  formatCurrency,
} from '../utils/dateUtils';

interface ReceiptVaultProps {
  receipts: ReceiptData[];
  onSelectReceipt: (receipt: ReceiptData) => void;
  onDeleteReceipt: (id: string) => void;
  onNewScan: () => void;
}

export const ReceiptVault: React.FC<ReceiptVaultProps> = ({
  receipts,
  onSelectReceipt,
  onDeleteReceipt,
  onNewScan,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [warrantyFilter, setWarrantyFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set<string>();
    receipts.forEach((r) => {
      if (r.category) cats.add(r.category);
    });
    return Array.from(cats);
  }, [receipts]);

  // Filtered and sorted receipts
  const filteredReceipts = useMemo(() => {
    return receipts
      .filter((r) => {
        // Search query check
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          !q ||
          r.storeName.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          (r.receiptNumber && r.receiptNumber.toLowerCase().includes(q)) ||
          r.items.some((it) => it.name.toLowerCase().includes(q));

        if (!matchesSearch) return false;

        // Category check
        if (categoryFilter !== 'all' && r.category !== categoryFilter) {
          return false;
        }

        // Warranty filter
        if (warrantyFilter !== 'all') {
          const w = getWarrantyStatus(r.overallWarrantyExpirationDate);
          if (warrantyFilter === 'active' && w.status !== 'active') return false;
          if (warrantyFilter === 'expiring_soon' && w.status !== 'expiring_soon') return false;
          if (warrantyFilter === 'expired' && w.status !== 'expired') return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'date_desc') {
          return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
        } else if (sortBy === 'date_asc') {
          return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
        } else if (sortBy === 'amount_desc') {
          return b.totalAmount - a.totalAmount;
        } else if (sortBy === 'amount_asc') {
          return a.totalAmount - b.totalAmount;
        }
        return 0;
      });
  }, [receipts, searchQuery, categoryFilter, warrantyFilter, sortBy]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Receipt Vault
              </h1>
              <p className="text-xs text-slate-500">
                {receipts.length} total receipts stored in local archive
              </p>
            </div>
          </div>

          <button
            onClick={onNewScan}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" /> Scan New Receipt
          </button>
        </div>

        {/* Search Bar & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search store, item, or order #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Warranty Status Filter */}
          <select
            value={warrantyFilter}
            onChange={(e) => setWarrantyFilter(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="all">All Warranties</option>
            <option value="active">Active Warranty</option>
            <option value="expiring_soon">Expiring Soon (&lt; 30d)</option>
            <option value="expired">Expired Warranty</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="date_desc">Newest Purchase First</option>
            <option value="date_asc">Oldest Purchase First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="amount_asc">Lowest Amount</option>
          </select>
        </div>
      </div>

      {/* Receipts List */}
      {filteredReceipts.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
            <ReceiptIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No receipts found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {receipts.length === 0
                ? 'Your vault is currently empty. Scan a receipt image or select a sample receipt to populate your vault.'
                : 'No receipts match your search and filter criteria.'}
            </p>
          </div>
          {receipts.length === 0 && (
            <button
              onClick={onNewScan}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-xs hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Scan First Receipt
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReceipts.map((rcpt) => {
            const warranty = getWarrantyStatus(rcpt.overallWarrantyExpirationDate);

            return (
              <div
                key={rcpt.id}
                onClick={() => onSelectReceipt(rcpt)}
                className="group bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-blue-500/80 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 relative"
              >
                <div className="space-y-3">
                  {/* Top Bar: Store Name & Warranty Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition-colors line-clamp-1">
                        {rcpt.storeName}
                      </h3>
                      <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {formatDate(rcpt.purchaseDate)}
                      </span>
                    </div>

                    <span
                      className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                        warranty.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : warranty.status === 'expiring_soon'
                          ? 'bg-amber-100 text-amber-800'
                          : warranty.status === 'expired'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {warranty.status === 'active' ? (
                        <ShieldCheck className="w-3 h-3" />
                      ) : warranty.status === 'expiring_soon' ? (
                        <Clock className="w-3 h-3" />
                      ) : (
                        <ShieldAlert className="w-3 h-3" />
                      )}
                      {warranty.label}
                    </span>
                  </div>

                  {/* Items Brief List */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      {rcpt.items.length} {rcpt.items.length === 1 ? 'Item' : 'Items'} Purchased
                    </span>
                    <p className="text-xs font-medium text-slate-700 line-clamp-2">
                      {rcpt.items.map((i) => i.name).join(', ')}
                    </p>
                  </div>
                </div>

                {/* Footer: Amount & Action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Total Paid</span>
                    <p className="text-lg font-extrabold text-slate-900 font-mono">
                      {formatCurrency(rcpt.totalAmount, rcpt.currency)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteReceipt(rcpt.id);
                      }}
                      title="Delete Receipt"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors flex items-center justify-center">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
