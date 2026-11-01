import {requireAccount} from '../components/auth-cta.js';
import {getWishlistIds, toggleWishlist, paintWishlistButton} from '../components/wishlist-state.js';
/* DONO Explore — server-side discovery, cards, progressive category tabs. */
const apiRoot = new URL("../../../../backend/public/api", import.meta.url)
  .pathname;
const els = Object.fromEntries(
  Object.entries({
    grid: "shop-grid",
    message: "shop-message",
    search: "shop-search",
    category: "shop-category",
    age: "shop-age",
    type: "shop-type",
    tabs: "category-tabs",
    form: "discovery-form",
    reset: "shop-reset",
    prev: "shop-prev",
    next: "shop-next",
    page: "shop-page-label",
  }).map(([key, id]) => [key, document.getElementById(id)]),
);
let page = 1,
  totalPages = 1,
  requestToken = 0,
  searchTimer = 0;
const limit = 18;
const escapeHTML = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const imageSrc = (url) => {
  if (!url) return "assets/img/gift-box.jpg";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  if (url.startsWith("/uploads/"))
    return new URL("../../../../backend/public" + url, import.meta.url).href;
  if (url.startsWith("uploads/"))
    return new URL("../../../../backend/public/" + url, import.meta.url).href;
  if (url.startsWith("frontend/"))
    return new URL("../../../../" + url, import.meta.url).href;
  if (url.startsWith("backend/"))
    return new URL("../../../../" + url, import.meta.url).href;
  return url.startsWith("/") ? url : url;
};
async function getJson(path, options) {
  const res = await fetch(apiRoot + path, {
    credentials: "same-origin",
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success !== true) {
    const err = new Error(data.message || "Could not reach DONO.");
    err.status = res.status;
    throw err;
  }
  return data.data;
}
function buildParams() {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  for (const [param, el] of [
    ["search", els.search],
    ["category", els.category],
    ["age", els.age],
    ["type", els.type],
  ])
    if (el.value.trim()) params.set(param, el.value.trim());
  return params;
}
function syncTabs() {
  els.tabs.querySelectorAll("[data-category]").forEach((tab) => {
    const selected = tab.dataset.category === els.category.value;
    tab.classList.toggle("active", selected);
    if (selected) tab.setAttribute("aria-current", "true");
    else tab.removeAttribute("aria-current");
  });
}
async function categories() {
  try {
    const data = await getJson("/categories");
    const items = Array.isArray(data) ? data : data?.items || [];
    for (const cat of items) {
      const opt = new Option(cat.name, String(cat.id));
      els.category.add(opt);
      const tab = document.createElement("button");
      tab.type = "button";
      tab.dataset.category = String(cat.id);
      tab.textContent = cat.name;
      els.tabs.append(tab);
    }
    syncTabs();
  } catch (err) {
    els.message.textContent =
      "Categories are temporarily unavailable: " + err.message;
  }
}
function showProducts(items) {
  els.grid.replaceChildren();
  if (!items.length) {
    els.grid.innerHTML =
      '<div class="shop-empty"><span>✳</span><h3>No gifts found — yet!</h3><p>Try another search or clear your filters.</p><button type="button" id="reset-empty">Clear all filters ↻</button></div>';
    document.getElementById("reset-empty").addEventListener("click", reset);
    return;
  }
  for (const product of items) {
    const id = Number(product.id);
    if (!Number.isSafeInteger(id) || id < 1) continue;
    const name = escapeHTML(product.name);
    const description = escapeHTML(
      (product.description || "Your next favorite surprise.").slice(0, 185),
    );
    const category = escapeHTML(product.category?.name || "GIFT PICK");
    const price = Number(product.price);
    const priceLabel = Number.isFinite(price)
      ? price.toFixed(2) + " USD"
      : "Price unavailable";
    const img = escapeHTML(imageSrc(product.image_url));
    const card = document.createElement("article");
    card.className = "gift-card";
    card.innerHTML = `<div class="gift-card-rotator">
 <div class="gift-card-front" aria-hidden="false"><img src="${img}" loading="lazy" alt="${name}" onerror="this.src='assets/img/gift-box.jpg'"/><div class="gift-card-gradient"></div><span class="gift-card-category">${category}</span><div class="gift-card-face-label"><h3>${name}</h3><span class="gift-card-hint">TAP TO FLIP <span aria-hidden="true">↻</span></span></div><button type="button" class="gift-flip-button" aria-label="Show details for ${name}" aria-expanded="false" data-flip>↗</button></div>
 <div class="gift-card-back" aria-hidden="true"><span class="gift-back-kicker">✳ ${category}</span><button type="button" class="gift-close-button" data-flip aria-label="Back to image">↶</button><h3>${name}</h3><p>${description}</p><strong class="gift-price">${priceLabel}</strong>${product.age_min !== null && product.age_max !== null ? `<small>Suggested ages: ${Number(product.age_min)}–${Number(product.age_max)}</small>` : ""}<div class="gift-card-actions"><a href="product-details.html?id=${id}">DETAILS ↗</a><button type="button" data-cart="${id}" aria-label="Add ${name} to cart">+ BAG</button><button type="button" data-wish="${id}" data-product-name="${name}" aria-label="Add ${name} to wishlist" aria-pressed="false">♡</button></div></div></div>`;
    card.querySelector(".gift-close-button").tabIndex = -1;
    card
      .querySelectorAll(".gift-card-actions button,.gift-card-actions a")
      .forEach((el) => (el.tabIndex = -1));
    card
      .querySelectorAll("[data-flip]")
      .forEach((btn) => btn.addEventListener("click", () => flip(card)));
    card.addEventListener("click", (event) => {
      if (
        !event.target.closest("button,a") &&
        !event.target.closest(".gift-card-back")
      )
        flip(card);
    });
    els.grid.append(card);
  }
}
function flip(card) {
  const active = card.classList.toggle("is-flipped");
  card
    .querySelector(".gift-flip-button")
    .setAttribute("aria-expanded", String(active));
  card
    .querySelector(".gift-card-front")
    .setAttribute("aria-hidden", String(active));
  card
    .querySelector(".gift-card-back")
    .setAttribute("aria-hidden", String(!active));
  card.querySelector(".gift-close-button").tabIndex = active ? 0 : -1;
  card
    .querySelectorAll(".gift-card-actions button,.gift-card-actions a")
    .forEach((el) => (el.tabIndex = active ? 0 : -1));
}
async function load() {
  const myRequest = ++requestToken;
  els.message.textContent = "Searching the gift universe…";
  els.grid.setAttribute("aria-busy", "true");
  try {
    const data = await getJson("/products?" + buildParams());
    if (myRequest !== requestToken) return;
    const items = Array.isArray(data?.items) ? data.items : [];
    totalPages = Math.max(1, Number(data?.pagination?.total_pages) || 1);
    els.page.textContent = `${page} / ${totalPages}`;
    els.prev.disabled = page <= 1;
    els.next.disabled = page >= totalPages;
    showProducts(items);
    // Restore saved hearts from the backend for the current page of gifts.
    getWishlistIds().then(ids => {
      if (myRequest !== requestToken) return;
      els.grid.querySelectorAll('[data-wish]').forEach(button => {
        paintWishlistButton(button, ids.has(Number(button.dataset.wish)));
      });
    }).catch(error => console.warn('Wishlist state unavailable:', error.message));
    els.message.textContent = "";
  } catch (err) {
    if (myRequest !== requestToken) return;
    els.grid.replaceChildren();
    els.message.textContent = err.message;
    els.prev.disabled = true;
    els.next.disabled = true;
  } finally {
    if (myRequest === requestToken) els.grid.removeAttribute("aria-busy");
  }
}
function filter() {
  page = 1;
  syncTabs();
  load();
}
function reset() {
  els.search.value = "";
  els.category.value = "";
  els.age.value = "";
  els.type.value = "";
  filter();
}
els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  filter();
  document
    .getElementById("shop-products")
    .scrollIntoView({ behavior: "smooth" });
});
els.search.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(filter, 300);
});
for (const el of [els.category, els.age, els.type])
  el.addEventListener("change", filter);
els.tabs.addEventListener("click", (e) => {
  const tab = e.target.closest("[data-category]");
  if (!tab) return;
  els.category.value = tab.dataset.category;
  filter();
});
els.reset.addEventListener("click", reset);
els.prev.addEventListener("click", () => {
  if (page > 1) {
    page--;
    load();
    document.getElementById("shop-products").scrollIntoView();
  }
});
els.next.addEventListener("click", () => {
  if (page < totalPages) {
    page++;
    load();
    document.getElementById("shop-products").scrollIntoView();
  }
});
els.grid.addEventListener("click", async (e) => {
  const button = e.target.closest("[data-cart],[data-wish]");
  if (!button) return;
  const id = Number(button.dataset.cart || button.dataset.wish);
  const cart = button.hasAttribute("data-cart");
  if (!(await requireAccount(cart ? 'add a gift to your bag' : 'save a favorite'))) return;
  button.disabled = true;
  try {
    if (cart) {
      await getJson('/cart', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({product_id: id, quantity: 1}),
      });
      els.message.textContent = 'Added to your bag.';
    } else {
      const saved = await toggleWishlist(id);
      paintWishlistButton(button, saved);
      els.message.textContent = saved ? 'Saved to your wishlist.' : 'Removed from your wishlist.';
    }
    window.DonoUI?.toast(els.message.textContent, 'success');
  } catch (err) {
    els.message.textContent = err.message + (err.status === 401 ? ' Please log in first.' : '');
    window.DonoUI?.toast(els.message.textContent, 'error');
  } finally {
    button.disabled = false;
  }
});
const params = new URLSearchParams(location.search);
if (["normal", "package", "custom_box"].includes(params.get("type")))
  els.type.value = params.get("type");
await categories();
await load();
