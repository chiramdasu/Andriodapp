import { ReceiptData, ReceiptItem } from '../types/receipt';
import {
  applyWarrantyDefaults,
  computeOverallWarrantyExpiration,
  summarizeWarranties,
} from './warranty';

/**
 * receiptParser — turns raw OCR text (from Tesseract.js, fully on-device)
 * into a structured ReceiptData using deterministic heuristics.
 *
 * No network, no API key. The output is a *draft*: the app always routes it
 * through the editable ReceiptDetails review screen before saving, because
 * OCR text from real-world photos is imperfect.
 */

export interface ParsedReceiptDraft extends Omit<ReceiptData, 'id' | 'createdAt' | 'imageUrl'> {
  /** The raw OCR text this draft was parsed from (kept for review/debugging). */
  ocrText: string;
}

const KNOWN_STORES: { pattern: RegExp; name: string; category: string }[] = [
  { pattern: /best\s*buy/i, name: 'Best Buy', category: 'Electronics' },
  { pattern: /home\s*depot/i, name: 'The Home Depot', category: 'Home Improvement' },
  { pattern: /lowe'?s/i, name: "Lowe's", category: 'Home Improvement' },
  { pattern: /apple\s*(store)?/i, name: 'Apple Store', category: 'Electronics' },
  { pattern: /walmart/i, name: 'Walmart', category: 'Retail' },
  { pattern: /target/i, name: 'Target', category: 'Retail' },
  { pattern: /costco/i, name: 'Costco', category: 'Retail' },
  { pattern: /amazon/i, name: 'Amazon', category: 'Retail' },
  { pattern: /cvs/i, name: 'CVS Pharmacy', category: 'Pharmacy' },
  { pattern: /walgreens/i, name: 'Walgreens', category: 'Pharmacy' },
  { pattern: /kroger/i, name: 'Kroger', category: 'Groceries' },
  { pattern: /starbucks/i, name: 'Starbucks', category: 'Food' },
  { pattern: /mcdonald/i, name: "McDonald's", category: 'Food' },
  { pattern: /ikea/i, name: 'IKEA', category: 'Furniture' },
  { pattern: /micro\s*center/i, name: 'Micro Center', category: 'Electronics' },
  { pattern: /staples/i, name: 'Staples', category: 'Retail' },
  { pattern: /office\s*depot/i, name: 'Office Depot', category: 'Retail' },
  { pattern: /dollar\s*(tree|general)/i, name: 'Dollar Store', category: 'Retail' },
  { pattern: /trader\s*joe/i, name: "Trader Joe's", category: 'Groceries' },
  { pattern: /whole\s*foods/i, name: 'Whole Foods', category: 'Groceries' },
  { pattern: /safeway/i, name: 'Safeway', category: 'Groceries' },
  { pattern: /publix/i, name: 'Publix', category: 'Groceries' },
];

/** Lines that mark the end of the item list / hold summary data, not items. */
const NON_ITEM_KEYWORDS = [
  'subtotal', 'sub total', 'sub-total',
  'total', 'amount due', 'balance due', 'balance',
  'tax', 'vat', 'gst', 'hst', 'pst',
  'cash', 'change', 'tender', 'tendered',
  'visa', 'mastercard', 'amex', 'discover', 'debit', 'credit',
  'apple pay', 'google pay', 'payment',
  'savings', 'you saved', 'discount total',
  'items sold', 'items purchased', 'number of items',
  'thank you', 'thanks for shopping',
  'receipt', 'transaction', 'auth', 'approval',
  'barcode', 'survey', 'returns', 'return policy',
  'store #', 'tel', 'phone', 'www.', 'http',
  'cashier', 'register', 'terminal', 'lane',
  'date', 'time',
];

function parseMoney(raw: string): number | null {
  if (!raw) return null;
  // Common OCR confusions inside amounts: O->0, l/I->1, S->$ (stripped below)
  const cleaned = raw
    .replace(/[$€£,\s]/g, '')
    .replace(/[Oo](?=\d|\.)/g, '0')
    .replace(/[lI](?=\d|\.)/g, '1');
  const m = cleaned.match(/-?\d+\.\d{2}/) || cleaned.match(/-?\d+/);
  if (!m) return null;
  const val = parseFloat(m[0]);
  return isNaN(val) ? null : val;
}

/** Find the last money-looking token on a line. */
function lastMoneyOnLine(line: string): number | null {
  const matches = line.match(/\$?\s*\d{1,3}(?:,\d{3})*\.\d{2}\b|\$?\s*\d+\.\d{2}\b/g);
  if (!matches || matches.length === 0) return null;
  return parseMoney(matches[matches.length - 1]);
}

function toISODate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1990 || year > 2100) return null;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

/** Extract the first plausible purchase date from the text. */
export function extractDate(text: string): string | null {
  const lines = text.split(/\r?\n/);
  // Prefer lines that look like a date label or sit near the top of the receipt
  const searchOrder = [...lines.slice(0, 25), ...lines.slice(25)];

  for (const line of searchOrder) {
    // YYYY-MM-DD
    let m = line.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
    if (m) {
      const iso = toISODate(+m[1], +m[2], +m[3]);
      if (iso) return iso;
    }
    // MM/DD/YYYY or MM/DD/YY (US receipts)
    m = line.match(/\b(\d{1,2})[/](\d{1,2})[/](\d{4})\b/);
    if (m) {
      const iso = toISODate(+m[3], +m[1], +m[2]);
      if (iso) return iso;
    }
    m = line.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2})\b/);
    if (m) {
      const iso = toISODate(2000 + +m[3], +m[1], +m[2]);
      if (iso) return iso;
    }
    // Mon DD, YYYY  /  DD Mon YYYY
    m = line.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d{2})\b/i);
    if (m) {
      const iso = toISODate(+m[3], MONTH_NAMES[m[1].toLowerCase()], +m[2]);
      if (iso) return iso;
    }
    m = line.match(/\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(20\d{2})\b/i);
    if (m) {
      const iso = toISODate(+m[3], MONTH_NAMES[m[2].toLowerCase()], +m[1]);
      if (iso) return iso;
    }
  }
  return null;
}

function extractTime(text: string): string | undefined {
  const m = text.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?\b/);
  if (!m) return undefined;
  let hh = parseInt(m[1], 10);
  const mm = m[2];
  const ampm = m[3]?.toLowerCase();
  if (ampm === 'pm' && hh < 12) hh += 12;
  if (ampm === 'am' && hh === 12) hh = 0;
  if (hh > 23) return undefined;
  return `${String(hh).padStart(2, '0')}:${mm}`;
}

function extractTotalByLabel(lines: string[], labelPatterns: RegExp[]): number | null {
  let found: number | null = null;
  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const pattern of labelPatterns) {
      if (pattern.test(lower)) {
        const val = lastMoneyOnLine(line);
        if (val !== null) found = val; // keep the last matching line
      }
    }
  }
  return found;
}

/** Detect an explicit warranty duration (months) mentioned near an item or overall. */
export function extractWarrantyMonths(text: string): number | null {
  const patterns = [
    /(\d+)\s*[- ]?\s*(?:year|yr)s?\s+(?:extended\s+)?(?:warranty|protection|plan|coverage|applecare)/i,
    /(\d+)\s*[- ]?\s*(?:month|mo)s?\s+(?:extended\s+)?(?:warranty|protection|plan|coverage)/i,
    // "2YR GEEK SQUAD PROTECT", "3 YEAR PROTECTION", "24MO CARE PLAN"
    /(\d+)\s*[- ]?\s*(yr|year|yrs|years)\b[^.\n]{0,30}?(?:protect|plan|warranty|care)/i,
    /(\d+)\s*[- ]?\s*(mo|month|months)\b[^.\n]{0,30}?(?:protect|plan|warranty|care)/i,
    /(?:warranty|protection plan|applecare|geek squad|coverage)[^.\n]{0,40}?(\d+)\s*[- ]?\s*(year|yr|month|mo)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n) && n > 0) {
        const unit = (m[2] || 'year').toLowerCase();
        return unit.startsWith('mo') ? n : n * 12;
      }
    }
  }
  return null;
}

/** Explicit warranty expiration date, e.g. "coverage through 2028-03-15" / "expires 03/15/2028". */
function extractWarrantyExpiration(text: string): string | null {
  const warrantyLines = text
    .split(/\r?\n/)
    .filter((l) => /warrant|coverage|protection|applecare|expires|through|until/i.test(l))
    .join('\n');
  if (!warrantyLines.trim()) return null;
  return extractDate(warrantyLines);
}

function isItemCandidate(line: string): boolean {
  const lower = line.toLowerCase().trim();
  if (lower.length < 3) return false;
  if (!/[a-z]{2,}/i.test(line)) return false; // needs some letters for a name
  if (NON_ITEM_KEYWORDS.some((k) => lower.startsWith(k) || lower === k)) return false;
  if (/^(sub)?total\b/.test(lower)) return false;
  if (/\b(tax|total|change due)\b.*\d/.test(lower) && !/[a-z]{4,}/.test(lower.split(/\d/)[0])) return false;
  return true;
}

function parseItems(lines: string[], fullText: string): ReceiptItem[] {
  const items: ReceiptItem[] = [];

  // Items live between the header block and the totals block. Find the
  // totals block start (first subtotal/total line) to bound the search.
  let endIdx = lines.length;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(sub\s*total|subtotal|total)\b/i.test(lines[i])) {
      endIdx = i;
      break;
    }
  }

  for (let i = 0; i < endIdx; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!isItemCandidate(line)) continue;

    const price = lastMoneyOnLine(line);
    if (price === null || price <= 0) continue;

    // Everything before the trailing price is the name / quantity area
    const priceMatch = line.match(/^(.*?)\s*\$?\s*\d{1,3}(?:,\d{3})*\.\d{2}\b\s*[A-Z]?\s*$/);
    let namePart = priceMatch ? priceMatch[1].trim() : line;
    if (!namePart || namePart.length < 2) continue;
    // A line that is ONLY a price or a bare SKU is not an item
    if (!/[a-z]{2,}/i.test(namePart)) continue;

    let quantity = 1;

    // "2 x ITEM NAME" or "2 @ ITEM"
    let qm = namePart.match(/^(\d+)\s*[x@]\s+(.+)$/i);
    if (qm) {
      quantity = parseInt(qm[1], 10) || 1;
      namePart = qm[2].trim();
    } else {
      // "ITEM NAME x2" / "ITEM NAME 2 ea"
      qm = namePart.match(/^(.+?)\s+[x@]\s*(\d+)$/i) || namePart.match(/^(.+?)\s+(\d+)\s*(?:ea|each|qty)$/i);
      if (qm) {
        namePart = qm[1].trim();
        quantity = parseInt(qm[2], 10) || 1;
      }
    }

    // Strip leading SKU-like codes ("049123 ITEM NAME" / "SKU 12345 ITEM")
    namePart = namePart.replace(/^(?:sku[:#]?\s*)?\d{4,}\s+/i, '').trim();
    if (namePart.length < 2) continue;

    // A protection-plan line item carries its own explicit warranty duration
    const itemWarrantyMonths = extractWarrantyMonths(namePart) ?? undefined;

    items.push({
      id: `item-${items.length + 1}`,
      name: namePart.replace(/\s{2,}/g, ' '),
      price,
      quantity,
      hasWarranty: itemWarrantyMonths ? true : undefined,
      warrantyDurationMonths: itemWarrantyMonths,
    });
  }

  // If the receipt-wide text states an overall warranty term (e.g. a
  // protection notice at the bottom of the receipt), attach that duration
  // to the most expensive non-plan item — that's the product the plan
  // almost always covers. A plan line item keeps its own duration.
  const overallMonths = extractWarrantyMonths(fullText);
  if (overallMonths && items.length > 0) {
    const nonPlanIdx = items
      .map((it, i) => ({ it, i }))
      .filter(({ it }) => !/plan|protection|applecare|warranty/i.test(it.name));
    if (nonPlanIdx.length > 0) {
      const target = nonPlanIdx.reduce((best, cur) => (cur.it.price > best.it.price ? cur : best));
      const existing = items[target.i].warrantyDurationMonths || 0;
      if (overallMonths > existing) {
        items[target.i] = {
          ...items[target.i],
          warrantyDurationMonths: overallMonths,
          hasWarranty: true,
          warrantyNotes: `Warranty term found on receipt (${overallMonths} months)`,
        };
      }
    }
  }

  return items;
}

/**
 * Main entry point: parse raw OCR text into a receipt draft.
 * `confidence` is Tesseract's 0–100 mean word confidence (optional).
 */
export function parseReceiptText(ocrText: string, confidence?: number): ParsedReceiptDraft {
  const text = (ocrText || '').replace(/\u00a0/g, ' ');
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  // ---- Store ----
  let storeName = 'Unknown Store';
  let category = 'Retail';
  const known = KNOWN_STORES.find((s) => s.pattern.test(text));
  if (known) {
    storeName = known.name;
    category = known.category;
  } else if (lines.length > 0) {
    // First short, mostly-alphabetic line near the top is usually the store
    const candidate = lines.slice(0, 4).find((l) => /[a-z]{3,}/i.test(l) && l.length <= 40 && !/\d{4,}/.test(l));
    if (candidate) {
      storeName = candidate
        .replace(/[^a-zA-Z0-9&'.\-\s]/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim() || storeName;
    }
  }

  // ---- Address / phone (best effort, first plausible lines) ----
  const phoneMatch = text.match(/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/);
  const storePhone = phoneMatch ? phoneMatch[0] : undefined;
  const addressLine = lines
    .slice(0, 6)
    .find((l) => /\d+\s+[A-Za-z]/.test(l) && /(st|street|ave|avenue|rd|road|row|blvd|dr|drive|hwy|ln|lane|way|ste|suite|plaza|plz|center|ctr|circle|cir|square|sq|pkwy|parkway|trl|trail)\b/i.test(l));
  const storeAddress = addressLine && addressLine !== storeName ? addressLine : undefined;

  // ---- Date / time ----
  const purchaseDate = extractDate(text) || new Date().toISOString().split('T')[0];
  const purchaseTime = extractTime(text);

  // ---- Receipt number ----
  let receiptNumber: string | undefined;
  const rcptMatch = text.match(
    /(?:receipt|rcpt|transaction|trans|order|invoice|ref(?:erence)?|ticket)\s*(?:#|no\.?|number)?\s*[:#]?\s*([A-Za-z0-9][A-Za-z0-9-]{3,})/i
  );
  if (rcptMatch) receiptNumber = rcptMatch[1];

  // ---- Payment method ----
  let paymentMethod: string | undefined;
  const payPatterns: { pattern: RegExp; label: string }[] = [
    { pattern: /apple\s*pay/i, label: 'Apple Pay' },
    { pattern: /google\s*pay/i, label: 'Google Pay' },
    { pattern: /visa/i, label: 'Visa' },
    { pattern: /master\s*card|mastercard/i, label: 'Mastercard' },
    { pattern: /amex|american\s*express/i, label: 'Amex' },
    { pattern: /discover/i, label: 'Discover' },
    { pattern: /debit/i, label: 'Debit Card' },
    { pattern: /credit/i, label: 'Credit Card' },
    { pattern: /\bcash\b/i, label: 'Cash' },
  ];
  for (const p of payPatterns) {
    if (p.pattern.test(text)) {
      const last4 = text.match(/(?:\*{2,}|ending|acct|card)\s*(\d{4})\b/i);
      paymentMethod = last4 && p.label !== 'Cash' && p.label !== 'Apple Pay' && p.label !== 'Google Pay'
        ? `${p.label} ending ${last4[1]}`
        : p.label;
      break;
    }
  }

  // ---- Items ----
  let items = parseItems(lines, text);

  // ---- Totals ----
  const subtotal = extractTotalByLabel(lines, [/sub\s*-?\s*total/]);
  const tax = extractTotalByLabel(lines, [/^(sales\s*)?tax\b/, /\btax\s*\(/, /\bvat\b/]);
  let total = extractTotalByLabel(lines, [
    /^grand\s*total/, /^total\b/, /amount\s*due/, /balance\s*due/, /^total\s*amount/,
  ]);
  if (total === null) {
    // Fall back to subtotal + tax, then to the sum of items
    if (subtotal !== null) total = subtotal + (tax || 0);
    else if (items.length > 0) total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    else total = 0;
  }
  total = Math.round(total * 100) / 100;

  // ---- Currency ----
  let currency = '$';
  if (/€/.test(text)) currency = '€';
  else if (/£/.test(text)) currency = '£';

  // ---- Warranty ----
  const explicitExpiry = extractWarrantyExpiration(text);
  items = items.map((item) => applyWarrantyDefaults(item, purchaseDate));
  if (explicitExpiry) {
    // An explicit date on the receipt beats computed defaults for the
    // receipt overall; keep per-item values as parsed.
  }
  const overallWarrantyExpirationDate = explicitExpiry || computeOverallWarrantyExpiration(items);
  const warrantySummary = summarizeWarranties(items);

  // ---- Confidence (heuristic blend of OCR confidence + fields found) ----
  let score = typeof confidence === 'number' ? confidence : 50;
  const fieldsFound = [
    storeName !== 'Unknown Store',
    !!extractDate(text),
    total > 0,
    items.length > 0,
    subtotal !== null,
  ].filter(Boolean).length;
  score = Math.round(Math.min(100, Math.max(0, score * 0.7 + fieldsFound * 6)));

  const rawNotesParts: string[] = [];
  if (score < 50) rawNotesParts.push('Low OCR confidence — please review every field carefully.');
  if (items.length === 0) rawNotesParts.push('No line items could be detected; add them manually if needed.');

  return {
    storeName,
    storeAddress,
    storePhone,
    purchaseDate,
    purchaseTime,
    receiptNumber,
    paymentMethod,
    category,
    subtotal: subtotal !== null ? Math.round(subtotal * 100) / 100 : undefined,
    tax: tax !== null ? Math.round(tax * 100) / 100 : undefined,
    totalAmount: total,
    currency,
    overallWarrantyExpirationDate: overallWarrantyExpirationDate || undefined,
    warrantySummary,
    confidenceScore: score,
    rawNotes: rawNotesParts.length ? rawNotesParts.join(' ') : undefined,
    items,
    ocrText: text,
  };
}

/**
 * Build a blank receipt for the manual-entry fallback (OCR failed or the
 * user chose to type everything in).
 */
export function createBlankReceipt(): ParsedReceiptDraft {
  return {
    storeName: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    category: 'Retail',
    totalAmount: 0,
    currency: '$',
    confidenceScore: 0,
    rawNotes: 'Entered manually — no OCR was used for this receipt.',
    items: [],
    ocrText: '',
  };
}
