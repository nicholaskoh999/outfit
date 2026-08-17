/**
 * UI regression checks against the production build, run in Chromium at
 * 390×844. Builds nothing itself — run `npm run build` first. Starts its own
 * `vite preview` on port 4199 and tears it down afterwards.
 *
 * Usage: node scripts/regression-ui.mjs
 * Env:   CHROMIUM_PATH — explicit Chromium binary (otherwise Playwright's).
 */
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = 4199;
const BASE = `http://127.0.0.1:${PORT}`;

const results = [];
const log = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
};

const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
  stdio: "ignore",
  detached: true,
});
const stopServer = () => {
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    /* already gone */
  }
};
process.on("exit", stopServer);

// Wait for the preview server.
for (let i = 0; i < 50; i++) {
  try {
    const r = await fetch(BASE + "/");
    if (r.ok) break;
  } catch {
    /* not up yet */
  }
  await new Promise((res) => setTimeout(res, 200));
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
});
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
});
const page = await context.newPage();

const overflow = () =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// --- Carousel: one fast fling advances at most one card -------------------
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.click('button:text-is("Casual")');
await page.waitForTimeout(500);

const carousel = page.locator(".snap-x.snap-mandatory");
log("recommendation carousel renders", (await carousel.count()) === 1);

const cardIndex = () =>
  carousel.evaluate((el) => {
    const center = el.scrollLeft + el.clientWidth / 2;
    const centers = [...el.children].map((c) => c.offsetLeft + c.offsetWidth / 2);
    let best = 0;
    centers.forEach((c, i) => {
      if (Math.abs(c - center) < Math.abs(centers[best] - center)) best = i;
    });
    return best;
  });

log("carousel starts on Best Pick", (await cardIndex()) === 0);

// Real touch sequences via CDP. `stepDelay` controls velocity: ~12ms reads as
// a normal swipe, ~4ms as a hard fling with strong momentum.
const box = await carousel.boundingBox();
const cdp = await context.newCDPSession(page);
const swipe = async (stepDelay) => {
  const y = Math.round(box.y + box.height / 2);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 360, y }] });
  for (let x = 360; x >= 20; x -= 68) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y }] });
    await new Promise((res) => setTimeout(res, stepDelay));
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(1100);
};

await swipe(12);
const afterNormal = await cardIndex();
log("normal swipe advances exactly one card", afterNormal === 1, `index=${afterNormal}`);

await page.evaluate(() => document.querySelector(".snap-x").scrollTo({ left: 0 }));
await page.waitForTimeout(400);
await swipe(4);
const afterFling = await cardIndex();
log("one hard fling advances at most one card", afterFling <= 1, `index=${afterFling}`);
log("Best Pick never jumps straight to Different Pick", afterFling !== 2, `index=${afterFling}`);

// Vertical scrolling still works on the page.
await page.evaluate(() => window.scrollBy(0, 200));
await page.waitForTimeout(150);
log("vertical scroll preserved", (await page.evaluate(() => window.scrollY)) > 0);
await page.evaluate(() => window.scrollTo(0, 0));

// --- VIEW LOOK affordance -------------------------------------------------
const viewLook = carousel.locator("a", { hasText: "View look" }).first();
log("VIEW LOOK affordance present", (await carousel.getByText("View look →").count()) >= 1);
await viewLook.click();
await page.waitForURL(/\/outfits\//);
log("tapping card opens outfit detail", /\/outfits\//.test(page.url()), page.url());

// --- Wear Today flow ------------------------------------------------------
await page.click('button:has-text("Wear Today")');
await page.waitForTimeout(400);
const toastText = await page.locator('[role="status"]').innerText();
log("toast says Worn today", /Worn today/i.test(toastText), JSON.stringify(toastText));
log("Undo available", /undo/i.test(toastText));
log("View wear history link present", /view wear history/i.test(toastText));
const wearLog = await page.evaluate(
  () => JSON.parse(localStorage.getItem("outfit.nkmwei.de:v1") ?? "{}").wearLog ?? [],
);
log("Wear Today creates wear history", wearLog.length === 1, `entries=${wearLog.length}`);

// --- WORN tab -------------------------------------------------------------
await page.locator('[role="status"]').getByText("View wear history →").click();
await page.waitForURL(/\/outfits\?filter=worn/);
await page.waitForTimeout(300);
const wornBody = await page.evaluate(() => document.body.innerText);
log("WORN tab route is /outfits?filter=worn", page.url().includes("/outfits?filter=worn"));
log("WORN tab shows the worn look", /Worn 1×/i.test(wornBody), "expects 'Worn 1×' meta");
log("worn look shown without approval/seed", /1 look\b/i.test(wornBody));

// --- Inventory + assets ---------------------------------------------------
await page.goto(BASE + "/wardrobe", { waitUntil: "networkidle" });
const pieces = await page.evaluate(
  () => document.body.innerText.match(/(\d+) piece/i)?.[1],
);
log("wardrobe shows 20 pieces", pieces === "20", `pieces=${pieces}`);
for (const [tab, n] of [["Tops", 9], ["Bottoms", 8], ["Socks", 1], ["Shoes", 2]]) {
  await page.click(`button:text-is("${tab}")`);
  await page.waitForTimeout(200);
  const count = await page.evaluate(() => document.body.innerText.match(/(\d+) piece/i)?.[1]);
  log(`${tab} tab count = ${n}`, count === String(n), `count=${count}`);
}
await page.click('button:text-is("Socks")');
await page.waitForTimeout(200);
const singularOk = await page.evaluate(() => {
  const t = document.body.innerText;
  return /1 piece\b/i.test(t) && !/1 pieces/i.test(t);
});
log("singular label reads '1 piece' on a one-item tab", singularOk);

await page.goto(BASE + "/wardrobe/shoe-002", { waitUntil: "networkidle" });
const filaSrc = await page.evaluate(() => document.querySelector("img")?.getAttribute("src"));
log(
  "FILA slides use their real image",
  filaSrc === "/assets/shoes/fila-sleek-tender-linear-black.webp",
  String(filaSrc),
);

await page.goto(BASE + "/wardrobe/bottom-004", { waitUntil: "networkidle" });
const himlandSrc = await page.evaluate(() => document.querySelector("img")?.getAttribute("src"));
log(
  "HIMLAND uses the real image",
  himlandSrc === "/assets/bottoms/himland-shorts-black.webp",
  String(himlandSrc),
);

// --- The two new tops -----------------------------------------------------
for (const [id, src, name] of [
  ["top-008", "/assets/tops/turbo-bt-t068-essential-oversize-t-shirt-purple.webp", "Turbo BT-T068"],
  ["top-009", "/assets/tops/stwd-short-sleeve-sweatshirt-pink.webp", "STWD Short Sleeve Sweatshirt"],
]) {
  await page.goto(BASE + `/wardrobe/${id}`, { waitUntil: "networkidle" });
  const detail = await page.evaluate(() => {
    const img = document.querySelector("img");
    return {
      src: img?.getAttribute("src"),
      fit: getComputedStyle(img).objectFit,
      body: document.body.innerText,
    };
  });
  log(`${id} detail page uses its real image`, detail.src === src, String(detail.src));
  log(`${id} image is object-contain (never cropped)`, detail.fit === "contain", detail.fit);
  log(`${id} detail page shows the garment name`, detail.body.includes(name));
}

// Both pieces are searchable and appear under Tops.
await page.goto(BASE + "/wardrobe", { waitUntil: "networkidle" });
await page.click('button:text-is("Tops")');
await page.waitForTimeout(200);
const topsBody = await page.evaluate(() => document.body.innerText);
log("Turbo tee listed under Tops", /Turbo BT-T068/i.test(topsBody));
log("STWD sweatshirt listed under Tops", /STWD Short Sleeve Sweatshirt/i.test(topsBody));

for (const [term, expected] of [
  ["turbo", 1],
  ["stwd", 1],
  ["pink", 1],
]) {
  await page.fill('input[placeholder="Search pieces…"]', term);
  await page.waitForTimeout(250);
  const n = await page.evaluate(() => document.body.innerText.match(/(\d+) piece/i)?.[1]);
  log(`search "${term}" matches ${expected} piece`, n === String(expected), `count=${n}`);
}
await page.fill('input[placeholder="Search pieces…"]', "");

// Card imagery keeps the 4:5 ratio on the grid.
const ratios = await page.evaluate(() =>
  [...document.querySelectorAll("img")].map((img) => {
    const cell = img.closest(".aspect-\\[4\\/5\\]") ?? img.parentElement;
    const r = cell.getBoundingClientRect();
    return +(r.width / r.height).toFixed(3);
  }),
);
log(
  "wardrobe card cells are all 4:5",
  ratios.length > 0 && ratios.every((r) => Math.abs(r - 0.8) < 0.02),
  `ratios=${[...new Set(ratios)].join(",")}`,
);

// NB530 uniqueness is covered by the vitest data suite (tests/regression.test.ts).

// --- Header logo navigates home from every route --------------------------
let logoOk = true;
for (const route of [
  "/outfits",
  "/wardrobe",
  "/favorites",
  "/wardrobe/bottom-004",
  "/outfits/top-001_bottom-004_shoe-001",
  "/outfits?filter=worn",
]) {
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await page.click('header a:has-text("OUTFIT")');
  await page.waitForTimeout(150);
  const path = await page.evaluate(() => location.pathname + location.search);
  if (path !== "/") {
    logoOk = false;
    log(`logo click from ${route}`, false, `landed on ${path}`);
  }
}
log("OUTFIT logo navigates home from every route", logoOk);

// --- Overflow sweep -------------------------------------------------------
let anyOverflow = false;
for (const route of ["/", "/wardrobe", "/outfits?filter=worn", "/favorites", "/wardrobe/bottom-004"]) {
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  const o = await overflow();
  if (o > 0) {
    anyOverflow = true;
    log(`overflow on ${route}`, false, `${o}px`);
  }
}
log("no horizontal page overflow on key routes", !anyOverflow);

await browser.close();
stopServer();
const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} UI regression checks passed`);
process.exit(passed === results.length ? 0 : 1);
