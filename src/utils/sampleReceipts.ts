import { ReceiptData, SampleReceipt } from '../types/receipt';

// Helper to generate a crisp clean receipt image as SVG base64 Data URL
function generateReceiptSVG(
  storeName: string,
  storeAddress: string,
  date: string,
  time: string,
  receiptNo: string,
  items: { name: string; price: string }[],
  subtotal: string,
  tax: string,
  total: string,
  warrantyNotice: string
): string {
  const itemRows = items
    .map(
      (item, idx) => `
    <text x="30" y="${220 + idx * 28}" font-family="monospace" font-size="13" fill="#1e293b">${item.name.slice(0, 26)}</text>
    <text x="350" y="${220 + idx * 28}" font-family="monospace" font-size="13" fill="#0f172a" text-anchor="end">${item.price}</text>
  `
    )
    .join('');

  const itemsHeight = items.length * 28;
  const dividerY1 = 230 + itemsHeight;
  const subtotalY = dividerY1 + 25;
  const taxY = subtotalY + 22;
  const totalY = taxY + 28;
  const warrantyY = totalY + 45;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="680" viewBox="0 0 380 680" style="background:#f8fafc">
    <!-- Receipt Paper background with shadow -->
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.12"/>
    </filter>
    <rect x="15" y="15" width="350" height="650" rx="4" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" filter="url(#shadow)" />
    
    <!-- Top jagged/torn paper effect decoration -->
    <path d="M 15 15 L 35 23 L 55 15 L 75 23 L 95 15 L 115 23 L 135 15 L 155 23 L 175 15 L 195 23 L 215 15 L 235 23 L 255 15 L 275 23 L 295 15 L 315 23 L 335 15 L 365 15 L 365 665 L 15 665 Z" fill="#ffffff"/>

    <!-- Header Store -->
    <text x="190" y="55" font-family="monospace" font-size="20" font-weight="bold" fill="#0f172a" text-anchor="middle">${storeName.toUpperCase()}</text>
    <text x="190" y="75" font-family="monospace" font-size="11" fill="#64748b" text-anchor="middle">${storeAddress}</text>
    <text x="190" y="92" font-family="monospace" font-size="11" fill="#64748b" text-anchor="middle">Tel: (800) 555-0199 | Store #0412</text>

    <!-- Dashed Divider -->
    <line x1="30" y1="108" x2="350" y2="108" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,4" />

    <!-- Receipt Meta -->
    <text x="30" y="128" font-family="monospace" font-size="12" fill="#475569">DATE: ${date}</text>
    <text x="350" y="128" font-family="monospace" font-size="12" fill="#475569" text-anchor="end">TIME: ${time}</text>
    <text x="30" y="148" font-family="monospace" font-size="12" fill="#475569">RCPT #: ${receiptNo}</text>
    <text x="350" y="148" font-family="monospace" font-size="12" fill="#475569" text-anchor="end">AUTH: 884102</text>

    <!-- Dashed Divider -->
    <line x1="30" y1="165" x2="350" y2="165" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,4" />

    <!-- Items Header -->
    <text x="30" y="185" font-family="monospace" font-size="12" font-weight="bold" fill="#334155">ITEM DESCRIPTION</text>
    <text x="350" y="185" font-family="monospace" font-size="12" font-weight="bold" fill="#334155" text-anchor="end">PRICE</text>
    <line x1="30" y1="195" x2="350" y2="195" stroke="#94a3b8" stroke-width="1" />

    <!-- Items List -->
    ${itemRows}

    <!-- Divider -->
    <line x1="30" y1="${dividerY1}" x2="350" y2="${dividerY1}" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="4,4" />

    <!-- Totals -->
    <text x="210" y="${subtotalY}" font-family="monospace" font-size="12" fill="#475569">SUBTOTAL:</text>
    <text x="350" y="${subtotalY}" font-family="monospace" font-size="12" fill="#334155" text-anchor="end">${subtotal}</text>

    <text x="210" y="${taxY}" font-family="monospace" font-size="12" fill="#475569">TAX (8.875%):</text>
    <text x="350" y="${taxY}" font-family="monospace" font-size="12" fill="#334155" text-anchor="end">${tax}</text>

    <text x="210" y="${totalY}" font-family="monospace" font-size="16" font-weight="bold" fill="#0f172a">TOTAL:</text>
    <text x="350" y="${totalY}" font-family="monospace" font-size="18" font-weight="bold" fill="#2563eb" text-anchor="end">${total}</text>

    <!-- Payment -->
    <text x="30" y="${totalY}" font-family="monospace" font-size="11" fill="#64748b">PAYMENT: VISA ****4910</text>

    <!-- Warranty & Policy Block -->
    <rect x="30" y="${warrantyY}" width="320" height="75" rx="4" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1" />
    <text x="40" y="${warrantyY + 22}" font-family="monospace" font-size="12" font-weight="bold" fill="#1e40af">WARRANTY &amp; PROTECTION PLAN</text>
    <text x="40" y="${warrantyY + 42}" font-family="monospace" font-size="11" fill="#1e3a8a">${warrantyNotice.slice(0, 42)}</text>
    <text x="40" y="${warrantyY + 58}" font-family="monospace" font-size="11" fill="#1e3a8a">${warrantyNotice.slice(42)}</text>

    <!-- Barcode simulation -->
    <rect x="70" y="${warrantyY + 90}" width="240" height="40" fill="#000000" />
    <line x1="75" y1="${warrantyY + 90}" x2="75" y2="${warrantyY + 130}" stroke="#ffffff" stroke-width="3" />
    <line x1="85" y1="${warrantyY + 90}" x2="85" y2="${warrantyY + 130}" stroke="#ffffff" stroke-width="1" />
    <line x1="95" y1="${warrantyY + 90}" x2="95" y2="${warrantyY + 130}" stroke="#ffffff" stroke-width="4" />
    <line x1="110" y1="${warrantyY + 90}" x2="110" y2="${warrantyY + 130}" stroke="#ffffff" stroke-width="2" />
    <line x1="125" y1="${warrantyY + 90}" x2="125" y2="${warrantyY + 130}" stroke="#ffffff" stroke-width="5" />
    <line x1="145" y1="${warrantyY + 90}" x2="145" y2="${warrantyY + 130}" stroke="#ffffff" stroke-width="2" />
    <line x1="160" y1="${warrantyY + 90}" x2="160" y2="${warrantyY + 130}" stroke="#ffffff" stroke-width="3" />
    <line x1="180" y1="${warrantyY + 90}" x2="180" y2="${warrantyY + 130}" stroke="#ffffff" stroke-width="6" />
    <line x1="200" y1="${warrantyY + 90}" x2="200" y2="${warrantyY + 130}" stroke="#ffffff" stroke-width="2" />
    <line x1="220" y1="${warrantyY + 90}" x2="220" y2="${warrantyY + 130}" stroke="#ffffff" stroke-width="4" />
    <line x1="240" y1="${warrantyY + 90}" x2="240" y2="${warrantyY + 130}" stroke="#ffffff" stroke-width="2" />
    <line x1="260" y1="${warrantyY + 90}" x2="260" y2="${warrantyY + 130}" stroke="#ffffff" stroke-width="5" />
    <line x1="285" y1="${warrantyY + 90}" x2="285" y2="${warrantyY + 130}" stroke="#ffffff" stroke-width="2" />

    <text x="190" y="${warrantyY + 148}" font-family="monospace" font-size="10" fill="#64748b" text-anchor="middle">THANK YOU FOR SHOPPING WITH US!</text>
  </svg>`;

  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
}

export const SAMPLE_RECEIPTS: (SampleReceipt & { parsedFallback: ReceiptData })[] = [
  {
    id: 'sample-bestbuy-1',
    title: 'Best Buy Electronics',
    description: 'LG 55" OLED TV + 2-Year Geek Squad Protection Plan',
    storeName: 'Best Buy',
    category: 'Electronics',
    estimatedTotal: '$1,379.97',
    svgImage: generateReceiptSVG(
      'BEST BUY #0412',
      '865 Santana Row, San Jose CA',
      '2026-03-15',
      '14:22',
      '8842-1099-2810',
      [
        { name: 'LG 55" C3 OLED 4K TV', price: '$1,199.99' },
        { name: '2YR GEEK SQUAD PROTECT', price: '$149.99' },
        { name: '4K HDMI 2.1 CABLE 6FT', price: '$29.99' },
      ],
      '$1,379.97',
      '$122.47',
      '$1,502.44',
      'Geek Squad Protection active through 2028-03-15 (24 Months Full Coverage)'
    ),
    parsedFallback: {
      id: 'sample-bestbuy-1',
      storeName: 'Best Buy',
      storeAddress: '865 Santana Row, San Jose CA',
      storePhone: '(800) 555-0199',
      purchaseDate: '2026-03-15',
      purchaseTime: '14:22',
      receiptNumber: '8842-1099-2810',
      paymentMethod: 'Visa ending 4910',
      category: 'Electronics',
      subtotal: 1379.97,
      tax: 122.47,
      totalAmount: 1502.44,
      currency: '$',
      overallWarrantyExpirationDate: '2028-03-15',
      warrantySummary: '2-Year Geek Squad Protection Plan active through March 15, 2028.',
      confidenceScore: 98,
      rawNotes: 'Includes full replacement coverage for screen defects and power surges.',
      createdAt: new Date().toISOString(),
      items: [
        {
          id: 'item-1',
          name: 'LG 55" C3 OLED 4K TV',
          price: 1199.99,
          quantity: 1,
          category: 'Television',
          hasWarranty: true,
          warrantyDurationMonths: 24,
          warrantyExpirationDate: '2028-03-15',
          warrantyNotes: 'Covered under 2YR Geek Squad Protection Plan',
        },
        {
          id: 'item-2',
          name: '2YR GEEK SQUAD PROTECT',
          price: 149.99,
          quantity: 1,
          category: 'Service Plan',
          hasWarranty: true,
          warrantyDurationMonths: 24,
          warrantyExpirationDate: '2028-03-15',
          warrantyNotes: 'Extended Protection Service Contract',
        },
        {
          id: 'item-3',
          name: '4K HDMI 2.1 CABLE 6FT',
          price: 29.99,
          quantity: 1,
          category: 'Accessory',
          hasWarranty: false,
        },
      ],
    },
  },
  {
    id: 'sample-homedepot-1',
    title: 'Home Depot Power Tools',
    description: 'DeWalt 20V MAX Cordless Drill Kit + 3-Yr Warranty',
    storeName: 'Home Depot',
    category: 'Home Improvement',
    estimatedTotal: '$347.98',
    svgImage: generateReceiptSVG(
      'HOME DEPOT #0623',
      '1020 Blossom Hill Rd, San Jose CA',
      '2025-10-10',
      '09:45',
      '9910-3882-1002',
      [
        { name: 'DEWALT 20V MAX DRILL KIT', price: '$229.00' },
        { name: 'MILWAUKEE PACKOUT BOX', price: '$89.00' },
        { name: 'HD WORK GLOVES L', price: '$29.98' },
      ],
      '$347.98',
      '$30.88',
      '$378.86',
      'DeWalt 3-Year Limited Manufacturer Warranty Expires 2028-10-10'
    ),
    parsedFallback: {
      id: 'sample-homedepot-1',
      storeName: 'The Home Depot',
      storeAddress: '1020 Blossom Hill Rd, San Jose CA',
      storePhone: '(800) 466-3337',
      purchaseDate: '2025-10-10',
      purchaseTime: '09:45',
      receiptNumber: '9910-3882-1002',
      paymentMethod: 'Amex ending 1004',
      category: 'Home Improvement',
      subtotal: 347.98,
      tax: 30.88,
      totalAmount: 378.86,
      currency: '$',
      overallWarrantyExpirationDate: '2028-10-10',
      warrantySummary: 'DeWalt 3-Year Limited Manufacturer Warranty active until October 10, 2028.',
      confidenceScore: 96,
      rawNotes: 'Keep original receipt for tool replacement or battery exchange.',
      createdAt: new Date().toISOString(),
      items: [
        {
          id: 'item-1',
          name: 'DEWALT 20V MAX DRILL KIT',
          price: 229.0,
          quantity: 1,
          category: 'Power Tools',
          hasWarranty: true,
          warrantyDurationMonths: 36,
          warrantyExpirationDate: '2028-10-10',
          warrantyNotes: '3-Year Manufacturer Warranty on motor & batteries',
        },
        {
          id: 'item-2',
          name: 'MILWAUKEE PACKOUT BOX',
          price: 89.0,
          quantity: 1,
          category: 'Tool Storage',
          hasWarranty: true,
          warrantyDurationMonths: 12,
          warrantyExpirationDate: '2026-10-10',
          warrantyNotes: '1-Year Limited Warranty',
        },
        {
          id: 'item-3',
          name: 'HD WORK GLOVES L',
          price: 29.98,
          quantity: 1,
          category: 'Apparel',
          hasWarranty: false,
        },
      ],
    },
  },
  {
    id: 'sample-apple-1',
    title: 'Apple Store iPhone 16 Pro',
    description: 'iPhone 16 Pro 256GB + AppleCare+ Protection',
    storeName: 'Apple Store',
    category: 'Electronics',
    estimatedTotal: '$1,337.00',
    svgImage: generateReceiptSVG(
      'APPLE STORE UNION SQ',
      '300 Post St, San Francisco CA',
      '2026-02-01',
      '16:10',
      'W88921004',
      [
        { name: 'iPhone 16 Pro 256GB Natural', price: '$1,099.00' },
        { name: 'AppleCare+ Theft & Loss', price: '$199.00' },
        { name: 'USB-C 30W Power Adapter', price: '$39.00' },
      ],
      '$1,337.00',
      '$118.66',
      '$1,455.66',
      'AppleCare+ Coverage Active Until 2028-02-01 (Includes Accidental Damage)'
    ),
    parsedFallback: {
      id: 'sample-apple-1',
      storeName: 'Apple Store',
      storeAddress: '300 Post St, San Francisco CA',
      storePhone: '(415) 555-0144',
      purchaseDate: '2026-02-01',
      purchaseTime: '16:10',
      receiptNumber: 'W88921004',
      paymentMethod: 'Apple Pay',
      category: 'Electronics',
      subtotal: 1337.0,
      tax: 118.66,
      totalAmount: 1455.66,
      currency: '$',
      overallWarrantyExpirationDate: '2028-02-01',
      warrantySummary: 'AppleCare+ 2-Year Theft & Loss protection active through Feb 1, 2028.',
      confidenceScore: 99,
      rawNotes: 'Serial Number: FK3L98201X. Includes 24/7 priority technical support.',
      createdAt: new Date().toISOString(),
      items: [
        {
          id: 'item-1',
          name: 'iPhone 16 Pro 256GB Natural Titanium',
          price: 1099.0,
          quantity: 1,
          category: 'Smartphone',
          hasWarranty: true,
          warrantyDurationMonths: 24,
          warrantyExpirationDate: '2028-02-01',
          warrantyNotes: 'Covered under AppleCare+ Theft & Loss Plan',
        },
        {
          id: 'item-2',
          name: 'AppleCare+ Theft & Loss',
          price: 199.0,
          quantity: 1,
          category: 'Insurance',
          hasWarranty: true,
          warrantyDurationMonths: 24,
          warrantyExpirationDate: '2028-02-01',
          warrantyNotes: 'Comprehensive protection plan',
        },
        {
          id: 'item-3',
          name: 'USB-C 30W Power Adapter',
          price: 39.0,
          quantity: 1,
          category: 'Accessory',
          hasWarranty: true,
          warrantyDurationMonths: 12,
          warrantyExpirationDate: '2027-02-01',
          warrantyNotes: 'Standard 1-Year Apple Accessory Warranty',
        },
      ],
    },
  },
];
