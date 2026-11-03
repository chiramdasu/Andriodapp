import React, { useState } from 'react';
import {
  Store,
  Calendar,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Edit3,
  Save,
  Check,
  Trash2,
  ZoomIn,
  Download,
  Share2,
  Plus,
  Tag,
  AlertCircle,
  X,
  FileText,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { ReceiptData, ReceiptItem } from '../types/receipt';
import {
  getWarrantyStatus,
  formatDate,
  formatCurrency,
  calculateExpirationDate,
} from '../utils/dateUtils';

interface ReceiptDetailsProps {
  receipt: ReceiptData;
  onSave: (updated: ReceiptData) => void;
  onDelete?: (id: string) => void;
  onNewScan: () => void;
  isSavedInVault: boolean;
}

export const ReceiptDetails: React.FC<ReceiptDetailsProps> = ({
  receipt,
  onSave,
  onDelete,
  onNewScan,
  isSavedInVault,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedReceipt, setEditedReceipt] = useState<ReceiptData>(receipt);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const warranty = getWarrantyStatus(editedReceipt.overallWarrantyExpirationDate);

  const handleFieldChange = (field: keyof ReceiptData, value: any) => {
    setEditedReceipt((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: keyof ReceiptItem, value: any) => {
    setEditedReceipt((prev) => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      return { ...prev, items: updatedItems };
    });
  };

  // Editing warranty duration (months) recomputes the item's expiration
  // date from the receipt's purchase date.
  const handleItemWarrantyMonths = (index: number, monthsRaw: string) => {
    const months = parseInt(monthsRaw, 10);
    setEditedReceipt((prev) => {
      const updatedItems = [...prev.items];
      const item = { ...updatedItems[index] };
      if (!monthsRaw || isNaN(months) || months <= 0) {
        item.warrantyDurationMonths = undefined;
        item.warrantyExpirationDate = undefined;
        item.hasWarranty = false;
      } else {
        item.warrantyDurationMonths = months;
        item.hasWarranty = true;
        item.warrantyExpirationDate = calculateExpirationDate(prev.purchaseDate, months);
      }
      updatedItems[index] = item;
      return { ...prev, items: updatedItems };
    });
  };

  // Keep overall receipt expiry in sync with the latest item expiry on save
  const recomputeOverallExpiry = (r: ReceiptData): ReceiptData => {
    let latest: string | undefined;
    r.items.forEach((i) => {
      if (i.warrantyExpirationDate && (!latest || i.warrantyExpirationDate > latest)) {
        latest = i.warrantyExpirationDate;
      }
    });
    return { ...r, overallWarrantyExpirationDate: latest };
  };

  const addItem = () => {
    setEditedReceipt((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `item-${Date.now()}`,
          name: 'New Item',
          price: 0,
          quantity: 1,
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    setEditedReceipt((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSaveClick = () => {
    setIsEditing(false);
    const finalReceipt = recomputeOverallExpiry(editedReceipt);
    setEditedReceipt(finalReceipt);
    onSave(finalReceipt);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(editedReceipt, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${editedReceipt.storeName}_Receipt_${editedReceipt.purchaseDate}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Store,Purchase Date,Total,Currency,Warranty Expiration,Item Name,Item Price,Item Qty\n';
    editedReceipt.items.forEach((item) => {
      csvContent += `"${editedReceipt.storeName}","${editedReceipt.purchaseDate}",${editedReceipt.totalAmount},"${editedReceipt.currency}","${editedReceipt.overallWarrantyExpirationDate || ''}","${item.name}",${item.price},${item.quantity}\n`;
    });
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `${editedReceipt.storeName}_Receipt_${editedReceipt.purchaseDate}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Toast notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-bounce">
          <Check className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold">Receipt successfully saved to Vault!</span>
        </div>
      )}

      {/* Action Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-blue-600" />
            {editedReceipt.confidenceScore
              ? `On-Device OCR (${editedReceipt.confidenceScore}% Confidence)`
              : 'Manual Entry'}
          </span>
          {isSavedInVault && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <Check className="w-3 h-3" /> Saved in Vault
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onNewScan}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <RotateCw className="w-3.5 h-3.5" /> Scan New
          </button>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Fields
            </button>
          ) : (
            <button
              onClick={handleSaveClick}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save Changes
            </button>
          )}

          <button
            onClick={handleSaveClick}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {isSavedInVault ? 'Update Vault' : 'Save to Vault'}
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          <button
            onClick={exportCSV}
            title="Export CSV"
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          {onDelete && (
            <button
              onClick={() => onDelete(editedReceipt.id)}
              title="Delete Receipt"
              className="p-2 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid Layout: Left Details + Right Receipt Image Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Parsed Key Details & Line Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Warranty Status Callout Banner */}
          <div
            className={`rounded-2xl p-5 border shadow-2xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              warranty.status === 'active'
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : warranty.status === 'expiring_soon'
                ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                : warranty.status === 'expired'
                ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  warranty.status === 'active'
                    ? 'bg-emerald-600 text-white'
                    : warranty.status === 'expiring_soon'
                    ? 'bg-amber-500 text-white'
                    : warranty.status === 'expired'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-400 text-white'
                }`}
              >
                {warranty.status === 'active' ? (
                  <ShieldCheck className="w-6 h-6" />
                ) : warranty.status === 'expiring_soon' ? (
                  <Clock className="w-6 h-6" />
                ) : (
                  <ShieldAlert className="w-6 h-6" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-base tracking-tight">
                    Warranty Status: {warranty.label}
                  </span>
                </div>
                <p className="text-xs opacity-85">
                  {editedReceipt.warrantySummary ||
                    (editedReceipt.overallWarrantyExpirationDate
                      ? `Coverage valid until ${formatDate(editedReceipt.overallWarrantyExpirationDate)}`
                      : 'No explicit warranty terms detected on receipt.')}
                </p>
              </div>
            </div>

            {/* Warranty Date Input / Display */}
            <div className="shrink-0 w-full sm:w-auto bg-white/70 backdrop-blur-xs p-2.5 rounded-xl border border-black/5 text-right">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                Warranty Expiration Date
              </label>
              {isEditing ? (
                <input
                  type="date"
                  value={editedReceipt.overallWarrantyExpirationDate || ''}
                  onChange={(e) => handleFieldChange('overallWarrantyExpirationDate', e.target.value)}
                  className="text-xs font-bold border border-slate-300 rounded-md px-2 py-1 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="text-sm font-extrabold font-mono text-slate-900">
                  {formatDate(editedReceipt.overallWarrantyExpirationDate) || 'None set'}
                </div>
              )}
            </div>
          </div>

          {/* Primary Header Details Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Merchant / Store
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedReceipt.storeName}
                    onChange={(e) => handleFieldChange('storeName', e.target.value)}
                    className="text-xl font-bold border border-slate-300 rounded-lg px-2.5 py-1 text-slate-900 w-full"
                  />
                ) : (
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <Store className="w-5 h-5 text-blue-600" />
                    {editedReceipt.storeName}
                  </h2>
                )}
                {editedReceipt.storeAddress && (
                  <p className="text-xs text-slate-500">{editedReceipt.storeAddress}</p>
                )}
              </div>

              <div className="text-right space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Paid Amount
                </label>
                {isEditing ? (
                  <div className="flex items-center gap-1 justify-end">
                    <input
                      type="text"
                      value={editedReceipt.currency}
                      onChange={(e) => handleFieldChange('currency', e.target.value)}
                      className="w-10 text-xl font-extrabold text-right border border-slate-300 rounded-md px-1"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={editedReceipt.totalAmount}
                      onChange={(e) => handleFieldChange('totalAmount', parseFloat(e.target.value) || 0)}
                      className="w-32 text-xl font-extrabold text-right border border-slate-300 rounded-md px-2 py-1 text-slate-900"
                    />
                  </div>
                ) : (
                  <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight text-blue-600">
                    {formatCurrency(editedReceipt.totalAmount, editedReceipt.currency)}
                  </div>
                )}
              </div>
            </div>

            {/* Key Metadata Fields */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">
                  Purchase Date
                </span>
                {isEditing ? (
                  <input
                    type="date"
                    value={editedReceipt.purchaseDate}
                    onChange={(e) => handleFieldChange('purchaseDate', e.target.value)}
                    className="text-xs font-semibold border rounded-md px-2 py-1 text-slate-800 w-full"
                  />
                ) : (
                  <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    {formatDate(editedReceipt.purchaseDate)}
                  </span>
                )}
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">
                  Category
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedReceipt.category}
                    onChange={(e) => handleFieldChange('category', e.target.value)}
                    className="text-xs font-semibold border rounded-md px-2 py-1 text-slate-800 w-full"
                  />
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700">
                    <Tag className="w-3 h-3 text-slate-500" />
                    {editedReceipt.category}
                  </span>
                )}
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">
                  Payment Method
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedReceipt.paymentMethod || ''}
                    onChange={(e) => handleFieldChange('paymentMethod', e.target.value)}
                    className="text-xs font-semibold border rounded-md px-2 py-1 text-slate-800 w-full"
                  />
                ) : (
                  <span className="text-sm font-semibold text-slate-700">
                    {editedReceipt.paymentMethod || 'Card'}
                  </span>
                )}
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-1">
                  Receipt / Invoice #
                </span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedReceipt.receiptNumber || ''}
                    onChange={(e) => handleFieldChange('receiptNumber', e.target.value)}
                    className="text-xs font-semibold border rounded-md px-2 py-1 text-slate-800 w-full"
                  />
                ) : (
                  <span className="text-sm font-mono text-slate-700">
                    {editedReceipt.receiptNumber || 'N/A'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Itemized Products Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> Itemized Line Items ({editedReceipt.items.length})
              </h3>
              {isEditing && (
                <button
                  onClick={addItem}
                  className="px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition-colors flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                    <th className="py-2.5 px-2">Product Description</th>
                    <th className="py-2.5 px-2 text-center w-16">Qty</th>
                    <th className="py-2.5 px-2 text-right w-24">Price</th>
                    <th className="py-2.5 px-2 text-left w-48">Warranty Coverage</th>
                    {isEditing && <th className="py-2.5 px-2 w-10"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {editedReceipt.items.map((item, idx) => {
                    const itemWarranty = getWarrantyStatus(item.warrantyExpirationDate);
                    return (
                      <tr key={item.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        {/* Name */}
                        <td className="py-3 px-2 font-semibold text-slate-800">
                          {isEditing ? (
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                              className="w-full border rounded-md px-2 py-1 text-xs"
                            />
                          ) : (
                            <div>
                              <span>{item.name}</span>
                              {item.category && (
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  {item.category}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Qty */}
                        <td className="py-3 px-2 text-center font-semibold text-slate-700">
                          {isEditing ? (
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-12 border rounded-md px-1 py-1 text-xs text-center"
                            />
                          ) : (
                            item.quantity
                          )}
                        </td>

                        {/* Price */}
                        <td className="py-3 px-2 text-right font-bold text-slate-900 font-mono">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={item.price}
                              onChange={(e) => handleItemChange(idx, 'price', parseFloat(e.target.value) || 0)}
                              className="w-20 border rounded-md px-1 py-1 text-xs text-right"
                            />
                          ) : (
                            formatCurrency(item.price, editedReceipt.currency)
                          )}
                        </td>

                        {/* Item Warranty */}
                        <td className="py-3 px-2">
                          {isEditing ? (
                            <div className="space-y-1">
                              <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                                Duration (months)
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="e.g. 12"
                                  value={item.warrantyDurationMonths ?? ''}
                                  onChange={(e) => handleItemWarrantyMonths(idx, e.target.value)}
                                  className="w-16 border rounded-md px-1.5 py-0.5 text-[11px] text-slate-800"
                                />
                              </label>
                              <input
                                type="date"
                                value={item.warrantyExpirationDate || ''}
                                onChange={(e) => handleItemChange(idx, 'warrantyExpirationDate', e.target.value)}
                                className="w-full border rounded-md px-1.5 py-0.5 text-[11px]"
                              />
                              <input
                                type="text"
                                placeholder="Warranty notes..."
                                value={item.warrantyNotes || ''}
                                onChange={(e) => handleItemChange(idx, 'warrantyNotes', e.target.value)}
                                className="w-full border rounded-md px-1.5 py-0.5 text-[10px]"
                              />
                            </div>
                          ) : item.warrantyExpirationDate ? (
                            <div className="space-y-0.5">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                  itemWarranty.status === 'active'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : itemWarranty.status === 'expiring_soon'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                <ShieldCheck className="w-3 h-3" />
                                {formatDate(item.warrantyExpirationDate)}
                              </span>
                              {item.warrantyNotes && (
                                <p className="text-[10px] text-slate-500 line-clamp-1">
                                  {item.warrantyNotes}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">No warranty</span>
                          )}
                        </td>

                        {isEditing && (
                          <td className="py-3 px-2 text-center">
                            <button
                              onClick={() => removeItem(idx)}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded-md"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Summary Breakdown */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <div className="w-64 space-y-2 text-xs">
                {editedReceipt.subtotal !== undefined && (
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatCurrency(editedReceipt.subtotal, editedReceipt.currency)}</span>
                  </div>
                )}
                {editedReceipt.tax !== undefined && (
                  <div className="flex justify-between text-slate-500">
                    <span>Sales Tax:</span>
                    <span className="font-mono">{formatCurrency(editedReceipt.tax, editedReceipt.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-200">
                  <span>Total Paid:</span>
                  <span className="font-mono text-blue-600">{formatCurrency(editedReceipt.totalAmount, editedReceipt.currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Receipt Image Preview Card */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> Scanned Receipt Photo
              </h3>
              {editedReceipt.imageUrl && (
                <button
                  onClick={() => setImageModalOpen(true)}
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <ZoomIn className="w-3.5 h-3.5" /> Full Zoom
                </button>
              )}
            </div>

            <div
              onClick={() => editedReceipt.imageUrl && setImageModalOpen(true)}
              className="relative aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 cursor-pointer group flex items-center justify-center"
            >
              {editedReceipt.imageUrl ? (
                <>
                  <img
                    src={editedReceipt.imageUrl}
                    alt="Scanned Receipt"
                    className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                    <ZoomIn className="w-4 h-4" /> Click to enlarge
                  </div>
                </>
              ) : (
                <div className="text-center p-6 text-slate-400 space-y-2">
                  <FileText className="w-10 h-10 mx-auto" />
                  <p className="text-xs font-medium">No original receipt image stored</p>
                </div>
              )}
            </div>

            {editedReceipt.rawNotes && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-700 block">OCR Detected Notes / Terms:</span>
                <p className="line-clamp-3">{editedReceipt.rawNotes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Image Zoom Modal */}
      {imageModalOpen && editedReceipt.imageUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-slate-800 shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Store className="w-4 h-4 text-blue-400" /> {editedReceipt.storeName} Receipt Image
              </h3>
              <button
                onClick={() => setImageModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-black/40">
              <img
                src={editedReceipt.imageUrl}
                alt="Receipt"
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
