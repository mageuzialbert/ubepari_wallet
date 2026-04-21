import type { Locale } from "@/i18n/config";

export type UsageTag = "Gaming" | "Design" | "Coding" | "Office" | "Student" | "Creator";
export type Brand = "Apple" | "Dell" | "HP" | "Lenovo" | "ASUS" | "MSI" | "Acer" | "Custom";

type LocalizedString = Record<Locale, string>;

type RawProduct = {
  slug: string;
  name: LocalizedString;
  brand: Brand;
  tagline: LocalizedString;
  description: LocalizedString;
  priceTzs: number;
  images: string[];
  specs: {
    cpu: string;
    cpuGeneration: string;
    ram: string;
    storage: string;
    gpu: string;
    display: string;
    os: string;
    weight: string;
  };
  usageTags: UsageTag[];
  stock: number;
  featured?: boolean;
  colorAccent?: string;
};

export type Product = Omit<RawProduct, "name" | "tagline" | "description"> & {
  name: string;
  tagline: string;
  description: string;
};

const RAW_PRODUCTS: RawProduct[] = [
  {
    slug: "macbook-pro-m4-14",
    name: { en: "MacBook Pro 14″ M4", sw: "MacBook Pro 14″ M4" },
    brand: "Apple",
    tagline: {
      en: "Built for the pros who build for everyone.",
      sw: "Imejengwa kwa wataalamu wanaojenga kwa ajili ya kila mtu.",
    },
    description: {
      en: "A staggering leap in performance for creators, developers, and students. The M4 chip delivers studio-grade power in a silent, fanless design.",
      sw: "Hatua kubwa ya utendaji kwa wabunifu, watengenezaji, na wanafunzi. Chip ya M4 inatoa nguvu za studio katika muundo wa utulivu, bila feni.",
    },
    priceTzs: 5_400_000,
    images: [
      "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=1600&q=85",
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1600&q=85",
    ],
    specs: {
      cpu: "Apple M4 Pro",
      cpuGeneration: "M4 (2024)",
      ram: "18 GB Unified",
      storage: "512 GB SSD",
      gpu: "14-core GPU",
      display: "14.2″ Liquid Retina XDR",
      os: "macOS Sequoia",
      weight: "1.55 kg",
    },
    usageTags: ["Design", "Creator", "Coding"],
    stock: 4,
    featured: true,
    colorAccent: "#d4d4d8",
  },
  {
    slug: "rog-strix-g16-rtx4070",
    name: { en: "ROG Strix G16", sw: "ROG Strix G16" },
    brand: "ASUS",
    tagline: {
      en: "Dominate every frame.",
      sw: "Tawala kila fremu.",
    },
    description: {
      en: "A 16-inch gaming beast with the RTX 4070, 240Hz display, and cooling that lets you push every setting to Ultra.",
      sw: "Kifaa kikubwa cha gaming cha inchi 16 chenye RTX 4070, skrini ya 240Hz, na upoaji unaokuruhusu kusukuma kila mpangilio hadi Ultra.",
    },
    priceTzs: 4_200_000,
    images: [
      "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=1600&q=85",
      "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=1600&q=85",
    ],
    specs: {
      cpu: "Intel Core i9-14900HX",
      cpuGeneration: "14th Gen",
      ram: "32 GB DDR5",
      storage: "1 TB NVMe SSD",
      gpu: "NVIDIA RTX 4070 8GB",
      display: "16″ QHD+ 240Hz",
      os: "Windows 11 Pro",
      weight: "2.50 kg",
    },
    usageTags: ["Gaming", "Creator"],
    stock: 3,
    featured: true,
    colorAccent: "#0ea5e9",
  },
  {
    slug: "dell-xps-15-oled",
    name: { en: "Dell XPS 15 OLED", sw: "Dell XPS 15 OLED" },
    brand: "Dell",
    tagline: {
      en: "A portable workstation that disappears into your work.",
      sw: "Kituo cha kazi kinachoweza kubebwa ambacho hupotea ndani ya kazi yako.",
    },
    description: {
      en: "InfinityEdge 3.5K OLED, Intel Core Ultra, and build quality that matches the work you'll produce on it.",
      sw: "InfinityEdge 3.5K OLED, Intel Core Ultra, na ubora wa kifaa unaolingana na kazi utakayotengeneza juu yake.",
    },
    priceTzs: 4_800_000,
    images: [
      "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=1600&q=85",
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1600&q=85",
    ],
    specs: {
      cpu: "Intel Core Ultra 9 185H",
      cpuGeneration: "Ultra 1st Gen",
      ram: "32 GB LPDDR5X",
      storage: "1 TB NVMe SSD",
      gpu: "NVIDIA RTX 4060 8GB",
      display: "15.6″ 3.5K OLED",
      os: "Windows 11 Pro",
      weight: "1.92 kg",
    },
    usageTags: ["Design", "Creator", "Coding"],
    stock: 2,
    featured: true,
    colorAccent: "#a78bfa",
  },
  {
    slug: "lenovo-thinkpad-x1-carbon",
    name: { en: "ThinkPad X1 Carbon Gen 12", sw: "ThinkPad X1 Carbon Gen 12" },
    brand: "Lenovo",
    tagline: {
      en: "The business laptop, refined.",
      sw: "Laptop ya biashara, iliyoboreshwa.",
    },
    description: {
      en: "Carbon-fiber chassis, military-grade durability, and a keyboard that doesn't quit — for people who ship work.",
      sw: "Muundo wa carbon-fiber, uimara wa kiwango cha kijeshi, na kibodi isiyoacha kufanya kazi — kwa watu wanaowasilisha kazi.",
    },
    priceTzs: 3_900_000,
    images: [
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1600&q=85",
    ],
    specs: {
      cpu: "Intel Core Ultra 7 155H",
      cpuGeneration: "Ultra 1st Gen",
      ram: "16 GB LPDDR5X",
      storage: "512 GB NVMe SSD",
      gpu: "Intel Arc Graphics",
      display: "14″ 2.8K OLED",
      os: "Windows 11 Pro",
      weight: "1.09 kg",
    },
    usageTags: ["Office", "Coding", "Student"],
    stock: 6,
    colorAccent: "#71717a",
  },
  {
    slug: "hp-omen-16-rtx4060",
    name: { en: "HP OMEN 16", sw: "HP OMEN 16" },
    brand: "HP",
    tagline: {
      en: "Unleashed by air.",
      sw: "Imeachiliwa na hewa.",
    },
    description: {
      en: "RTX 4060, QHD 165Hz, and HP's tempest cooling — gaming performance without the aggressive RGB tax.",
      sw: "RTX 4060, QHD 165Hz, na upoaji wa HP tempest — utendaji wa gaming bila kodi kali ya RGB.",
    },
    priceTzs: 3_600_000,
    images: [
      "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1600&q=85",
    ],
    specs: {
      cpu: "Intel Core i7-14700HX",
      cpuGeneration: "14th Gen",
      ram: "16 GB DDR5",
      storage: "1 TB NVMe SSD",
      gpu: "NVIDIA RTX 4060 8GB",
      display: "16.1″ QHD 165Hz",
      os: "Windows 11 Home",
      weight: "2.35 kg",
    },
    usageTags: ["Gaming", "Creator"],
    stock: 5,
    colorAccent: "#f97316",
  },
  {
    slug: "acer-swift-go-14",
    name: { en: "Acer Swift Go 14", sw: "Acer Swift Go 14" },
    brand: "Acer",
    tagline: {
      en: "Thin, light, AI-ready.",
      sw: "Nyembamba, nyepesi, tayari kwa AI.",
    },
    description: {
      en: "Intel Core Ultra with built-in NPU, OLED display, under 1.3 kg — a student's workhorse that lasts all semester.",
      sw: "Intel Core Ultra yenye NPU iliyojengwa ndani, skrini ya OLED, chini ya kilo 1.3 — mshirika wa mwanafunzi unaodumu muhula mzima.",
    },
    priceTzs: 2_400_000,
    images: [
      "https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=1600&q=85",
    ],
    specs: {
      cpu: "Intel Core Ultra 7 155U",
      cpuGeneration: "Ultra 1st Gen",
      ram: "16 GB LPDDR5",
      storage: "512 GB NVMe SSD",
      gpu: "Intel Arc Graphics",
      display: "14″ 2.8K OLED",
      os: "Windows 11 Home",
      weight: "1.25 kg",
    },
    usageTags: ["Student", "Office", "Coding"],
    stock: 8,
    colorAccent: "#10b981",
  },
  {
    slug: "msi-stealth-14-ai",
    name: { en: "MSI Stealth 14 AI", sw: "MSI Stealth 14 AI" },
    brand: "MSI",
    tagline: {
      en: "Stealth mode: pro creator.",
      sw: "Hali ya Stealth: mbunifu wa kitaalamu.",
    },
    description: {
      en: "A sub-1.7 kg gaming ultrabook with RTX 4060 and AI-accelerated creator tools. Travel light, render hard.",
      sw: "Ultrabook ya gaming chini ya kilo 1.7 yenye RTX 4060 na zana za ubunifu zilizoendeshwa na AI. Safiri nyepesi, render kwa nguvu.",
    },
    priceTzs: 4_500_000,
    images: [
      "https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=1600&q=85",
    ],
    specs: {
      cpu: "Intel Core Ultra 9 185H",
      cpuGeneration: "Ultra 1st Gen",
      ram: "32 GB LPDDR5X",
      storage: "1 TB NVMe SSD",
      gpu: "NVIDIA RTX 4060 8GB",
      display: "14″ 3K OLED 120Hz",
      os: "Windows 11 Pro",
      weight: "1.70 kg",
    },
    usageTags: ["Gaming", "Creator", "Design"],
    stock: 2,
    colorAccent: "#ef4444",
  },
  {
    slug: "hp-pavilion-15-student",
    name: { en: "HP Pavilion 15", sw: "HP Pavilion 15" },
    brand: "HP",
    tagline: {
      en: "Everyday performance.",
      sw: "Utendaji wa kila siku.",
    },
    description: {
      en: "The no-nonsense laptop for students and everyday professionals. Reliable specs, long battery, honest price.",
      sw: "Laptop ya moja kwa moja kwa wanafunzi na wataalamu wa kila siku. Vipimo vya kuaminika, betri ndefu, bei ya haki.",
    },
    priceTzs: 1_650_000,
    images: [
      "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=1600&q=85",
    ],
    specs: {
      cpu: "AMD Ryzen 5 7530U",
      cpuGeneration: "Ryzen 7000",
      ram: "8 GB DDR4",
      storage: "512 GB NVMe SSD",
      gpu: "AMD Radeon Graphics",
      display: "15.6″ FHD IPS",
      os: "Windows 11 Home",
      weight: "1.75 kg",
    },
    usageTags: ["Student", "Office"],
    stock: 12,
    colorAccent: "#3b82f6",
  },
  {
    slug: "custom-ryzen-rtx4080-tower",
    name: {
      en: "Custom Ryzen RTX 4080 Tower",
      sw: "Mnara wa Ryzen RTX 4080 wa Desturi",
    },
    brand: "Custom",
    tagline: {
      en: "Desktop-grade power, hand-assembled in Dar.",
      sw: "Nguvu za kiwango cha desktop, zilizotengenezwa kwa mikono Dar.",
    },
    description: {
      en: "Ubepari-built desktop with Ryzen 9, RTX 4080, 64GB DDR5, and whisper-quiet cooling. For studios that need more than a laptop.",
      sw: "Desktop iliyojengwa na Ubepari yenye Ryzen 9, RTX 4080, 64GB DDR5, na upoaji wa kimya sana. Kwa studio zinazohitaji zaidi ya laptop.",
    },
    priceTzs: 6_800_000,
    images: [
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1600&q=85",
    ],
    specs: {
      cpu: "AMD Ryzen 9 7950X",
      cpuGeneration: "Ryzen 7000",
      ram: "64 GB DDR5",
      storage: "2 TB NVMe SSD",
      gpu: "NVIDIA RTX 4080 16GB",
      display: "Choose your monitor",
      os: "Windows 11 Pro",
      weight: "12 kg (tower)",
    },
    usageTags: ["Gaming", "Creator", "Design"],
    stock: 1,
    colorAccent: "#8b5cf6",
  },
  {
    slug: "macbook-air-m3-13",
    name: { en: "MacBook Air 13″ M3", sw: "MacBook Air 13″ M3" },
    brand: "Apple",
    tagline: {
      en: "Unbelievably thin. Unbelievably fast.",
      sw: "Nyembamba isiyoaminika. Haraka isiyoaminika.",
    },
    description: {
      en: "Silent, fanless M3 design with all-day battery. The laptop that made 'good enough for most people' actually true.",
      sw: "Muundo wa M3 wa utulivu, bila feni, na betri ya siku nzima. Laptop iliyofanya 'ya kutosha kwa watu wengi' kuwa kweli.",
    },
    priceTzs: 3_100_000,
    images: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1600&q=85",
    ],
    specs: {
      cpu: "Apple M3",
      cpuGeneration: "M3 (2024)",
      ram: "16 GB Unified",
      storage: "512 GB SSD",
      gpu: "10-core GPU",
      display: "13.6″ Liquid Retina",
      os: "macOS Sequoia",
      weight: "1.24 kg",
    },
    usageTags: ["Student", "Office", "Coding", "Design"],
    stock: 5,
    colorAccent: "#fbbf24",
  },
  {
    slug: "lenovo-legion-5-rtx4060",
    name: { en: "Lenovo Legion 5", sw: "Lenovo Legion 5" },
    brand: "Lenovo",
    tagline: {
      en: "Serious gaming, serious value.",
      sw: "Gaming halisi, thamani halisi.",
    },
    description: {
      en: "The gaming laptop that earns its keep. RTX 4060, 165Hz IPS, Legion Coldfront cooling. No compromises where it counts.",
      sw: "Laptop ya gaming inayostahili nafasi yake. RTX 4060, 165Hz IPS, upoaji wa Legion Coldfront. Hakuna mapatanishi pale yanapohitajika.",
    },
    priceTzs: 3_300_000,
    images: [
      "https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=1600&q=85",
    ],
    specs: {
      cpu: "AMD Ryzen 7 7745HX",
      cpuGeneration: "Ryzen 7000",
      ram: "16 GB DDR5",
      storage: "512 GB NVMe SSD",
      gpu: "NVIDIA RTX 4060 8GB",
      display: "15.6″ WQHD 165Hz",
      os: "Windows 11 Home",
      weight: "2.30 kg",
    },
    usageTags: ["Gaming", "Coding"],
    stock: 4,
    colorAccent: "#22c55e",
  },
  {
    slug: "dell-inspiron-14-office",
    name: { en: "Dell Inspiron 14", sw: "Dell Inspiron 14" },
    brand: "Dell",
    tagline: {
      en: "Business on a budget.",
      sw: "Biashara kwa bajeti.",
    },
    description: {
      en: "A reliable 14-inch laptop for small-business owners and office workers. Snappy storage, long warranty, TZS-friendly price.",
      sw: "Laptop ya kuaminika ya inchi 14 kwa wamiliki wa biashara ndogo na wafanyakazi wa ofisi. Hifadhi ya haraka, dhamana ndefu, bei rafiki kwa TZS.",
    },
    priceTzs: 1_950_000,
    images: [
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1600&q=85",
    ],
    specs: {
      cpu: "Intel Core i5-1334U",
      cpuGeneration: "13th Gen",
      ram: "16 GB DDR4",
      storage: "512 GB NVMe SSD",
      gpu: "Intel Iris Xe",
      display: "14″ FHD+ IPS",
      os: "Windows 11 Pro",
      weight: "1.54 kg",
    },
    usageTags: ["Office", "Student"],
    stock: 9,
    colorAccent: "#64748b",
  },
];

export const PRODUCT_SLUGS = RAW_PRODUCTS.map((p) => p.slug);

function resolve(p: RawProduct, locale: Locale): Product {
  return {
    ...p,
    name: p.name[locale],
    tagline: p.tagline[locale],
    description: p.description[locale],
  };
}

export function getProducts(locale: Locale): Product[] {
  return RAW_PRODUCTS.map((p) => resolve(p, locale));
}

export function getProduct(slug: string, locale: Locale): Product | undefined {
  const raw = RAW_PRODUCTS.find((p) => p.slug === slug);
  return raw ? resolve(raw, locale) : undefined;
}

export function getFeaturedProducts(locale: Locale): Product[] {
  return RAW_PRODUCTS.filter((p) => p.featured).map((p) => resolve(p, locale));
}
