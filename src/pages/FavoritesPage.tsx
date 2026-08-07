import { useMemo } from "react";
import { Link } from "react-router-dom";
import { getItem, parseComboKey, seedForCombo } from "@/lib/data";
import { effectiveStatus } from "@/lib/recommend";
import { useStore } from "@/lib/store";
import { OutfitTriptych } from "@/components/OutfitTriptych";
import { WardrobeCard } from "@/components/WardrobeCard";
import { EmptyState } from "@/components/EmptyState";

/** Two distinct areas — complete Looks and individual Pieces. Never mixed. */
export function FavoritesPage() {
  const { user } = useStore();

  const looks = useMemo(
    () =>
      user.favoriteLooks
        .map((key) => ({ key, combo: parseComboKey(key) }))
        .filter((l): l is { key: string; combo: NonNullable<ReturnType<typeof parseComboKey>> } =>
          Boolean(l.combo),
        ),
    [user.favoriteLooks],
  );

  const pieces = useMemo(
    () => user.favoritePieces.map(getItem).filter((i): i is NonNullable<typeof i> => Boolean(i)),
    [user.favoritePieces],
  );

  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="pt-8 sm:pt-12 pb-8">
        <h1 className="display text-3xl sm:text-4xl">Favorites</h1>
      </div>

      {/* Looks */}
      <section className="pb-14">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="display text-2xl">Looks</h2>
          <span className="label-caps">{looks.length}</span>
        </div>
        {looks.length === 0 ? (
          <EmptyState
            title="No favorite looks yet"
            message="Heart a complete outfit and it will live here for fast mornings."
            action={
              <Link to="/outfits" className="label-caps underline underline-offset-4">
                Browse outfits
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
            {looks.map(({ key, combo }) => {
              const seed = seedForCombo(combo);
              return (
                <Link key={key} to={`/outfits/${key}`} className="group block animate-fade-up">
                  <OutfitTriptych
                    combo={combo}
                    className="transition-transform duration-500 group-hover:scale-[1.015]"
                  />
                  <p className="mt-2.5 text-[13px] font-light">
                    {seed?.name ?? "Favorited look"}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Pieces */}
      <section className="pb-16">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="display text-2xl">Pieces</h2>
          <span className="label-caps">{pieces.length}</span>
        </div>
        {pieces.length === 0 ? (
          <EmptyState
            title="No favorite pieces yet"
            message="Favorite individual garments from the wardrobe to keep them close."
            action={
              <Link to="/wardrobe" className="label-caps underline underline-offset-4">
                Browse wardrobe
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
            {pieces.map((item) => (
              <WardrobeCard
                key={item.id}
                item={item}
                status={effectiveStatus(item, user)}
                favorite
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
