/** Core domain types for outfit.nkmwei.de — frontend prototype. */

export type Category = "top" | "bottom" | "shoe" | "sock";

/** Recommendation slots — socks are inventory-only and never a fourth piece. */
export type OutfitSlot = "top" | "bottom" | "shoe";

export type Fit = "slim" | "regular" | "relaxed" | "loose" | "wide" | "oversized";

export type ItemStatus = "active" | "laundry" | "unavailable" | "retired" | "wishlist";

export type Occasion =
  | "factory"
  | "customer-visit"
  | "shopping"
  | "casual"
  | "dinner"
  | "night-out"
  | "travel";

export type Weather = "hot" | "humid" | "rainy" | "indoor_ac";

export type StylePreference = "clean" | "relaxed" | "street" | "smart";

export type WorkContext = "office" | "factory-floor" | "customer-visit";

export type ColorFamily =
  | "black"
  | "charcoal"
  | "grey"
  | "white"
  | "beige"
  | "baby-blue"
  | "greenish-blue"
  | "apricot"
  | "brown"
  | "purple"
  | "pink";

export type ImageRole = "hero" | "front" | "back" | "worn" | "detail";

export interface ItemImage {
  /** Image role — matches the asset package's `type` key. */
  type: ImageRole;
  src: string;
}

/** Optional Studio-only overlay calibration. Hero photography stays untouched. */
export interface TryOnMetadata {
  asset?: string;
  slot: OutfitSlot;
  scale?: number;
  x?: number;
  y?: number;
}

export interface ItemColor {
  name: string;
  family: ColorFamily;
  hex: string;
  /** Perceived lightness — used for dirt-risk logic on the factory floor. */
  tone: "light" | "mid" | "dark";
}

export interface PurchaseInfo {
  price?: number;
  currency?: string;
  date?: string;
  source?: string;
  notes?: string;
}

export interface WardrobeItem {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  category: Category;
  type: string;
  color: ItemColor;
  /** null when not specified (e.g. shoes in the asset package). */
  fit: Fit | null;
  material?: string;
  size?: string;
  occasions: Occasion[];
  weather: Weather[];
  /** 0–10, how much abuse the piece tolerates (dirt, movement, weather). */
  practicality: number;
  practicalityNotes?: string;
  styles: StylePreference[];
  status: ItemStatus;
  /** true = prototype-only stand-in, not a real owned item. */
  placeholder?: boolean;
  images: ItemImage[];
  purchase?: PurchaseInfo;
  /** Asset-package metadata (image provenance, not garment data). */
  asset_quality?: string;
  assetNotes?: string[];
  tryOn?: TryOnMetadata;
}

export interface OutfitCombo {
  top: string;
  bottom: string;
  shoe: string;
}

export type OutfitSeedStatus = "approved" | "suggested";

export interface OutfitSeed {
  id: string;
  name?: string;
  items: OutfitCombo;
  status: OutfitSeedStatus;
  note?: string;
}

export interface RefineState {
  weather: Weather | null;
  style: StylePreference | null;
  workContext: WorkContext | null;
}

export interface RecommendationContext {
  occasion: Occasion | null;
  refine: RefineState;
}

export interface ScoreBreakdown {
  occasion: number;
  taste: number;
  color: number;
  silhouette: number;
  practicality: number;
  /** Dynamic recency deduction already applied to `total`. */
  recencyPenalty: number;
  total: number;
}

export type RecommendationRole = "best" | "safe" | "different";

export interface ScoredOutfit {
  /** Stable combo key, e.g. "top-001_bottom-006_shoe-001". */
  key: string;
  combo: OutfitCombo;
  breakdown: ScoreBreakdown;
  reasons: string[];
  /** Curated seed outfit this combo corresponds to, if any. */
  seed?: OutfitSeed;
}

export interface RecommendationResult {
  role: RecommendationRole;
  outfit: ScoredOutfit;
}

export type RejectReason =
  | "too much grey"
  | "too formal"
  | "too wide"
  | "not practical"
  | "colors feel wrong";

export interface OutfitDecision {
  verdict: "approved" | "rejected";
  reason?: RejectReason;
  date: string;
}

export interface WearEntry {
  key: string;
  items: string[];
  date: string;
}

export interface StudioDraft {
  weight: number;
  topId: string | null;
  bottomId: string | null;
  shoeId: string | null;
  /** Stable combo keys; each can be reconstructed from canonical wardrobe ids. */
  savedLooks: string[];
}

/** Everything the user changes at runtime — persisted in localStorage only. */
export interface UserState {
  favoriteLooks: string[];
  favoritePieces: string[];
  decisions: Record<string, OutfitDecision>;
  wearLog: WearEntry[];
  statusOverrides: Record<string, ItemStatus>;
  studio: StudioDraft;
}
