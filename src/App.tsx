import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { TodayPage } from "./pages/TodayPage";
import { OutfitsPage } from "./pages/OutfitsPage";
import { OutfitDetailPage } from "./pages/OutfitDetailPage";
import { WardrobePage } from "./pages/WardrobePage";
import { ItemDetailPage } from "./pages/ItemDetailPage";
import { FavoritesPage } from "./pages/FavoritesPage";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <AppShell>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/outfits" element={<OutfitsPage />} />
        <Route path="/outfits/:outfitParam" element={<OutfitDetailPage />} />
        <Route path="/wardrobe" element={<WardrobePage />} />
        <Route path="/wardrobe/:itemId" element={<ItemDetailPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="*" element={<TodayPage />} />
      </Routes>
    </AppShell>
  );
}
