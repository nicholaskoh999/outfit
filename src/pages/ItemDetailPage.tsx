import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getItem, comboKey } from "@/lib/data";
import { combosContaining, effectiveStatus } from "@/lib/recommend";
import { useStore, wearStatsForItem } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { formatScore, relativeDate } from "@/lib/format";
import { occasionLabel } from "@/lib/context";
import { ItemImage } from "@/components/ItemImage";
import { OutfitTriptych } from "@/components/OutfitTriptych";
import { EmptyState } from "@/components/EmptyState";
import type { ItemStatus } from "@/lib/types";

const STATUS_OPTIONS: ItemStatus[] = ["active", "laundry", "unavailable", "retired"];

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6 py-2.5 border-b hairline last:border-0">
      <span className="label-caps pt-0.5">{label}</span>
      <span className="text-[13px] font-light text-right">{value}</span>
    </div>
  );
}

export function ItemDetailPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const store = useStore();
  const { user } = store;
  const { toast } = useToast();
  const [showPurchase, setShowPurchase] = useState(false);

  const item = itemId ? getItem(itemId) : undefined;

  const compatible = useMemo(
    () =>
      item
        ? combosContaining(item.id, { occasion: null, refine: { weather: null, style: null, workContext: null } }, user, 4)
        : [],
    [item, user],
  );

  if (!item) {
    return (
      <div className="mx-auto max-w-3xl px-5 sm:px-8 pt-16">
        <EmptyState
          title="Piece not found"
          message="This wardrobe item doesn't exist."
          action={
            <Link to="/wardrobe" className="label-caps underline underline-offset-4">
              Back to Wardrobe
            </Link>
          }
        />
      </div>
    );
  }

  const status = effectiveStatus(item, user);
  const favorite = user.favoritePieces.includes(item.id);
  const wear = wearStatsForItem(user, item.id);
  const approvedLooks = compatible.filter((c) => user.decisions[comboKey(c.combo)]?.verdict === "approved");

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8 animate-fade-in">
      <div className="pt-8 sm:pt-12 pb-6">
        <p className="label-caps mb-1.5">{item.brand ?? "No brand"}</p>
        <h1 className="display text-3xl sm:text-4xl leading-tight">{item.name}</h1>
      </div>

      <div className="grid sm:grid-cols-[minmax(0,440px)_1fr] gap-8 sm:gap-14 pb-16">
        {/* Image gallery: hero plus any additional supplied roles (e.g. worn) */}
        <div>
          <div className="aspect-[4/5] overflow-hidden rounded-card bg-studio">
            <ItemImage item={item} />
          </div>
          {item.images.filter((img) => img.type !== "hero").length > 0 && (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {item.images
                .filter((img) => img.type !== "hero")
                .map((img) => (
                  <figure key={img.src} className="aspect-[4/5] overflow-hidden rounded-card bg-studio">
                    <img
                      src={img.src}
                      alt={`${item.name} — ${img.type}`}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  </figure>
                ))}
            </div>
          )}
        </div>

        <div className="sm:pt-2">
          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <button
              onClick={() => {
                store.toggleFavoritePiece(item.id);
                if (!favorite) toast("Added to favorite pieces");
              }}
              className={`px-5 py-3 border uppercase tracking-[0.16em] text-[11px] rounded-card transition-all cursor-pointer ${
                favorite
                  ? "border-ink text-ink animate-heart-pop"
                  : "border-line-strong text-ink-soft hover:border-ink hover:text-ink"
              }`}
            >
              {favorite ? "♥ Favorited" : "♡ Favorite"}
            </button>
            <div className="flex items-center gap-2">
              <span className="label-caps">Status</span>
              <select
                value={status}
                onChange={(e) => store.setItemStatus(item.id, e.target.value as ItemStatus)}
                className="bg-transparent border-b hairline text-[13px] font-light py-1 outline-none cursor-pointer"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {status !== "active" && (
            <p className="text-[12px] font-light text-ink-faint -mt-5 mb-8">
              {status === "retired"
                ? "Retired — kept for history, no longer recommended."
                : "Not currently recommended while unavailable."}
            </p>
          )}

          {/* Metadata */}
          <div className="mb-8">
            <MetaRow label="Category" value={item.category === "shoe" ? "Shoes" : item.category === "top" ? "Top" : "Bottom"} />
            <MetaRow label="Type" value={item.type.replace(/_/g, " ")} />
            <MetaRow label="Color" value={item.color.name} />
            <MetaRow label="Fit" value={item.fit ?? "Not specified"} />
            {item.material && <MetaRow label="Material" value={item.material} />}
            {item.size && <MetaRow label="Size" value={item.size} />}
            <MetaRow label="Occasions" value={item.occasions.map(occasionLabel).join(", ")} />
            <MetaRow
              label="Worn"
              value={
                wear.timesWorn === 0
                  ? "Never yet"
                  : `${wear.timesWorn}× · last ${relativeDate(wear.lastWorn!)}`
              }
            />
          </div>

          {item.practicalityNotes && (
            <div className="mb-8">
              <p className="label-caps mb-2">Practicality</p>
              <p className="text-sm font-light text-ink-soft leading-relaxed">
                {item.practicalityNotes}
              </p>
            </div>
          )}

          {/* Optional purchase metadata, tucked away */}
          <div className="border-t hairline pt-4 mb-8">
            <button
              onClick={() => setShowPurchase((o) => !o)}
              className="label-caps hover:text-ink transition-colors cursor-pointer"
            >
              {showPurchase ? "Hide purchase info" : "Purchase info"}
            </button>
            {showPurchase && (
              <p className="mt-3 text-[13px] font-light text-ink-faint animate-fade-in">
                {item.purchase
                  ? [
                      item.purchase.price != null ? `${item.purchase.currency ?? ""}${item.purchase.price}` : null,
                      item.purchase.date,
                      item.purchase.source,
                      item.purchase.notes,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : "No purchase details recorded."}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Compatible outfits */}
      <section className="pb-16">
        <h2 className="display text-2xl mb-5">Works well in</h2>
        {compatible.length === 0 ? (
          <p className="text-sm font-light text-ink-faint">
            No strong combinations available right now.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {compatible.map((c) => (
              <Link key={c.key} to={`/outfits/${c.key}`} className="group block">
                <OutfitTriptych combo={c.combo} className="transition-transform duration-500 group-hover:scale-[1.015]" />
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-[12px] font-light text-ink-soft">
                    {c.seed?.name ?? (approvedLooks.includes(c) ? "Approved look" : "Candidate")}
                  </span>
                  <span className="display text-base">{formatScore(c.breakdown.total)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
