import { Link } from "react-router-dom";
import type { ItemStatus, WardrobeItem } from "@/lib/types";
import { ItemImage } from "./ItemImage";

interface WardrobeCardProps {
  item: WardrobeItem;
  status: ItemStatus;
  favorite: boolean;
}

/** Minimal editorial card: image, name, colour. Nothing else. */
export function WardrobeCard({ item, status, favorite }: WardrobeCardProps) {
  const dimmed = status !== "active";
  return (
    <Link to={`/wardrobe/${item.id}`} className="group block animate-fade-up">
      <div className="relative aspect-[4/5] overflow-hidden rounded-card bg-studio">
        <ItemImage
          item={item}
          className={`transition-all duration-500 group-hover:scale-[1.02] ${dimmed ? "opacity-45" : ""}`}
        />
        {favorite && (
          <span className="absolute top-2.5 right-2.5 text-[13px]" aria-label="favorite">
            ♥
          </span>
        )}
        {dimmed && (
          <span className="absolute left-2.5 bottom-2.5 label-caps bg-paper/85 px-2 py-1 rounded-card">
            {status}
          </span>
        )}
      </div>
      <div className="mt-2.5">
        <p className="text-[13px] font-light leading-snug group-hover:underline underline-offset-4 decoration-line-strong">
          {item.name}
        </p>
        <p className="text-[12px] text-ink-faint font-light">{item.color.name}</p>
      </div>
    </Link>
  );
}
