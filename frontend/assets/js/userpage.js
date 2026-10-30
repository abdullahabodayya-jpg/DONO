(() => {
  'use strict';
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  /* ===== DATA (بدل data/products.php) ===== */
  const IMG_BASE = 'assets/images/dono/';   // مجلد الصور
  const PRODUCT_LIST = [
    {
      "id": 1,
      "title": "The Soft Morning Box",
      "cat": "Gift Boxes",
      "price": 32,
      "img": "ekaterina-shevchenko-ZLTlHeKbh04-unsplash.jpg",
      "desc": "A pastel box of little everyday magic: candle, sweets and a handwritten note.",
      "tag": "Most loved"
    },
    {
      "id": 2,
      "title": "A Little Bloom Moment",
      "cat": "Flowers",
      "price": 24,
      "img": "micheile-henderson-Afjk-6oFzPE-unsplash.jpg",
      "desc": "Seasonal blooms wrapped in sage paper, with a tiny gift box on the side.",
      "tag": "Favourite"
    },
    {
      "id": 3,
      "title": "Sunday Reset Hamper",
      "cat": "Self Care",
      "price": 38,
      "img": "toa-heftiba-gxLzAjHayUs-unsplash.jpg",
      "desc": "Bath salts, a soft candle and a face mask. A deep breath, in a box.",
      "tag": "Reset"
    },
    {
      "id": 4,
      "title": "The Happy Snack Edit",
      "cat": "Treats",
      "price": 18,
      "img": "olivia-bollen-3BvVFcZIL7I-unsplash.jpg",
      "desc": "Chocolate, cookies and sweet little things for instant happiness.",
      "tag": "Sweet"
    },
    {
      "id": 5,
      "title": "Cozy Evening Basket",
      "cat": "For Home",
      "price": 45,
      "img": "dhiraj-kumar-gVgG2Km7RG4-unsplash.jpg",
      "desc": "Throw, tea and a candle. Everything for a slow evening at home.",
      "tag": "Cozy"
    },
    {
      "id": 6,
      "title": "Bear Hug Surprise",
      "cat": "Personalized",
      "price": 29,
      "img": "superkitina-GIImjW5MzAA-unsplash.jpg",
      "desc": "A soft teddy with a personalised name tag and a message card.",
      "tag": "Made for them"
    },
    {
      "id": 7,
      "title": "Emerald Gift Set",
      "cat": "Gift Boxes",
      "price": 41,
      "img": "baibhav-kumar-LumWaD-gTLQ-unsplash.jpg",
      "desc": "An elegant green set, wrapped with satin ribbon and a wax seal.",
      "tag": "New"
    },
    {
      "id": 8,
      "title": "Blush Peony Bouquet",
      "cat": "Flowers",
      "price": 35,
      "img": "keytion-13WiuT2kf1A-unsplash.jpg",
      "desc": "Soft blush blooms, hand-tied and ready to make someone smile.",
      "tag": ""
    },
    {
      "id": 9,
      "title": "Spa Day In A Box",
      "cat": "Self Care",
      "price": 52,
      "img": "raelle-cameron-GvE8vd_cjGw-unsplash.jpg",
      "desc": "A full pamper set: scrub, oil, mask and a scented candle.",
      "tag": "Bestseller"
    },
    {
      "id": 10,
      "title": "Sweet Tooth Crate",
      "cat": "Treats",
      "price": 26,
      "img": "olivia-bollen-3BvVFcZIL7I-unsplash.jpg",
      "desc": "Twelve hand-picked treats for the one with a sweet tooth.",
      "tag": ""
    },
    {
      "id": 11,
      "title": "Warm Hug Throw Set",
      "cat": "For Home",
      "price": 58,
      "img": "dhiraj-kumar-gVgG2Km7RG4-unsplash.jpg",
      "desc": "A chunky throw with a mug and hot chocolate. Comfort in the cutest form.",
      "tag": ""
    },
    {
      "id": 12,
      "title": "Their Name, Your Thought",
      "cat": "Personalized",
      "price": 34,
      "img": "laura-chouette-eGBXbKtjbik-unsplash.jpg",
      "desc": "A custom engraved keepsake box with their name and your note.",
      "tag": "Custom"
    },
    {
      "id": 13,
      "title": "Sunny Day Daisies",
      "cat": "Flowers",
      "price": 19,
      "img": "keytion-13WiuT2kf1A-unsplash.jpg",
      "desc": "Bright daisies and sunflowers for the just-because days.",
      "tag": ""
    },
    {
      "id": 14,
      "title": "The Thank You Box",
      "cat": "Gift Boxes",
      "price": 22,
      "img": "grace-anne-bobadilla-_PyacZLIViw-unsplash.jpg",
      "desc": "A small but mighty box that says thank you, beautifully.",
      "tag": ""
    },
    {
      "id": 15,
      "title": "Slow Morning Kit",
      "cat": "Self Care",
      "price": 27,
      "img": "toa-heftiba-gxLzAjHayUs-unsplash.jpg",
      "desc": "Tea, hand cream and a lip balm for slow mornings.",
      "tag": ""
    },
    {
      "id": 16,
      "title": "Chocolate Lovers Tray",
      "cat": "Treats",
      "price": 31,
      "img": "olivia-bollen-3BvVFcZIL7I-unsplash.jpg",
      "desc": "A tray of premium chocolates in six different flavours.",
      "tag": "Yum"
    },
    {
      "id": 17,
      "title": "Little Home Glow",
      "cat": "For Home",
      "price": 21,
      "img": "dhiraj-kumar-gVgG2Km7RG4-unsplash.jpg",
      "desc": "Two soy candles and a matchbox. Small light, big mood.",
      "tag": ""
    },
    {
      "id": 18,
      "title": "Initials Teddy",
      "cat": "Personalized",
      "price": 44,
      "img": "rosebox-BFdSCxmqvYc-unsplash.jpg",
      "desc": "A premium plush with their embroidered initials.",
      "tag": ""
    },
    {
      "id": 19,
      "title": "Grand Celebration Box",
      "cat": "Gift Boxes",
      "price": 65,
      "img": "wedding-dreamz-XsriYQ1oowc-unsplash.jpg",
      "desc": "The big one: for birthdays, weddings and big moments.",
      "tag": "Luxe"
    },
    {
      "id": 20,
      "title": "Garden Mix Bouquet",
      "cat": "Flowers",
      "price": 42,
      "img": "micheile-henderson-Afjk-6oFzPE-unsplash.jpg",
      "desc": "A lush garden-style bouquet with eucalyptus and roses.",
      "tag": ""
    },
    {
      "id": 21,
      "title": "Calm & Cozy Hamper",
      "cat": "Self Care",
      "price": 36,
      "img": "raelle-cameron-GvE8vd_cjGw-unsplash.jpg",
      "desc": "Eye mask, herbal tea and a soft candle in one calm box.",
      "tag": ""
    },
    {
      "id": 22,
      "title": "Mini Treat Bag",
      "cat": "Treats",
      "price": 12,
      "img": "olivia-bollen-3BvVFcZIL7I-unsplash.jpg",
      "desc": "A tiny bag of happiness. Perfect for a small thank you.",
      "tag": "Under 15"
    },
    {
      "id": 23,
      "title": "Pretty Shelf Set",
      "cat": "For Home",
      "price": 39,
      "img": "grace-anne-bobadilla-_PyacZLIViw-unsplash.jpg",
      "desc": "A little vase, a candle and a tray to make any shelf prettier.",
      "tag": ""
    },
    {
      "id": 24,
      "title": "Message In A Box",
      "cat": "Personalized",
      "price": 27,
      "img": "kateryna-hliznitsova-RYZ4f7mAHtc-unsplash.jpg",
      "desc": "Your own words printed on a beautiful keepsake card box.",
      "tag": ""
    }
  ];
  const PRODUCTS = Object.fromEntries(PRODUCT_LIST.map(p => [p.id, { ...p, img: IMG_BASE + p.img }]));
  const CATEGORIES = [
    ['All', 'All gifts'], ['Flowers', 'Flowers'], ['Gift Boxes', 'Gift boxes'],
    ['Self Care', 'Self-care'], ['Treats', 'Sweet treats'], ['For Home', 'For home'], ['Personalized', 'Personalized']
  ];
  const fmt = n => `${n} JOD`;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };
  const favs = new Set(store.get('dono:favs', []));
  let current = null, qty = 1, favOnly = false;

  const toastEl = $('#toast'); let tt;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.style.opacity = 1; toastEl.style.translate = '-50% 0';
    clearTimeout(tt);
    tt = setTimeout(() => { toastEl.style.opacity = 0; toastEl.style.translate = '-50% 20px'; }, 2200);
  }

   /* ===== CART — مربوطة بالـ API (PHP) والداتا بيس ===== */
  const API = '/api/cart';   // عدّل المسار حسب مكان سيرفرك، مثلاً 'http://localhost:8000/api/cart'

  // الـ API بيرجّع اسم الصورة فقط، فبنضيف مسار المجلد
  const withImg = c => ({ ...c, items: c.items.map(i => ({ ...i, img: IMG_BASE + i.img })) });

  async function api(action, { id, qty = 1 } = {}) {
    const req = {
      add:    ['POST',   '/items',         { id, qty }],
      set:    ['PUT',    `/items/${id}`,   { qty }],
      remove: ['DELETE', `/items/${id}`,   null]
    }[action];
    try {
      const r = await fetch(API + req[1], {
        method: req[0],
        credentials: 'include',                          // عشان الـ session
        headers: { 'Content-Type': 'application/json' },
        body: req[2] ? JSON.stringify(req[2]) : undefined
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || 'Something went wrong');
      return { ok: true, cart: withImg(j.data) };
    } catch (e) { toast(e.message || 'Network error'); return null; }
  }

  let cart = { items: [], count: 0, total: 0 };
  // تحميل السلة المحفوظة بالداتا بيس أول ما تفتح الصفحة
  fetch(API, { credentials: 'include' })
    .then(r => r.json())
    .then(j => { if (j.success) { cart = withImg(j.data); renderCart(); } })
    .catch(() => {});

  /* CART */
  function renderCart() {
    if ($('#cartCount')) $('#cartCount').textContent = cart.count;
    if ($('#drawerTotal')) $('#drawerTotal').textContent = fmt(cart.total);
    if ($('#drawerList')) $('#drawerList').innerHTML = cart.items.length
      ? cart.items.map(i => `
        <div class="d-item" data-id="${i.id}">
          <img src="${esc(i.img)}" alt="${esc(i.title)}">
          <div><h4>${esc(i.title)}</h4><small>${fmt(i.price * i.qty)}</small>
            <div class="d-ctrl"><button data-d="-">−</button><span>${i.qty}</span><button data-d="+">+</button></div></div>
          <button class="d-rm" data-d="x" aria-label="Remove">✕</button>
        </div>`).join('')
      : `<div class="drawer-empty"><b>Your cart is empty ♡</b>Find a little something for someone special.</div>`;
  }
  async function addToCart(id, q = 1) {
    const r = await api('add', { id, qty: q }); if (!r) return false;
    cart = r.cart; renderCart();
    toast(`${PRODUCTS[id].title} added 🛍`);
    return true;
  }
  if ($('#drawerList')) $('#drawerList').addEventListener('click', async e => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    const id = b.closest('.d-item').dataset.id, d = b.dataset.d;
    const item = cart.items.find(i => i.id == id);
    const r = d === 'x' ? await api('remove', { id }) : await api('set', { id, qty: item.qty + (d === '+' ? 1 : -1) });
    if (r) { cart = r.cart; renderCart(); }
  });

  const drawer = $('#drawer'), dBack = $('#drawerBackdrop');
  const openDrawer  = () => { drawer.classList.add('open'); dBack.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); };
  const closeDrawer = () => { drawer.classList.remove('open'); dBack.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); };
  if ($('#cartBtn')) $('#cartBtn').onclick = openDrawer;
  if ($('#drawerClose')) $('#drawerClose').onclick = closeDrawer;
  if (dBack) dBack.onclick = closeDrawer;
  if ($('#checkout')) $('#checkout').onclick = () => toast(cart.count ? 'Checkout coming soon ♡' : 'Your cart is empty');

  /* FAVORITES */
  function paintFavs() {
    $$('.dono-card').forEach(c => {
      const on = favs.has(+c.dataset.id), b = $('[data-act=fav]', c);
      b.classList.toggle('saved', on); b.textContent = on ? '♥' : '♡'; b.setAttribute('aria-pressed', on);
    });
    if (current) syncModalFav();
  }
  function applyFavOnly() {
    $$('.dono-card').forEach(c => c.style.display = favOnly && !favs.has(+c.dataset.id) ? 'none' : '');
    const btn = $('#favoritesOnly');
    btn.classList.toggle('active', favOnly); btn.setAttribute('aria-pressed', favOnly);
  }
  function toggleFav(id) {
    favs.has(id) ? favs.delete(id) : favs.add(id);
    store.set('dono:favs', [...favs]);
    toast(favs.has(id) ? 'Saved to favorites ♡' : 'Removed from favorites');
    paintFavs(); applyFavOnly();
    $$(`.dono-card[data-id="${id}"] .dono-save`).forEach(b => { b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); });
  }

  /* FILTER PANEL — true toggle: the same button opens AND closes */
  const filterPanel = $('#filterSidebar');
  const filterOverlay = $('#filterOverlay');
  const filterLaunch = $('#filterLaunch');
  const closeFilters = () => {
    filterPanel.classList.remove('open'); filterOverlay.classList.remove('open');
    filterPanel.setAttribute('aria-hidden', 'true');
    filterLaunch.setAttribute('aria-expanded', 'false');
    filterLaunch.setAttribute('aria-label', 'Open filters');
    document.body.classList.remove('filters-open');
  };
  const openFilters = () => {
    filterPanel.classList.add('open'); filterOverlay.classList.add('open');
    filterPanel.setAttribute('aria-hidden', 'false');
    filterLaunch.setAttribute('aria-expanded', 'true');
    filterLaunch.setAttribute('aria-label', 'Close filters');
    document.body.classList.add('filters-open');
  };
  filterLaunch.addEventListener('click', () => filterPanel.classList.contains('open') ? closeFilters() : openFilters());
  $('#filterClose').addEventListener('click', closeFilters);
  filterOverlay.addEventListener('click', closeFilters);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeFilters(); });

  /* AJAX-STYLE FILTERING: update existing cards in place; never reload the page */
  const shopForm = $('#shopForm');
  const productsGrid = $('#products');
  const catBox = $('.side-categories');
  const catCount = key => key === 'All' ? PRODUCT_LIST.length : PRODUCT_LIST.filter(p => p.cat === key).length;
  catBox.innerHTML = CATEGORIES.map(([key, label]) =>
    `<a href="?cat=${encodeURIComponent(key).replace(/%20/g, '+')}#shop"><span>${label}</span><b>${catCount(key)}</b></a>`).join('');
  const categoryLinks = $$('.side-categories a');
  const navSearch = $('#navSearch');
  const shopSearch = $('#shopSearch');
  const initialParams = new URLSearchParams(location.search);
  const filterState = {
    q: initialParams.get('q') || shopSearch.value || '',
    cat: initialParams.get('cat') || shopForm.querySelector('input[name="cat"]').value || 'All',
    price: initialParams.get('price') || shopForm.querySelector('[name="price"]:checked')?.value || 'all',
    sort: initialParams.get('sort') || shopForm.querySelector('[name="sort"]').value || 'featured'
  };
  let filterTimer;
  const categoryNames = {All:'All gifts',Flowers:'Flowers','Gift Boxes':'Gift boxes','Self Care':'Self-care',Treats:'Sweet treats','For Home':'For home',Personalized:'Personalized'};
  const money = n => `${n} <small>JOD</small>`;
  function productCard(p, i) {
    const rating = (4.6 + ((p.id * 7) % 5) / 10).toFixed(1);
    const reviews = 28 + ((p.id * 13) % 170);
    return `<article class="dono-card flip-card card-enter" data-id="${p.id}" style="--i:${i}" tabindex="0" aria-label="${esc(p.title)}. Click to flip for details">
      <div class="flip-card-inner"><div class="flip-face flip-front">
        <img src="${esc(p.img)}" alt="${esc(p.title)}" loading="lazy">
        ${p.tag ? `<span class="dono-card-tag">${esc(p.tag)}</span>` : ''}
        <button class="dono-save" type="button" data-act="fav" aria-label="Save ${esc(p.title)}" aria-pressed="${favs.has(+p.id)}">${favs.has(+p.id) ? '♥' : '♡'}</button>
        <span class="flip-hint"><span class="flip-hint-dot"></span> TAP CARD TO DISCOVER</span>
      </div><div class="flip-face flip-back">
        <span class="flip-back-label">${esc(p.cat)} <span aria-hidden="true">✳</span> THE DETAILS</span>
        <div class="product-rating" aria-label="Rated ${rating} out of 5"><span class="rating-stars" aria-hidden="true">★★★★★</span><strong>${rating}</strong><span class="rating-reviews">(${reviews} reviews)</span></div>
        <h3 class="dono-card-title">${esc(p.title)}</h3><p class="flip-back-desc">${esc(p.desc)}</p>
        <div class="flip-back-bottom"><span class="dono-price">${money(p.price)}</span><button class="add-btn" type="button" data-act="add">Add to bag <span>＋</span></button></div>
        <div class="flip-back-actions"><button type="button" class="flip-again" data-act="flip" aria-label="Flip back to photo">Back to photo</button></div>
      </div></div></article>`;
  }
  function syncFilterControls() {
    shopSearch.value = filterState.q; if (navSearch) navSearch.value = filterState.q;
    shopForm.querySelector('input[name="cat"]').value = filterState.cat;
    shopForm.querySelectorAll('[name="price"]').forEach(r => r.checked = r.value === filterState.price);
    shopForm.querySelector('[name="sort"]').value = filterState.sort;
    categoryLinks.forEach(a => {
      const href = new URL(a.href, location.href), c = href.searchParams.get('cat') || 'All';
      a.classList.toggle('active', c === filterState.cat);
      a.setAttribute('aria-current', c === filterState.cat ? 'true' : 'false');
    });
  }
  function renderProducts() {
    const q = filterState.q.trim().toLocaleLowerCase();
    let list = Object.values(PRODUCTS).filter(p => {
      const hay = `${p.title} ${p.cat} ${p.desc} ${p.tag || ''}`.toLocaleLowerCase();
      if (q && !hay.includes(q)) return false;
      if (filterState.cat !== 'All' && p.cat !== filterState.cat) return false;
      if (filterState.price === 'under25' && !(+p.price < 25)) return false;
      if (filterState.price === '25to40' && !(+p.price >= 25 && +p.price <= 40)) return false;
      if (filterState.price === 'over40' && !(+p.price > 40)) return false;
      if (favOnly && !favs.has(+p.id)) return false;
      return true;
    });
    if (filterState.sort === 'low') list.sort((a,b) => +a.price - +b.price);
    if (filterState.sort === 'high') list.sort((a,b) => +b.price - +a.price);
    if (filterState.sort === 'name') list.sort((a,b) => a.title.localeCompare(b.title));
    // Update the catalogue immediately in-place. No timeout, navigation, or fake loading state.
    productsGrid.innerHTML = list.length ? list.map(productCard).join('') : `<div class="shop-empty"><b>No gifts found ♡</b><p>Try another word, category or budget.</p><button type="button" data-reset-filters>Show all gifts</button></div>`;
    productsGrid.querySelectorAll('.dono-card').forEach((c,i) => c.style.setProperty('--i', i));
    $('#productCount').innerHTML = `<b>${list.length}</b> thoughtful finds <a href="#shop" class="clear-filters" data-clear-filters>Clear</a>`;
    const activeCount = Number(filterState.cat !== 'All') + Number(filterState.price !== 'all') + Number(!!filterState.q.trim());
    const countBadge = filterLaunch.querySelector('b'); if (countBadge) countBadge.textContent = activeCount || '';
    paintFavs();
    const url = new URL(location.href);
    ['q','cat','price','sort'].forEach(k => url.searchParams.delete(k));
    if (filterState.q.trim()) url.searchParams.set('q', filterState.q.trim());
    if (filterState.cat !== 'All') url.searchParams.set('cat', filterState.cat);
    if (filterState.price !== 'all') url.searchParams.set('price', filterState.price);
    if (filterState.sort !== 'featured') url.searchParams.set('sort', filterState.sort);
    url.hash = 'shop'; history.replaceState({}, '', url);
    syncFilterControls();
  }
  function updateFilters(closePanel = false) { renderProducts(); if (closePanel) closeFilters(); }
  shopForm.addEventListener('submit', e => { e.preventDefault(); e.stopPropagation(); filterState.q = shopSearch.value; filterState.price = shopForm.querySelector('[name="price"]:checked')?.value || 'all'; filterState.sort = shopForm.querySelector('[name="sort"]').value; updateFilters(true); toast('Filters applied'); }, true);
  shopForm.querySelectorAll('[name="price"], [name="sort"]').forEach(el => el.addEventListener('change', () => { filterState.price = shopForm.querySelector('[name="price"]:checked')?.value || 'all'; filterState.sort = shopForm.querySelector('[name="sort"]').value; updateFilters(); }));
  shopSearch.addEventListener('input', () => { filterState.q = shopSearch.value; if (navSearch) navSearch.value = filterState.q; clearTimeout(filterTimer); filterTimer = setTimeout(() => updateFilters(), 220); });
  if (navSearch) {
    navSearch.addEventListener('input', () => { filterState.q = navSearch.value; shopSearch.value = filterState.q; clearTimeout(filterTimer); filterTimer = setTimeout(() => updateFilters(), 220); });
    navSearch.form?.addEventListener('submit', e => { e.preventDefault(); filterState.q = navSearch.value; shopSearch.value = filterState.q; updateFilters(); });
  }
  document.addEventListener('click', e => { const a = e.target.closest('.side-categories a'); if (!a) return; e.preventDefault(); e.stopPropagation(); const u = new URL(a.href, location.href); filterState.cat = u.searchParams.get('cat') || 'All'; updateFilters(false); });
  document.addEventListener('click', e => {
    if (e.target.closest('[data-clear-filters], .filter-heading a, [data-reset-filters]')) {
      e.preventDefault(); filterState.q = ''; filterState.cat = 'All'; filterState.price = 'all'; filterState.sort = 'featured'; favOnly = false; updateFilters(true); toast('All gifts are back ♡');
    }
  });
  $('#favoritesOnly').addEventListener('click', () => { favOnly = !favOnly; applyFavOnly(); renderProducts(); });

  /* CARDS: quick flip with a short auto-return timer */
  const cardFlipTimers = new WeakMap();
  function toggleCardFlip(card) {
    const oldTimer = cardFlipTimers.get(card);
    if (oldTimer) clearTimeout(oldTimer);
    if (card.classList.contains('is-flipped')) {
      card.classList.remove('is-flipped');
      cardFlipTimers.delete(card);
      return;
    }
    card.classList.add('is-flipped');
    const timer = setTimeout(() => {
      card.classList.remove('is-flipped');
      cardFlipTimers.delete(card);
    }, 4200);
    cardFlipTimers.set(card, timer);
  }
  $('#products').addEventListener('click', async e => {
    const card = e.target.closest('.dono-card'); if (!card) return;
    const id = +card.dataset.id, act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'fav') return toggleFav(id);
    if (act === 'flip') { toggleCardFlip(card); return; }
    if (act === 'details') { openModal(id); return; }
    if (act === 'add') {
      const b = e.target.closest('button');
      if (await addToCart(id, 1)) { b.classList.add('done'); b.innerHTML = 'Added <span>✓</span>'; setTimeout(() => { b.classList.remove('done'); b.innerHTML = 'Add to bag <span>＋</span>'; }, 1200); }
      return;
    }
    if (e.target.closest('.flip-card') && !e.target.closest('button, a, input, select, textarea')) { toggleCardFlip(card); }
  });
  $('#products').addEventListener('keydown', e => {
    const card = e.target.closest('.flip-card');
    if (card && (e.key === 'Enter' || e.key === ' ') && !e.target.closest('button, a, input, select, textarea')) { e.preventDefault(); toggleCardFlip(card); }
  });
  $$('[data-open]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openModal(+a.dataset.open); }));

  /* MODAL */
  const modal = $('#modal');
  function openModal(id) {
    const p = PRODUCTS[id]; if (!p) return;
    current = id; qty = 1;
    $('#mImg').src = p.img; $('#mImg').alt = p.title;
    $('#mCat').textContent = p.cat; $('#mTitle').textContent = p.title;
    $('#mDesc').textContent = p.desc; $('#mPrice').textContent = fmt(p.price);
    $('#qVal').textContent = 1; syncModalFav();
    modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; current = null;
  }
  function syncModalFav() {
    const on = favs.has(current), b = $('#mFav');
    b.classList.toggle('saved', on); b.textContent = on ? '♥' : '♡';
  }
  const setQty = n => { qty = Math.min(20, Math.max(1, n)); $('#qVal').textContent = qty; $('#mPrice').textContent = fmt(PRODUCTS[current].price * qty); };
  modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
  $('#qMinus').onclick = () => setQty(qty - 1);
  $('#qPlus').onclick  = () => setQty(qty + 1);
  $('#mFav').onclick   = () => toggleFav(current);
  $('#mAdd').onclick   = async () => { if (await addToCart(current, qty)) { closeModal(); openDrawer(); } };

  /* Filtering is handled above without a page reload. */

  /* KEYBOARD */
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault(); $('#shop').scrollIntoView({ behavior: 'smooth' }); setTimeout(() => $('#shopSearch').focus(), 500);
    }
    if (e.key === 'Escape') { closeModal(); closeDrawer(); }
  });

  /* PAGE EXTRAS */
  const bar = $('#bar'), nav = $('nav'), topBtn = $('#topButton');
  function onScroll() {
    const h = document.documentElement;
    bar.style.transform = `scaleX(${h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)})`;
    nav.classList.toggle('scrolled', h.scrollTop > 20);
    topBtn.classList.toggle('show', h.scrollTop > 700);
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  topBtn.onclick = () => scrollTo({ top: 0, behavior: 'smooth' });

  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: .12 });
  $$('.editorial-heading,.moment-copy,.bestseller-top,.love-note-art,.love-note-copy,.quote-section>*,.shop-head,.join-section>*,.category-tile,.feature-product,.moment-photo')
    .forEach(el => {
      const sib = [...el.parentElement.children].filter(x => x.matches('.category-tile,.feature-product,.moment-photo'));
      if (sib.includes(el)) el.style.setProperty('--rd', (sib.indexOf(el) * 0.09) + 's');
      el.classList.add('reveal'); io.observe(el);
    });

  /* Gift guide shortcuts: بتفلتر بدون ما تعمل reload */
  document.addEventListener('click', e => {
    const a = e.target.closest('.gift-guide-options a'); if (!a) return;
    e.preventDefault();
    filterState.cat = new URL(a.href, location.href).searchParams.get('cat') || 'All';
    updateFilters(false);
    $('#shop').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('giftAssistantClose')?.click();
  });

  /* Gift guide button — quick, useful category shortcuts */
  const giftGuide = $('#giftAssistant');
  const giftGuideToggle = $('#giftAssistantToggle');
  const giftGuideClose = $('#giftAssistantClose');
  const closeGiftGuide = () => {
    if (!giftGuide || !giftGuideToggle) return;
    giftGuide.classList.remove('open');
    giftGuide.setAttribute('aria-hidden', 'true');
    giftGuideToggle.setAttribute('aria-expanded', 'false');
  };
  if (giftGuide && giftGuideToggle) {
    giftGuideToggle.addEventListener('click', () => {
      const open = !giftGuide.classList.contains('open');
      giftGuide.classList.toggle('open', open);
      giftGuide.setAttribute('aria-hidden', String(!open));
      giftGuideToggle.setAttribute('aria-expanded', String(open));
    });
    if (giftGuideClose) giftGuideClose.addEventListener('click', closeGiftGuide);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeGiftGuide(); });
  }

  renderCart(); paintFavs(); renderProducts();
})();