export type UsageTag = "Gaming" | "Design" | "Coding" | "Office" | "Student" | "Creator";
export type Brand = "Apple" | "Dell" | "HP" | "Lenovo" | "ASUS" | "MSI" | "Acer" | "Custom";

export type Product = {
  slug: string;
  name: string;
  brand: Brand;
  tagline: string;
  description: string;
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

export const PRODUCTS: Product[] = [
  {
    slug: "macbook-pro-m4-14",
    name: "MacBook Pro 14″ M4",
    brand: "Apple",
    tagline: "Built for the pros who build for everyone.",
    description:
      "A staggering leap in performance for creators, developers, and students. The M4 chip delivers studio-grade power in a silent, fanless design.",
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
    name: "ROG Strix G16",
    brand: "ASUS",
    tagline: "Dominate every frame.",
    description:
      "A 16-inch gaming beast with the RTX 4070, 240Hz display, and cooling that lets you push every setting to Ultra.",
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
    name: "Dell XPS 15 OLED",
    brand: "Dell",
    tagline: "A portable workstation that disappears into your work.",
    description:
      "InfinityEdge 3.5K OLED, Intel Core Ultra, and build quality that matches the work you'll produce on it.",
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
    name: "ThinkPad X1 Carbon Gen 12",
    brand: "Lenovo",
    tagline: "The business laptop, refined.",
    description:
      "Carbon-fiber chassis, military-grade durability, and a keyboard that doesn't quit — for people who ship work.",
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
    name: "HP OMEN 16",
    brand: "HP",
    tagline: "Unleashed by air.",
    description:
      "RTX 4060, QHD 165Hz, and HP's tempest cooling — gaming performance without the aggressive RGB tax.",
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
    name: "Acer Swift Go 14",
    brand: "Acer",
    tagline: "Thin, light, AI-ready.",
    description:
      "Intel Core Ultra with built-in NPU, OLED display, under 1.3 kg — a student's workhorse that lasts all semester.",
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
    name: "MSI Stealth 14 AI",
    brand: "MSI",
    tagline: "Stealth mode: pro creator.",
    description:
      "A sub-1.7 kg gaming ultrabook with RTX 4060 and AI-accelerated creator tools. Travel light, render hard.",
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
    name: "HP Pavilion 15",
    brand: "HP",
    tagline: "Everyday performance.",
    description:
      "The no-nonsense laptop for students and everyday professionals. Reliable specs, long battery, honest price.",
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
    name: "Custom Ryzen RTX 4080 Tower",
    brand: "Custom",
    tagline: "Desktop-grade power, hand-assembled in Dar.",
    description:
      "Ubepari-built desktop with Ryzen 9, RTX 4080, 64GB DDR5, and whisper-quiet cooling. For studios that need more than a laptop.",
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
    name: "MacBook Air 13″ M3",
    brand: "Apple",
    tagline: "Unbelievably thin. Unbelievably fast.",
    description:
      "Silent, fanless M3 design with all-day battery. The laptop that made 'good enough for most people' actually true.",
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
    name: "Lenovo Legion 5",
    brand: "Lenovo",
    tagline: "Serious gaming, serious value.",
    description:
      "The gaming laptop that earns its keep. RTX 4060, 165Hz IPS, Legion Coldfront cooling. No compromises where it counts.",
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
    name: "Dell Inspiron 14",
    brand: "Dell",
    tagline: "Business on a budget.",
    description:
      "A reliable 14-inch laptop for small-business owners and office workers. Snappy storage, long warranty, TZS-friendly price.",
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

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getFeaturedProducts(): Product[] {
  return PRODUCTS.filter((p) => p.featured);
}
