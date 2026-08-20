// Data Menu Resmi Khas Mie Gacoan
const DEFAULT_MENU_ITEMS = [
  // --- KATEGORI MIE PEDAS ---
  {
    id: 'mie-gacoan',
    name: 'Mie Gacoan',
    category: 'mie',
    price: 11000,
    originalPrice: 13000,
    description: 'Mie pedas manis dengan taburan ayam cincang gurih, daun bawang, bawang goreng, serta 2 pcs pangsit goreng renyah.',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
    spicyAllowed: true,
    maxLevel: 8,
    isBestSeller: true,
    isAvailable: true,
    badge: 'Best Seller 🔥'
  },
  {
    id: 'mie-hompimpa',
    name: 'Mie Hompimpa',
    category: 'mie',
    price: 11000,
    originalPrice: 13000,
    description: 'Mie pedas asin gurih dengan sensasi cabai segar, ayam tabur lembut, daun bawang, dan 2 pcs pangsit goreng lezat.',
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80',
    spicyAllowed: true,
    maxLevel: 8,
    isBestSeller: true,
    isAvailable: true,
    badge: 'Favorit Asin Gurih ⭐'
  },
  {
    id: 'mie-suit',
    name: 'Mie Suit',
    category: 'mie',
    price: 10000,
    originalPrice: 12000,
    description: 'Mie original gurih tanpa cabai (Level 0), sangat cocok untuk anak-anak atau yang tidak suka pedas. Lengkap dengan 2 pangsit.',
    image: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=600&q=80',
    spicyAllowed: false,
    maxLevel: 0,
    isBestSeller: false,
    isAvailable: true,
    badge: 'Non-Pedas 👶'
  },

  // --- KATEGORI DIMSUM ---
  {
    id: 'udang-keju',
    name: 'Udang Keju (3 pcs)',
    category: 'dimsum',
    price: 10000,
    originalPrice: 12000,
    description: 'Dimsum olahan udang lembut berbalut tepung renyah dengan isian keju mozarella lumer yang meleleh di mulut.',
    image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=600&q=80',
    spicyAllowed: false,
    maxLevel: 0,
    isBestSeller: true,
    isAvailable: true,
    badge: 'Wajib Coba! 🧀'
  },
  {
    id: 'udang-rambutan',
    name: 'Udang Rambutan (3 pcs)',
    category: 'dimsum',
    price: 10000,
    originalPrice: 12000,
    description: 'Bola daging ayam & udang segar dibalut remahan kulit pangsit krispi menyerupai buah rambutan.',
    image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80',
    spicyAllowed: false,
    maxLevel: 0,
    isBestSeller: true,
    isAvailable: true,
    badge: 'Super Krispi 🍤'
  },
  {
    id: 'siomay-ayam',
    name: 'Siomay Ayam (3 pcs)',
    category: 'dimsum',
    price: 9500,
    originalPrice: 11000,
    description: 'Siomay kukus empuk dan juicy berbahan dasar daging ayam cincang pilihan dengan aroma minyak wijen khas.',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80',
    spicyAllowed: false,
    maxLevel: 0,
    isBestSeller: false,
    isAvailable: true,
    badge: 'Juicy & Lembut 🥟'
  },
  {
    id: 'pangsit-goreng',
    name: 'Pangsit Goreng Extra (5 pcs)',
    category: 'dimsum',
    price: 10500,
    originalPrice: 12500,
    description: 'Pangsit goreng renyah isi ayam gurih, cocok sebagai pelengkap dan cemilan teman makan mie.',
    image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=600&q=80',
    spicyAllowed: false,
    maxLevel: 0,
    isBestSeller: false,
    isAvailable: true,
    badge: 'Kriuk Mantap 🥢'
  },
  {
    id: 'lumpia-udang',
    name: 'Lumpia Udang (3 pcs)',
    category: 'dimsum',
    price: 10000,
    originalPrice: 12000,
    description: 'Lumpia goreng kulit tahu dengan isian daging udang gurih, disajikan dengan saus cocolan asam manis pedas.',
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=600&q=80',
    spicyAllowed: false,
    maxLevel: 0,
    isBestSeller: false,
    isAvailable: true,
    badge: 'Kulit Tahu 🥟'
  },

  // --- KATEGORI MINUMAN SEGAR ---
  {
    id: 'es-gobak-sodor',
    name: 'Es Gobak Sodor',
    category: 'minuman',
    price: 9000,
    originalPrice: 11000,
    description: 'Minuman es segar kombinasi buah tropis segar, cincau manis, jelly, dan sirup spesial pereda pedas.',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
    spicyAllowed: false,
    maxLevel: 0,
    isBestSeller: true,
    isAvailable: true,
    badge: 'Pereda Pedas 🍹'
  },
  {
    id: 'es-teklek',
    name: 'Es Teklek',
    category: 'minuman',
    price: 6500,
    originalPrice: 8000,
    description: 'Es manis segar dengan campuran aneka buah segar, selasih, dan susu kental manis menyegarkan dahaga.',
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=600&q=80',
    spicyAllowed: false,
    maxLevel: 0,
    isBestSeller: false,
    isAvailable: true,
    badge: 'Segar & Manis 🍧'
  },
  {
    id: 'es-petak-umpet',
    name: 'Es Petak Umpet',
    category: 'minuman',
    price: 9000,
    originalPrice: 11000,
    description: 'Perpaduan jeruk nipis segar, mint, nata de coco, dan sirup buah tropis yang memberikan kesegaran instan.',
    image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=600&q=80',
    spicyAllowed: false,
    maxLevel: 0,
    isBestSeller: false,
    isAvailable: true,
    badge: 'Citrus Fresh 🍋'
  },
  {
    id: 'es-sluku-bathok',
    name: 'Es Sluku Bathok',
    category: 'minuman',
    price: 6500,
    originalPrice: 8000,
    description: 'Minuman es moka susu lembut berpadu dengan aroma cokelat nikmat dan manis yang pas.',
    image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80',
    spicyAllowed: false,
    maxLevel: 0,
    isBestSeller: false,
    isAvailable: true,
    badge: 'Creamy Moka ☕'
  },
  {
    id: 'es-teh-tarik',
    name: 'Es Teh Tarik Jumbo',
    category: 'minuman',
    price: 7500,
    originalPrice: 9000,
    description: 'Teh susu pekat berbusa lembut khas racikan tradisional dengan es batu melimpah dalam gelas jumbo.',
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    spicyAllowed: false,
    maxLevel: 0,
    isBestSeller: false,
    isAvailable: true,
    badge: 'Porsi Jumbo 🥤'
  },
  {
    id: 'air-mineral',
    name: 'Air Mineral Prima 600ml',
    category: 'minuman',
    price: 4500,
    originalPrice: 5000,
    description: 'Air mineral murni dingin atau suhu normal untuk melepas dahaga.',
    image: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?auto=format&fit=crop&w=600&q=80',
    spicyAllowed: false,
    maxLevel: 0,
    isBestSeller: false,
    isAvailable: true,
    badge: 'Dingin / Biasa 💧'
  }
];

// Deskripsi Level Kepedasan
const SPICE_LEVELS = [
  { level: 0, label: 'Level 0 - Tanpa Cabai', desc: 'Aman untuk anak-anak / tidak pedas sama sekali', icon: '🌱', color: '#22c55e' },
  { level: 1, label: 'Level 1 - Pedas Santai', desc: 'Pedas tipis-tipis (~4 cabe)', icon: '🌶️', color: '#84cc16' },
  { level: 2, label: 'Level 2 - Pedas Sedang', desc: 'Mulai terasa gurih pedasnya (~8 cabe)', icon: '🌶️🌶️', color: '#eab308' },
  { level: 3, label: 'Level 3 - Pedas Nagih', desc: 'Pedas mantap bikin melek (~12 cabe)', icon: '🌶️🌶️🌶️', color: '#f97316' },
  { level: 4, label: 'Level 4 - Pedas Nampol', desc: 'Keringat mulai bercucuran (~16 cabe)', icon: '🔥🌶️', color: '#ea580c' },
  { level: 6, label: 'Level 6 - Pedas Gila', desc: 'Sensasi membakar lidah juara pedas (~25 cabe)', icon: '🔥🔥🌶️', color: '#dc2626' },
  { level: 8, label: 'Level 8 - Pedas Mampus', desc: 'Uji nyali level dewa! Sangat pedas (~35+ cabe)', icon: '🔥🔥🔥💀', color: '#991b1b' }
];

// Ekspor ke window jika di browser
if (typeof window !== 'undefined') {
  window.DEFAULT_MENU_ITEMS = DEFAULT_MENU_ITEMS;
  window.SPICE_LEVELS = SPICE_LEVELS;
}
