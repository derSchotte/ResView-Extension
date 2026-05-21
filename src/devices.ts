export interface Device {
  name: string;
  category: "phone" | "tablet" | "desktop";
  brand: string;
  portrait: { width: number; height: number };
  landscape?: { width: number; height: number };
  ppi?: number;
  year?: number;
  custom?: boolean;
}

export const DEVICES: Device[] = [
  // ── iPhones ──────────────────────────────────────────────────────────────
  {
    name: "iPhone SE (3rd Gen)",
    brand: "Apple",
    category: "phone",
    portrait: { width: 375, height: 667 },
    landscape: { width: 667, height: 375 },
    ppi: 326,
    year: 2022,
  },
  {
    name: "iPhone 14",
    brand: "Apple",
    category: "phone",
    portrait: { width: 390, height: 844 },
    landscape: { width: 844, height: 390 },
    ppi: 460,
    year: 2022,
  },
  {
    name: "iPhone 14 Plus",
    brand: "Apple",
    category: "phone",
    portrait: { width: 428, height: 926 },
    landscape: { width: 926, height: 428 },
    ppi: 458,
    year: 2022,
  },
  {
    name: "iPhone 14 Pro",
    brand: "Apple",
    category: "phone",
    portrait: { width: 393, height: 852 },
    landscape: { width: 852, height: 393 },
    ppi: 460,
    year: 2022,
  },
  {
    name: "iPhone 14 Pro Max",
    brand: "Apple",
    category: "phone",
    portrait: { width: 430, height: 932 },
    landscape: { width: 932, height: 430 },
    ppi: 460,
    year: 2022,
  },
  {
    name: "iPhone 15",
    brand: "Apple",
    category: "phone",
    portrait: { width: 393, height: 852 },
    landscape: { width: 852, height: 393 },
    ppi: 460,
    year: 2023,
  },
  {
    name: "iPhone 15 Pro Max",
    brand: "Apple",
    category: "phone",
    portrait: { width: 430, height: 932 },
    landscape: { width: 932, height: 430 },
    ppi: 460,
    year: 2023,
  },
  // ── Android Phones ────────────────────────────────────────────────────────
  {
    name: "Samsung Galaxy S23",
    brand: "Samsung",
    category: "phone",
    portrait: { width: 360, height: 780 },
    landscape: { width: 780, height: 360 },
    ppi: 425,
    year: 2023,
  },
  {
    name: "Samsung Galaxy S23 Ultra",
    brand: "Samsung",
    category: "phone",
    portrait: { width: 384, height: 824 },
    landscape: { width: 824, height: 384 },
    ppi: 500,
    year: 2023,
  },
  {
    name: "Samsung Galaxy S24",
    brand: "Samsung",
    category: "phone",
    portrait: { width: 360, height: 780 },
    landscape: { width: 780, height: 360 },
    ppi: 416,
    year: 2024,
  },
  {
    name: "Google Pixel 7",
    brand: "Google",
    category: "phone",
    portrait: { width: 412, height: 915 },
    landscape: { width: 915, height: 412 },
    ppi: 416,
    year: 2022,
  },
  {
    name: "Google Pixel 8 Pro",
    brand: "Google",
    category: "phone",
    portrait: { width: 448, height: 998 },
    landscape: { width: 998, height: 448 },
    ppi: 489,
    year: 2023,
  },
  {
    name: "OnePlus 12",
    brand: "OnePlus",
    category: "phone",
    portrait: { width: 412, height: 905 },
    landscape: { width: 905, height: 412 },
    ppi: 510,
    year: 2024,
  },
  // ── iPads ────────────────────────────────────────────────────────────────
  {
    name: "iPad Mini (6th Gen)",
    brand: "Apple",
    category: "tablet",
    portrait: { width: 744, height: 1133 },
    landscape: { width: 1133, height: 744 },
    ppi: 326,
    year: 2021,
  },
  {
    name: "iPad (10th Gen)",
    brand: "Apple",
    category: "tablet",
    portrait: { width: 820, height: 1180 },
    landscape: { width: 1180, height: 820 },
    ppi: 264,
    year: 2022,
  },
  {
    name: "iPad Air (5th Gen)",
    brand: "Apple",
    category: "tablet",
    portrait: { width: 820, height: 1180 },
    landscape: { width: 1180, height: 820 },
    ppi: 264,
    year: 2022,
  },
  {
    name: "iPad Pro 11\"",
    brand: "Apple",
    category: "tablet",
    portrait: { width: 834, height: 1194 },
    landscape: { width: 1194, height: 834 },
    ppi: 264,
    year: 2022,
  },
  {
    name: "iPad Pro 12.9\"",
    brand: "Apple",
    category: "tablet",
    portrait: { width: 1024, height: 1366 },
    landscape: { width: 1366, height: 1024 },
    ppi: 264,
    year: 2022,
  },
  // ── Android Tablets ───────────────────────────────────────────────────────
  {
    name: "Samsung Galaxy Tab S9",
    brand: "Samsung",
    category: "tablet",
    portrait: { width: 800, height: 1280 },
    landscape: { width: 1280, height: 800 },
    ppi: 274,
    year: 2023,
  },
  {
    name: "Samsung Galaxy Tab S9 Ultra",
    brand: "Samsung",
    category: "tablet",
    portrait: { width: 1232, height: 1973 },
    landscape: { width: 1973, height: 1232 },
    ppi: 240,
    year: 2023,
  },
  {
    name: "Google Pixel Tablet",
    brand: "Google",
    category: "tablet",
    portrait: { width: 800, height: 1280 },
    landscape: { width: 1280, height: 800 },
    ppi: 276,
    year: 2023,
  },
  // ── Desktop ───────────────────────────────────────────────────────────────
  {
    name: "Small Laptop (1280)",
    brand: "Generic",
    category: "desktop",
    portrait: { width: 1280, height: 800 },
  },
  {
    name: "Laptop (1440)",
    brand: "Generic",
    category: "desktop",
    portrait: { width: 1440, height: 900 },
  },
  {
    name: "Full HD (1920)",
    brand: "Generic",
    category: "desktop",
    portrait: { width: 1920, height: 1080 },
  },
  {
    name: "QHD (2560)",
    brand: "Generic",
    category: "desktop",
    portrait: { width: 2560, height: 1440 },
  },
  {
    name: "4K UHD (3840)",
    brand: "Generic",
    category: "desktop",
    portrait: { width: 3840, height: 2160 },
  },
];

export function getDevicesByCategory(category: Device["category"]): Device[] {
  return DEVICES.filter((d) => d.category === category);
}

export function findDevice(name: string): Device | undefined {
  return DEVICES.find((d) => d.name === name);
}
