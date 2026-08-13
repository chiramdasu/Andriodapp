import React from 'react';
import {
  Receipt,
  ShieldCheck,
  PlusCircle,
  FolderArchive,
  BarChart2,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'scan' | 'vault' | 'warranty' | 'analytics';
  setActiveTab: (tab: 'scan' | 'vault' | 'warranty' | 'analytics') => void;
  savedCount: number;
  expiringCount: number;
  onNewScanClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  savedCount,
  expiringCount,
  onNewScanClick,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-lg tracking-tight">
                  ReceiptVault
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <Sparkles className="w-2.5 h-2.5 text-blue-600" /> AI OCR
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Auto-parse store, date, total &amp; warranty expiration
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('scan')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'scan'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden md:inline">Scan Receipt</span>
            </button>

            <button
              onClick={() => setActiveTab('vault')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                activeTab === 'vault'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <FolderArchive className="w-4 h-4" />
              <span>Vault</span>
              {savedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs font-semibold bg-slate-200 text-slate-700">
                  {savedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('warranty')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                activeTab === 'warranty'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Warranties</span>
              {expiringCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs font-semibold bg-amber-500 text-white animate-pulse">
                  {expiringCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-blue-50 text-blue-700 border border-blue-200/60 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span className="hidden lg:inline">Analytics</span>
            </button>
          </nav>

          {/* Quick Action Button */}
          {activeTab !== 'scan' && (
            <button
              onClick={onNewScanClick}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Upload Receipt
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
