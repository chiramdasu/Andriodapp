import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ReceiptUploader } from './components/ReceiptUploader';
import { ReceiptDetails } from './components/ReceiptDetails';
import { ReceiptVault } from './components/ReceiptVault';
import { WarrantyDashboard } from './components/WarrantyDashboard';
import { Analytics } from './components/Analytics';
import { ReceiptData } from './types/receipt';
import { SAMPLE_RECEIPTS } from './utils/sampleReceipts';
import { getWarrantyStatus } from './utils/dateUtils';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'vault' | 'warranty' | 'analytics'>('scan');
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load receipts from localStorage on initial render
  useEffect(() => {
    try {
      const stored = localStorage.getItem('rcpt_vault_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setReceipts(parsed);
          return;
        }
      }
      // If empty, initialize with pre-parsed sample receipts for instant rich preview
      const initialSamples = SAMPLE_RECEIPTS.map((s) => s.parsedFallback);
      setReceipts(initialSamples);
      localStorage.setItem('rcpt_vault_v1', JSON.stringify(initialSamples));
    } catch (e) {
      console.error('Failed to load receipts from localStorage:', e);
    }
  }, []);

  // Sync receipts to localStorage whenever updated
  const saveReceiptsToStorage = (updatedList: ReceiptData[]) => {
    setReceipts(updatedList);
    try {
      localStorage.setItem('rcpt_vault_v1', JSON.stringify(updatedList));
    } catch (e) {
      console.error('Failed to save receipts to localStorage:', e);
    }
  };

  // OCR Handlers
  const handleParseStart = () => {
    setIsProcessing(true);
    setErrorMessage(null);
  };

  const handleParseSuccess = (newReceipt: ReceiptData, imageBase64: string) => {
    setIsProcessing(false);
    const receiptWithImg = { ...newReceipt, imageUrl: imageBase64 };
    setSelectedReceipt(receiptWithImg);
    setActiveTab('scan'); // Stay on active scan result view
  };

  const handleParseError = (err: string) => {
    setIsProcessing(false);
    setErrorMessage(err);
  };

  // Save/Update receipt in Vault
  const handleSaveReceipt = (updated: ReceiptData) => {
    const existingIdx = receipts.findIndex((r) => r.id === updated.id);
    let updatedList: ReceiptData[];
    if (existingIdx >= 0) {
      updatedList = [...receipts];
      updatedList[existingIdx] = updated;
    } else {
      updatedList = [updated, ...receipts];
    }
    saveReceiptsToStorage(updatedList);
    setSelectedReceipt(updated);
  };

  // Delete receipt from Vault
  const handleDeleteReceipt = (id: string) => {
    const updated = receipts.filter((r) => r.id !== id);
    saveReceiptsToStorage(updated);
    if (selectedReceipt && selectedReceipt.id === id) {
      setSelectedReceipt(null);
    }
  };

  // Counts for badge notifications (item-level: any item expiring within 30d)
  const expiringCount = receipts.reduce((count, r) => {
    const hasExpiringItem = r.items.some(
      (item) => getWarrantyStatus(item.warrantyExpirationDate).status === 'expiring_soon'
    );
    const receiptExpiring =
      getWarrantyStatus(r.overallWarrantyExpirationDate).status === 'expiring_soon';
    return count + (hasExpiringItem || receiptExpiring ? 1 : 0);
  }, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased flex flex-col selection:bg-blue-500 selection:text-white">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab === 'scan' && !isProcessing) {
            // Keep selectedReceipt or reset
          }
        }}
        savedCount={receipts.length}
        expiringCount={expiringCount}
        onNewScanClick={() => {
          setSelectedReceipt(null);
          setActiveTab('scan');
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {errorMessage && (
          <div className="max-w-2xl mx-auto mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
            <div>
              <span className="font-bold block">OCR Issue</span>
              <p className="text-xs text-rose-600">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="px-3 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold text-xs transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab 1: Scan / OCR Upload OR Result View */}
        {activeTab === 'scan' && (
          <div>
            {selectedReceipt ? (
              <ReceiptDetails
                receipt={selectedReceipt}
                onSave={handleSaveReceipt}
                onDelete={handleDeleteReceipt}
                onNewScan={() => setSelectedReceipt(null)}
                isSavedInVault={receipts.some((r) => r.id === selectedReceipt.id)}
              />
            ) : (
              <ReceiptUploader
                onParseStart={handleParseStart}
                onParseSuccess={handleParseSuccess}
                onParseError={handleParseError}
                isProcessing={isProcessing}
              />
            )}
          </div>
        )}

        {/* Tab 2: Saved Receipts Vault */}
        {activeTab === 'vault' && (
          <ReceiptVault
            receipts={receipts}
            onSelectReceipt={(rcpt) => {
              setSelectedReceipt(rcpt);
              setActiveTab('scan');
            }}
            onDeleteReceipt={handleDeleteReceipt}
            onNewScan={() => {
              setSelectedReceipt(null);
              setActiveTab('scan');
            }}
          />
        )}

        {/* Tab 3: Warranty Expiration Center */}
        {activeTab === 'warranty' && (
          <WarrantyDashboard
            receipts={receipts}
            onSelectReceipt={(rcpt) => {
              setSelectedReceipt(rcpt);
              setActiveTab('scan');
            }}
          />
        )}

        {/* Tab 4: Spending Analytics */}
        {activeTab === 'analytics' && <Analytics receipts={receipts} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <p>ReceiptVault &copy; 2026. On-device Tesseract OCR — fully offline, no account or API key needed.</p>
      </footer>
    </div>
  );
}
