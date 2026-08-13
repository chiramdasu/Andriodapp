export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  hasWarranty?: boolean;
  warrantyDurationMonths?: number;
  warrantyExpirationDate?: string; // YYYY-MM-DD
  warrantyNotes?: string;
}

export interface ReceiptData {
  id: string;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  purchaseDate: string; // YYYY-MM-DD
  purchaseTime?: string;
  receiptNumber?: string;
  paymentMethod?: string;
  category: string;
  subtotal?: number;
  tax?: number;
  totalAmount: number;
  currency: string;
  overallWarrantyExpirationDate?: string; // YYYY-MM-DD
  warrantySummary?: string;
  confidenceScore?: number;
  rawNotes?: string;
  items: ReceiptItem[];
  imageUrl?: string; // base64 or URL
  createdAt: string;
}

export type WarrantyStatusType = 'active' | 'expiring_soon' | 'expired' | 'none';

export interface SampleReceipt {
  id: string;
  title: string;
  description: string;
  storeName: string;
  category: string;
  estimatedTotal: string;
  svgImage: string; // Data URL or SVG string
}
