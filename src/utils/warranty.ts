import { ReceiptItem } from '../types/receipt';
import { calculateExpirationDate } from './dateUtils';

/**
 * Sensible default manufacturer warranty periods (in months), used when a
 * receipt does not state a warranty explicitly. Only durable-goods categories
 * get a default; consumables (groceries, food, pharmacy, clothing, …) get 0,
 * which means "no warranty assumed".
 *
 * Every default applied by the parser is flagged in the item's warrantyNotes
 * ("Default 12-month … — edit if your plan differs") so the user can see it
 * was assumed, not read from the receipt, and can change it in the editor.
 */
export const DEFAULT_WARRANTY_MONTHS_BY_CATEGORY: Record<string, number> = {
  Electronics: 12,
  Appliances: 12,
  Computers: 12,
  Smartphone: 12,
  Television: 12,
  Audio: 12,
  'Power Tools': 12,
  Tools: 12,
  Furniture: 12,
  Automotive: 12,
  'Home Improvement': 12,
  Sporting: 12,
  // Consumables / non-durables: no warranty assumed
  Groceries: 0,
  Food: 0,
  Pharmacy: 0,
  Clothing: 0,
  Apparel: 0,
  Books: 0,
  Accessory: 0,
  Accessories: 0,
  Service: 0,
  'Service Plan': 0, // the plan itself is the coverage, handled explicitly
  Other: 0,
  Retail: 0,
};

/** Minimum item price for a *default* (assumed) warranty to be applied. */
export const DEFAULT_WARRANTY_MIN_PRICE = 25;

const CATEGORY_KEYWORD_RULES: { category: string; keywords: string[] }[] = [
  { category: 'Television', keywords: [' tv', 'oled', 'qled', 'television', 'monitor', 'display'] },
  { category: 'Smartphone', keywords: ['iphone', 'galaxy s', 'pixel ', 'smartphone', 'cell phone', 'android phone'] },
  { category: 'Computers', keywords: ['laptop', 'macbook', 'notebook', 'chromebook', 'imac', 'desktop pc', 'tablet', 'ipad', 'ssd', 'hard drive', 'printer'] },
  { category: 'Audio', keywords: ['headphone', 'earbud', 'airpods', 'speaker', 'soundbar', 'headset'] },
  { category: 'Appliances', keywords: ['refrigerator', 'fridge', 'washer', 'dryer', 'dishwasher', 'microwave', ' oven', 'stove', 'vacuum', 'air conditioner', 'freezer', 'toaster', 'blender', 'coffee maker', 'espresso', 'air fryer'] },
  { category: 'Power Tools', keywords: ['drill', 'circular saw', ' chainsaw', 'sander', 'grinder', 'impact driver', 'power tool', 'dewalt', 'milwaukee', 'makita', 'ryobi'] },
  { category: 'Electronics', keywords: ['camera', 'console', 'playstation', 'xbox', 'nintendo', 'drone', 'smartwatch', 'apple watch', 'router', 'charger cable', 'electronics', ' tv ', 'roku', 'fire stick', 'kindle'] },
  { category: 'Furniture', keywords: [' sofa', ' couch', 'desk', 'chair', 'mattress', 'bookshelf', 'wardrobe'] },
  { category: 'Automotive', keywords: ['tire', 'car battery', 'brake', 'alternator'] },
];

/**
 * Guess an item's category from its name. Returns undefined when nothing
 * matches so callers can leave the category blank.
 */
export function inferItemCategory(name: string): string | undefined {
  const haystack = ` ${name.toLowerCase()} `;
  for (const rule of CATEGORY_KEYWORD_RULES) {
    if (rule.keywords.some((k) => haystack.includes(k))) {
      return rule.category;
    }
  }
  return undefined;
}

/** Default warranty months for a category (0 = no warranty assumed). */
export function defaultWarrantyMonths(category?: string): number {
  if (!category) return 0;
  return DEFAULT_WARRANTY_MONTHS_BY_CATEGORY[category] ?? 0;
}

/**
 * Apply warranty logic to one parsed item:
 *  - An explicitly detected duration (from "2 Year Plan" text etc.) wins.
 *  - Otherwise, durable categories at/above the price threshold get the
 *    category default, clearly labelled as assumed.
 * Computes warrantyExpirationDate from the purchase date when a duration
 * is known and no explicit expiration date was parsed.
 */
export function applyWarrantyDefaults(
  item: ReceiptItem,
  purchaseDate: string
): ReceiptItem {
  const result: ReceiptItem = { ...item };

  if (!result.category) {
    result.category = inferItemCategory(result.name);
  }

  let months = result.warrantyDurationMonths;
  let assumed = false;

  if (!months || months <= 0) {
    const def = defaultWarrantyMonths(result.category);
    if (def > 0 && result.price >= DEFAULT_WARRANTY_MIN_PRICE) {
      months = def;
      assumed = true;
    }
  }

  if (months && months > 0) {
    result.hasWarranty = true;
    result.warrantyDurationMonths = months;
    if (!result.warrantyExpirationDate && purchaseDate) {
      result.warrantyExpirationDate = calculateExpirationDate(purchaseDate, months);
    }
    if (assumed && !result.warrantyNotes) {
      result.warrantyNotes = `Default ${months}-month manufacturer warranty assumed for ${result.category} — edit if your coverage differs`;
    }
  }

  return result;
}

/**
 * Overall receipt warranty expiry = the latest item-level expiration date.
 * Returns undefined when no item carries a warranty.
 */
export function computeOverallWarrantyExpiration(items: ReceiptItem[]): string | undefined {
  let latest: string | undefined;
  for (const item of items) {
    if (item.warrantyExpirationDate) {
      if (!latest || item.warrantyExpirationDate > latest) {
        latest = item.warrantyExpirationDate;
      }
    }
  }
  return latest;
}

/** Human summary of the warranties on a receipt, for dashboards/details. */
export function summarizeWarranties(items: ReceiptItem[]): string | undefined {
  const covered = items.filter((i) => i.hasWarranty || i.warrantyExpirationDate);
  if (covered.length === 0) return undefined;
  const overall = computeOverallWarrantyExpiration(items);
  const parts = covered.map(
    (i) => `${i.name}: ${i.warrantyDurationMonths ? `${i.warrantyDurationMonths} mo` : 'covered'}`
  );
  return `Warranty coverage — ${parts.join('; ')}${overall ? `. Latest expiry ${overall}` : ''}`;
}
