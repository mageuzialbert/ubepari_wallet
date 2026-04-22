// One-shot seed of the product catalog into Supabase.
// Run ONCE after applying `supabase/migrations/0002_products.sql`:
//   node --env-file=.env.local scripts/seed-products.mjs
// Safe to re-run — skips products with an existing slug.

import { createClient } from "@supabase/supabase-js";

const PRODUCTS = [
  {
    slug: "macbook-pro-m4-14",
    brand: "Apple",
    name: { en: "MacBook Pro 14″ M4", sw: "MacBook Pro 14″ M4" },
    tagline: {
      en: "Built for the pros who build for everyone.",
      sw: "Imejengwa kwa wataalamu wanaojenga kwa ajili ya kila mtu.",
    },
    description: {
      en: "A staggering leap in performance for creators, developers, and students. The M4 chip delivers studio-grade power in a silent, fanless design.",
      sw: "Hatua kubwa ya utendaji kwa wabunifu, watayarishaji, na wanafunzi. Chip ya M4 inatoa nguvu ya kiwango cha studio katika muundo wa kimya, usio na feni.",
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
    brand: "ASUS",
    name: { en: "ROG Strix G16", sw: "ROG Strix G16" },
    tagline: { en: "Dominate every frame.", sw: "Tawala kila fremu." },
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
    brand: "Dell",
    name: { en: "Dell XPS 15 OLED", sw: "Dell XPS 15 OLED" },
    tagline: {
      en: "A portable workstation that disappears into your work.",
      sw: "Kituo cha kazi kinachobebeka, kinachoyeyuka kwenye kazi yako.",
    },
    description: {
      en: "InfinityEdge 3.5K OLED, Intel Core Ultra, and build quality that matches the work you'll produce on it.",
      sw: "InfinityEdge 3.5K OLED, Intel Core Ultra, na ubora wa ujenzi unaolingana na kazi utakayotengeneza kwake.",
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
    brand: "Lenovo",
    name: { en: "ThinkPad X1 Carbon Gen 12", sw: "ThinkPad X1 Carbon Gen 12" },
    tagline: { en: "The business laptop, refined.", sw: "Laptop ya biashara, iliyoboreshwa." },
    description: {
      en: "Carbon-fiber chassis, military-grade durability, and a keyboard that doesn't quit — for people who ship work.",
      sw: "Kiunzi cha carbon-fiber, uimara wa kiwango cha kijeshi, na kibodi isiyochoka — kwa watu wanaowasilisha kazi.",
    },
    priceTzs: 3_900_000,
    images: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1600&q=85"],
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
    brand: "HP",
    name: { en: "HP OMEN 16", sw: "HP OMEN 16" },
    tagline: { en: "Unleashed by air.", sw: "Imeachiliwa na hewa." },
    description: {
      en: "RTX 4060, QHD 165Hz, and HP's tempest cooling — gaming performance without the aggressive RGB tax.",
      sw: "RTX 4060, QHD 165Hz, na upoaji wa HP tempest — utendaji wa gaming bila kodi kali ya RGB.",
    },
    priceTzs: 3_600_000,
    images: ["https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1600&q=85"],
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
    brand: "Acer",
    name: { en: "Acer Swift Go 14", sw: "Acer Swift Go 14" },
    tagline: { en: "Thin, light, AI-ready.", sw: "Nyembamba, nyepesi, tayari kwa AI." },
    description: {
      en: "Intel Core Ultra with built-in NPU, OLED display, under 1.3 kg — a student's workhorse that lasts all semester.",
      sw: "Intel Core Ultra yenye NPU iliyojengwa ndani, skrini ya OLED, chini ya kilo 1.3 — kifaa cha mwanafunzi kinachodumu muhula mzima.",
    },
    priceTzs: 2_400_000,
    images: ["https://images.unsplash.com/photo-1484788984921-03950022c9ef?w=1600&q=85"],
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
    brand: "MSI",
    name: { en: "MSI Stealth 14 AI", sw: "MSI Stealth 14 AI" },
    tagline: { en: "Stealth mode: pro creator.", sw: "Hali ya Stealth: mbunifu wa kitaalamu." },
    description: {
      en: "A sub-1.7 kg gaming ultrabook with RTX 4060 and AI-accelerated creator tools. Travel light, render hard.",
      sw: "Ultrabook ya gaming chini ya kilo 1.7 yenye RTX 4060 na zana za ubunifu zilizoendeshwa na AI. Safiri nyepesi, render kwa nguvu.",
    },
    priceTzs: 4_500_000,
    images: ["https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=1600&q=85"],
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
    brand: "HP",
    name: { en: "HP Pavilion 15", sw: "HP Pavilion 15" },
    tagline: { en: "Everyday performance.", sw: "Utendaji wa kila siku." },
    description: {
      en: "The no-nonsense laptop for students and everyday professionals. Reliable specs, long battery, honest price.",
      sw: "Laptop ya moja kwa moja kwa wanafunzi na wataalamu wa kila siku. Vipimo vya kuaminika, betri ndefu, bei ya haki.",
    },
    priceTzs: 1_650_000,
    images: ["https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=1600&q=85"],
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
    brand: "Custom",
    name: { en: "Custom Ryzen RTX 4080 Tower", sw: "Mnara Maalum wa Ryzen RTX 4080" },
    tagline: {
      en: "Desktop-grade power, hand-assembled in Dar.",
      sw: "Nguvu za kiwango cha desktop, zilizotengenezwa kwa mikono hapa Dar.",
    },
    description: {
      en: "Ubepari-built desktop with Ryzen 9, RTX 4080, 64GB DDR5, and whisper-quiet cooling. For studios that need more than a laptop.",
      sw: "Desktop iliyojengwa na Ubepari yenye Ryzen 9, RTX 4080, 64GB DDR5, na upoaji wa kimya sana. Kwa studio zinazohitaji zaidi ya laptop.",
    },
    priceTzs: 6_800_000,
    images: ["https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1600&q=85"],
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
    brand: "Apple",
    name: { en: "MacBook Air 13″ M3", sw: "MacBook Air 13″ M3" },
    tagline: {
      en: "Unbelievably thin. Unbelievably fast.",
      sw: "Nyembamba ya kushangaza. Kasi ya kushangaza.",
    },
    description: {
      en: "Silent, fanless M3 design with all-day battery. The laptop that made 'good enough for most people' actually true.",
      sw: "Muundo wa M3 wa utulivu, bila feni, na betri ya siku nzima. Laptop iliyofanya 'ya kutosha kwa watu wengi' kuwa kweli.",
    },
    priceTzs: 3_100_000,
    images: ["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1600&q=85"],
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
    brand: "Lenovo",
    name: { en: "Lenovo Legion 5", sw: "Lenovo Legion 5" },
    tagline: { en: "Serious gaming, serious value.", sw: "Gaming ya dhati, thamani ya dhati." },
    description: {
      en: "The gaming laptop that earns its keep. RTX 4060, 165Hz IPS, Legion Coldfront cooling. No compromises where it counts.",
      sw: "Laptop ya gaming inayostahili nafasi yake. RTX 4060, 165Hz IPS, upoaji wa Legion Coldfront. Hakuna maelewano pale panapohitajika.",
    },
    priceTzs: 3_300_000,
    images: ["https://images.unsplash.com/photo-1593642702821-c8da6771f0c6?w=1600&q=85"],
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
    brand: "Dell",
    name: { en: "Dell Inspiron 14", sw: "Dell Inspiron 14" },
    tagline: { en: "Business on a budget.", sw: "Biashara kwa bajeti." },
    description: {
      en: "A reliable 14-inch laptop for small-business owners and office workers. Snappy storage, long warranty, TZS-friendly price.",
      sw: "Laptop ya kuaminika ya inchi 14 kwa wamiliki wa biashara ndogo na wafanyakazi wa ofisi. Hifadhi ya haraka, dhamana ndefu, bei rafiki kwa mfuko wako.",
    },
    priceTzs: 1_950_000,
    images: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1600&q=85"],
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

function extFromContentType(ct) {
  if (!ct) return "jpg";
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("avif")) return "avif";
  return "jpg";
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Invoke with --env-file=.env.local.",
    );
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let created = 0;
  let skipped = 0;
  let imageFailures = 0;

  for (const p of PRODUCTS) {
    const { data: existing } = await supabase
      .from("products")
      .select("id")
      .eq("slug", p.slug)
      .maybeSingle();

    if (existing) {
      console.log(`[skip] ${p.slug}`);
      skipped++;
      continue;
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("products")
      .insert({
        slug: p.slug,
        brand: p.brand,
        name_en: p.name.en,
        name_sw: p.name.sw,
        tagline_en: p.tagline.en,
        tagline_sw: p.tagline.sw,
        description_en: p.description.en,
        description_sw: p.description.sw,
        cash_price_tzs: p.priceTzs,
        specs: p.specs,
        usage_tags: p.usageTags,
        stock: p.stock,
        featured: p.featured ?? false,
        color_accent: p.colorAccent ?? null,
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      console.error(`[err] insert ${p.slug}:`, insertErr?.message);
      continue;
    }

    const productId = inserted.id;
    console.log(`[new] ${p.slug} -> ${productId}`);
    created++;

    for (let i = 0; i < p.images.length; i++) {
      const src = p.images[i];
      try {
        const res = await fetch(src);
        if (!res.ok) {
          console.error(`  [img err] ${p.slug}[${i}] fetch ${res.status}`);
          imageFailures++;
          continue;
        }
        const ct = res.headers.get("content-type") ?? "image/jpeg";
        const ext = extFromContentType(ct);
        const buf = new Uint8Array(await res.arrayBuffer());
        const path = `${productId}/${i}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from("product-images")
          .upload(path, buf, { contentType: ct, upsert: true });

        if (upErr) {
          console.error(`  [img err] upload ${path}:`, upErr.message);
          imageFailures++;
          continue;
        }

        const { error: rowErr } = await supabase
          .from("product_images")
          .insert({ product_id: productId, path, position: i });

        if (rowErr) {
          console.error(`  [img row err] ${path}:`, rowErr.message);
          imageFailures++;
        } else {
          console.log(`  [img] ${path}`);
        }
      } catch (e) {
        console.error(`  [img err] ${p.slug}[${i}]:`, e instanceof Error ? e.message : e);
        imageFailures++;
      }
    }
  }

  console.log(
    `\nDone. created=${created} skipped=${skipped} imageFailures=${imageFailures}`,
  );
  if (imageFailures > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
