import type { WardrobeItem } from "@/lib/types";

/**
 * Garment imagery. Uses the item's hero image when present; until real
 * photos exist it renders a deterministic SVG placeholder — a simple
 * garment silhouette in the item's actual colour on the warm studio
 * background the final photography will use (4:5 ratio).
 *
 * Swapping in real photos later requires no layout changes: populate
 * `images` in wardrobe.json and this component prefers them automatically.
 */

const SILHOUETTES: Record<string, string> = {
  // Short-sleeve tee
  tee: "M40 34 L52 28 Q60 25 68 28 L80 34 Q88 38 90 46 L94 62 Q94 66 90 67 L80 64 L80 108 Q80 112 76 112 L44 112 Q40 112 40 108 L40 64 L30 67 Q26 66 26 62 L30 46 Q32 38 40 34 Z",
  // Buttoned shirt with collar hint
  shirt:
    "M42 32 L54 27 L60 33 L66 27 L78 32 Q86 36 88 44 L92 60 Q92 64 88 65 L79 62 L79 110 Q79 114 75 114 L45 114 Q41 114 41 110 L41 62 L32 65 Q28 64 28 60 L32 44 Q34 36 42 32 Z",
  // Long sleeve tee
  "long-sleeve tee":
    "M42 32 L54 27 Q60 24 66 27 L78 32 Q85 36 87 43 L93 88 Q93 92 89 92 L81 90 L81 110 Q81 114 77 114 L43 114 Q39 114 39 110 L39 90 L31 92 Q27 92 27 88 L33 43 Q35 36 42 32 Z",
  // Trousers
  "pleated trousers":
    "M42 26 L78 26 Q80 26 80 28 L83 112 Q83 115 80 115 L68 115 Q65 115 65 112 L60 56 L55 112 Q55 115 52 115 L40 115 Q37 115 37 112 L40 28 Q40 26 42 26 Z",
  "wide pleated trousers":
    "M40 26 L80 26 Q82 26 82 28 L88 112 Q88 115 85 115 L66 115 Q63 115 63 112 L60 60 L57 112 Q57 115 54 115 L35 115 Q32 115 32 112 L38 28 Q38 26 40 26 Z",
  jeans:
    "M41 26 L79 26 Q81 26 81 28 L85 112 Q85 115 82 115 L67 115 Q64 115 64 112 L60 58 L56 112 Q56 115 53 115 L38 115 Q35 115 35 112 L39 28 Q39 26 41 26 Z",
  // Shorts
  shorts:
    "M40 34 L80 34 Q82 34 82 36 L86 76 Q86 79 83 79 L66 79 Q63 79 63 76 L60 56 L57 76 Q57 79 54 79 L37 79 Q34 79 34 76 L38 36 Q38 34 40 34 Z",
  // Shoes
  sneaker:
    "M26 78 Q26 68 34 66 L58 60 Q64 58 68 62 L82 74 Q94 78 94 86 L94 90 Q94 93 91 93 L29 93 Q26 93 26 90 Z",
  runner:
    "M24 80 Q24 70 33 67 L56 59 Q63 56 68 61 L80 72 Q95 76 96 85 L96 90 Q96 93 93 93 L27 93 Q24 93 24 90 Z",
  trainer:
    "M26 79 Q26 69 34 67 L57 60 Q63 58 67 62 L81 73 Q94 77 94 86 L94 90 Q94 93 91 93 L29 93 Q26 93 26 90 Z",
};

function silhouetteFor(item: WardrobeItem): string {
  if (SILHOUETTES[item.type]) return SILHOUETTES[item.type];
  if (item.category === "top") return SILHOUETTES.tee;
  if (item.category === "bottom") return SILHOUETTES["pleated trousers"];
  return SILHOUETTES.sneaker;
}

interface ItemImageProps {
  item: WardrobeItem;
  className?: string;
  /** Renders the shape a bit smaller inside the frame (grid thumbnails). */
  inset?: boolean;
}

export function ItemImage({ item, className = "", inset = false }: ItemImageProps) {
  const hero = item.images.find((img) => img.role === "hero");
  if (hero) {
    return (
      <img
        src={hero.src}
        alt={item.name}
        className={`h-full w-full object-cover ${className}`}
        loading="lazy"
      />
    );
  }
  const stroke = item.color.tone === "light" ? "rgba(23,22,20,0.14)" : "rgba(23,22,20,0.06)";
  return (
    <svg
      viewBox="0 0 120 150"
      role="img"
      aria-label={`${item.name} — placeholder image`}
      className={`h-full w-full ${className}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width="120" height="150" fill="#f3efe8" />
      <g transform={inset ? "translate(60 75) scale(0.82) translate(-60 -70)" : "translate(0 5)"}>
        <path d={silhouetteFor(item)} fill={item.color.hex} stroke={stroke} strokeWidth="1" />
      </g>
    </svg>
  );
}
