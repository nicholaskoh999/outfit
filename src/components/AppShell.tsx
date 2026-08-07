import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

const NAV = [
  { to: "/", label: "Today" },
  { to: "/outfits", label: "Outfits" },
  { to: "/wardrobe", label: "Wardrobe" },
  { to: "/favorites", label: "Favorites" },
];

function navClass(isActive: boolean): string {
  return [
    "uppercase tracking-[0.16em] text-[11px] transition-colors duration-300",
    isActive ? "text-ink" : "text-ink-faint hover:text-ink-soft",
  ].join(" ");
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-30 bg-paper/92 backdrop-blur border-b hairline">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 h-14 flex items-center justify-between">
          <NavLink to="/" className="flex items-baseline gap-2.5">
            <span className="display text-[22px] leading-none">OUTFIT</span>
            <span className="label-caps hidden sm:inline">nkmwei.de</span>
          </NavLink>
          <nav className="hidden sm:flex items-center gap-8">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => navClass(isActive)}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 pb-24 sm:pb-16">{children}</main>

      {/* Mobile bottom navigation */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-paper/95 backdrop-blur border-t hairline">
        <div className="grid grid-cols-4 h-[3.4rem] mb-[env(safe-area-inset-bottom)]">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `flex items-center justify-center ${navClass(isActive)}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
