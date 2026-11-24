export interface PublicBranch {
  id: string;
  code: string;
  name: string;
  area: string;
  address: string;
  hours: string;
  phone: string;
  coldChain: boolean;
  expressPickup: boolean;
  /** Relative coordinates inside the Dhaka 3D sector */
  dhakaPos: [number, number];
  services: string[];
}

export type ThumbnailType =
  | "blister-box"
  | "capsule-strip"
  | "vitamin-bottle"
  | "sachet-pack"
  | "allergy-pack"
  | "effervescent-tube"
  | "insulin-pen"
  | "antibiotic-box"
  | "cardio-box";

export interface PublicProduct {
  id: string;
  sku: string;
  name: string;
  genericName: string;
  brand: string;
  category:
    | "Pain & Fever"
    | "Vitamins & Care"
    | "Digestive"
    | "Cold Chain Rx"
    | "Antibiotic Rx"
    | "Cardio & Endocrine Rx";
  strength: string;
  packLabel: string;
  price: number;
  compareAtPrice?: number;
  rating: number;
  reviewCount: number;
  thumbnailType: ThumbnailType;
  purchasableOnline: boolean;
  maxOrderQty: number;
  availabilityLabel:
    | "Available at all Dhaka branches"
    | "Available at selected branches"
    | "Contact branch pharmacist";
  summary: string;
}

export const DHAKA_BRANCHES: PublicBranch[] = [
  {
    id: "uttara",
    code: "DHK-01",
    name: "Uttara Sector 7 Branch",
    area: "Uttara",
    address: "House 18, Lake Drive Road, Sector 7, Uttara",
    hours: "08:00 AM to 11:00 PM",
    phone: "+880 1711 100201",
    coldChain: true,
    expressPickup: true,
    dhakaPos: [-0.2, -2.55],
    services: ["24/7 Cold Chain", "OTC Express Pickup", "Pharmacist Consult"],
  },
  {
    id: "mirpur",
    code: "DHK-02",
    name: "Mirpur 10 Plaza Branch",
    area: "Mirpur",
    address: "Plot 12, Begum Rokeya Sarani, Mirpur 10",
    hours: "08:00 AM to 11:00 PM",
    phone: "+880 1711 100202",
    coldChain: true,
    expressPickup: true,
    dhakaPos: [-2.15, -1.45],
    services: ["OTC Express Pickup", "BP & Glucose Check", "Cold Chain"],
  },
  {
    id: "bashundhara",
    code: "DHK-03",
    name: "Bashundhara Gate Branch",
    area: "Bashundhara",
    address: "Block C, Main Road, Bashundhara R/A",
    hours: "08:00 AM to 11:30 PM",
    phone: "+880 1711 100203",
    coldChain: true,
    expressPickup: true,
    dhakaPos: [2.05, -1.65],
    services: ["Biologics Chiller", "OTC Express Pickup", "Home Dispatch"],
  },
  {
    id: "gulshan",
    code: "DHK-04",
    name: "Gulshan 2 Flagship Branch",
    area: "Gulshan",
    address: "14 Gulshan Avenue, Circle 2, Dhaka",
    hours: "08:00 AM to 11:30 PM",
    phone: "+880 1711 100204",
    coldChain: true,
    expressPickup: true,
    dhakaPos: [2.25, 0.35],
    services: ["Flagship Care Desk", "Cold Chain Vault", "Wholesale Desk"],
  },
  {
    id: "banani",
    code: "DHK-05",
    name: "Banani Road 11 Branch",
    area: "Banani",
    address: "House 44, Road 11, Block F, Banani",
    hours: "08:00 AM to 11:00 PM",
    phone: "+880 1711 100205",
    coldChain: true,
    expressPickup: true,
    dhakaPos: [0.55, -0.95],
    services: ["OTC Express Pickup", "Pharmacist Consult", "Cold Chain"],
  },
  {
    id: "mohammadpur",
    code: "DHK-06",
    name: "Mohammadpur Town Hall Branch",
    area: "Mohammadpur",
    address: "Asad Avenue, Near Town Hall, Mohammadpur",
    hours: "08:00 AM to 10:30 PM",
    phone: "+880 1711 100206",
    coldChain: true,
    expressPickup: true,
    dhakaPos: [-2.35, 0.55],
    services: ["OTC Express Pickup", "Family Care Counter", "Cold Chain"],
  },
  {
    id: "dhanmondi",
    code: "DHK-07",
    name: "Dhanmondi Road 27 Branch",
    area: "Dhanmondi",
    address: "House 21, Road 27, Dhanmondi R/A",
    hours: "08:00 AM to 11:00 PM",
    phone: "+880 1711 100207",
    coldChain: true,
    expressPickup: true,
    dhakaPos: [-1.15, 2.05],
    services: ["Clinical Pharmacist", "Cold Chain Vault", "OTC Express Pickup"],
  },
  {
    id: "motijheel",
    code: "DHK-08",
    name: "Motijheel Commercial Branch",
    area: "Motijheel",
    address: "Dilkusha Commercial Area, Motijheel",
    hours: "08:30 AM to 10:00 PM",
    phone: "+880 1711 100208",
    coldChain: true,
    expressPickup: true,
    dhakaPos: [1.45, 2.15],
    services: ["Corporate Desk", "OTC Express Pickup", "Cold Chain"],
  },
];

export const PUBLIC_PRODUCTS: PublicProduct[] = [
  {
    id: "otc-paracetamol",
    sku: "MED-PAR-500",
    name: "Paracetamol 500mg Rapid Relief",
    genericName: "Acetaminophen",
    brand: "Napa Rapid",
    category: "Pain & Fever",
    strength: "500mg",
    packLabel: "Strip of 10 tablets",
    price: 1.25,
    compareAtPrice: 1.5,
    rating: 4.9,
    reviewCount: 412,
    thumbnailType: "blister-box",
    purchasableOnline: true,
    maxOrderQty: 3,
    availabilityLabel: "Available at all Dhaka branches",
    summary: "Fast acting fever and mild pain relief. Online orders capped at 3 strips per household.",
  },
  {
    id: "otc-omeprazole",
    sku: "MED-OMZ-020",
    name: "Omeprazole 20mg Enteric Capsule",
    genericName: "Omeprazole",
    brand: "Seclo",
    category: "Digestive",
    strength: "20mg",
    packLabel: "Strip of 10 capsules",
    price: 3.15,
    compareAtPrice: 3.6,
    rating: 4.8,
    reviewCount: 289,
    thumbnailType: "capsule-strip",
    purchasableOnline: true,
    maxOrderQty: 2,
    availabilityLabel: "Available at all Dhaka branches",
    summary: "Daily acid reflux and heartburn relief. Batch verified from central storage.",
  },
  {
    id: "otc-vitd3",
    sku: "WELL-VD3-2000",
    name: "Vitamin D3 2000 IU Softgel",
    genericName: "Cholecalciferol",
    brand: "D-Rise Daily",
    category: "Vitamins & Care",
    strength: "2000 IU",
    packLabel: "Bottle of 30 softgels",
    price: 5.4,
    compareAtPrice: 6.5,
    rating: 4.9,
    reviewCount: 194,
    thumbnailType: "vitamin-bottle",
    purchasableOnline: true,
    maxOrderQty: 2,
    availabilityLabel: "Available at all Dhaka branches",
    summary: "Daily bone and immune support softgels sourced directly from licensed manufacturers.",
  },
  {
    id: "otc-ors",
    sku: "WELL-ORS-PACK",
    name: "Oral Rehydration Salts Plus",
    genericName: "WHO Formula Electrolytes",
    brand: "Orsaline-N",
    category: "Digestive",
    strength: "WHO Standard",
    packLabel: "Box of 10 sachets",
    price: 2.1,
    rating: 4.9,
    reviewCount: 521,
    thumbnailType: "sachet-pack",
    purchasableOnline: true,
    maxOrderQty: 4,
    availabilityLabel: "Available at all Dhaka branches",
    summary: "Balanced glucose and electrolyte hydration pack for rapid fluid recovery.",
  },
  {
    id: "otc-cetirizine",
    sku: "MED-CET-010",
    name: "Cetirizine 10mg Allergy Relief",
    genericName: "Cetirizine Dihydrochloride",
    brand: "Alatrol",
    category: "Vitamins & Care",
    strength: "10mg",
    packLabel: "Strip of 10 tablets",
    price: 1.85,
    rating: 4.7,
    reviewCount: 163,
    thumbnailType: "allergy-pack",
    purchasableOnline: true,
    maxOrderQty: 2,
    availabilityLabel: "Available at selected branches",
    summary: "24 hour seasonal allergy relief with non drowsy daytime profile.",
  },
  {
    id: "otc-zinc-vitc",
    sku: "WELL-ZNC-500",
    name: "Vitamin C 500mg + Zinc Chewable",
    genericName: "Ascorbic Acid + Zinc",
    brand: "Ceevit Plus",
    category: "Vitamins & Care",
    strength: "500mg / 15mg",
    packLabel: "Tube of 20 tablets",
    price: 3.6,
    compareAtPrice: 4.2,
    rating: 4.8,
    reviewCount: 247,
    thumbnailType: "effervescent-tube",
    purchasableOnline: true,
    maxOrderQty: 3,
    availabilityLabel: "Available at all Dhaka branches",
    summary: "Citrus chewable antioxidant and immune support supplement.",
  },
  {
    id: "rx-insulin",
    sku: "MED-INS-GLR",
    name: "Insulin Glargine 100IU Prefilled Pen",
    genericName: "Insulin Glargine",
    brand: "Lantus SoloStar",
    category: "Cold Chain Rx",
    strength: "100IU/mL",
    packLabel: "1 Prefilled Pen (2°C to 8°C)",
    price: 24.9,
    rating: 5.0,
    reviewCount: 118,
    thumbnailType: "insulin-pen",
    purchasableOnline: false,
    maxOrderQty: 0,
    availabilityLabel: "Available at selected branches",
    summary: "Prescription only cold chain biologic. Dispensed exclusively after pharmacist review.",
  },
  {
    id: "rx-amoxicillin",
    sku: "MED-AMX-500",
    name: "Amoxicillin 500mg Capsule",
    genericName: "Amoxicillin Trihydrate",
    brand: "Moxacil",
    category: "Antibiotic Rx",
    strength: "500mg",
    packLabel: "Strip of 10 capsules",
    price: 6.45,
    rating: 4.8,
    reviewCount: 95,
    thumbnailType: "antibiotic-box",
    purchasableOnline: false,
    maxOrderQty: 0,
    availabilityLabel: "Available at selected branches",
    summary: "Prescription antibiotic. Visit any Dhaka branch with a valid doctor prescription.",
  },
  {
    id: "rx-atorvastatin",
    sku: "MED-ATV-020",
    name: "Atorvastatin 20mg Film Tablet",
    genericName: "Atorvastatin Calcium",
    brand: "Atova",
    category: "Cardio & Endocrine Rx",
    strength: "20mg",
    packLabel: "Strip of 10 tablets",
    price: 8.25,
    rating: 4.9,
    reviewCount: 142,
    thumbnailType: "cardio-box",
    purchasableOnline: false,
    maxOrderQty: 0,
    availabilityLabel: "Contact branch pharmacist",
    summary: "Prescription cardiovascular therapy. Requires licensed pharmacist verification.",
  },
];
