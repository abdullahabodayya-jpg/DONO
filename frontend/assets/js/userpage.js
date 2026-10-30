(() => {
  'use strict';
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ===== الصور ===== */
  const IMG_BASE = 'assets/img/';
  // اختار المزود: 'imagekit' | 'cloudinary' | 'none' (none = الصور المحلية زي ما هي)
  // 'webp' (الافتراضي بعد تشغيل optimize-images.mjs) | 'imagekit' | 'cloudinary' | 'none'
  const IMG_PROVIDER = 'webp';
  const IK_ENDPOINT  = 'https://ik.imagekit.io/YOUR_ID/';   // من لوحة ImageKit (URL endpoint)
  const CLD_CLOUD    = 'YOUR_CLOUD_NAME';                   // من لوحة Cloudinary
  const CLD_FOLDER   = 'dono';                              // مجلد الصور اللي رفعتها على Cloudinary

  // w = العرض المطلوب بالبكسل. المزود بيصغّر الصورة ويحوّلها WebP/AVIF حسب المتصفح تلقائياً
  // خريطة صور Pexels (id المنتج -> رابط)، بتتولد من سكربت fetch-images.mjs وبتتحمّل قبل هاد الملف
  const IMG_MAP = window.IMG_MAP || {};
  const imgUrl = (f, w = 600, id) => {
    if (id && IMG_MAP[id])
      return `${IMG_MAP[id]}?auto=compress&cs=tinysrgb&fit=crop&w=${w}&h=${w}`;
    if (IMG_PROVIDER === 'webp')
      return IMG_BASE + f.replace(/\.(jpe?g|png)$/i, '.webp'); // صور مصغّرة ولّدها optimize-images.mjs
    if (IMG_PROVIDER === 'imagekit')
      return `${IK_ENDPOINT}${IMG_BASE}${f}?tr=w-${w},q-75,f-auto`;
    if (IMG_PROVIDER === 'cloudinary')
      return `https://res.cloudinary.com/${CLD_CLOUD}/image/upload/w_${w},q_auto,f_auto/${CLD_FOLDER}/${f.replace(/\.[^.]+$/, '')}`;
    return IMG_BASE + f;
  };
  const origUrl = f => IMG_BASE + f; // احتياط إذا فشل المزود

  // إذا ملف الـ webp مش موجود، يرجع للأصلي تلقائياً (مرة وحدة فقط)
  document.addEventListener('error', e => {
    const img = e.target;
    if (img.tagName !== 'IMG' || !img.dataset.fallback || img.dataset.tried) return;
    img.dataset.tried = '1';
    img.src = img.dataset.fallback;
  }, true);

  const PRODUCT_LIST = [
    { "id": 1, "title": "The Soft Morning Box", "cat": "Gift Boxes", "price": 32, "img": "ekaterina-shevchenko-ZLTlHeKbh04-unsplash.jpg", "desc": "A pastel box of little everyday magic: candle, sweets and a handwritten note.", "tag": "Most loved" },
    { "id": 2, "title": "A Little Bloom Moment", "cat": "Flowers", "price": 24, "img": "micheile-henderson-Afjk-6oFzPE-unsplash.jpg", "desc": "Seasonal blooms wrapped in sage paper, with a tiny gift box on the side.", "tag": "Favourite" },
    { "id": 3, "title": "Sunday Reset Hamper", "cat": "Self Care", "price": 38, "img": "toa-heftiba-gxLzAjHayUs-unsplash.jpg", "desc": "Bath salts, a soft candle and a face mask. A deep breath, in a box.", "tag": "Reset" },
    { "id": 4, "title": "The Happy Snack Edit", "cat": "Treats", "price": 18, "img": "olivia-bollen-3BvVFcZIL7I-unsplash.jpg", "desc": "Chocolate, cookies and sweet little things for instant happiness.", "tag": "Sweet" },
    { "id": 5, "title": "Cozy Evening Basket", "cat": "For Home", "price": 45, "img": "dhiraj-kumar-gVgG2Km7RG4-unsplash.jpg", "desc": "Throw, tea and a candle. Everything for a slow evening at home.", "tag": "Cozy" },
    { "id": 6, "title": "Bear Hug Surprise", "cat": "Personalized", "price": 29, "img": "superkitina-GIImjW5MzAA-unsplash.jpg", "desc": "A soft teddy with a personalised name tag and a message card.", "tag": "Made for them" },
    { "id": 7, "title": "Emerald Gift Set", "cat": "Gift Boxes", "price": 41, "img": "brand-9.jpg", "desc": "An elegant green set, wrapped with satin ribbon and a wax seal.", "tag": "New" },
    { "id": 8, "title": "Blush Peony Bouquet", "cat": "Flowers", "price": 35, "img": "keytion-13WiuT2kf1A-unsplash.jpg", "desc": "Soft blush blooms, hand-tied and ready to make someone smile.", "tag": "" },
    { "id": 9, "title": "Spa Day In A Box", "cat": "Self Care", "price": 52, "img": "raelle-cameron-GvE8vd_cjGw-unsplash.jpg", "desc": "A full pamper set: scrub, oil, mask and a scented candle.", "tag": "Bestseller" },
    { "id": 10, "title": "Sweet Tooth Crate", "cat": "Treats", "price": 26, "img": "olivia-bollen-3BvVFcZIL7I-unsplash.jpg", "desc": "Twelve hand-picked treats for the one with a sweet tooth.", "tag": "" },
    { "id": 11, "title": "Warm Hug Throw Set", "cat": "For Home", "price": 58, "img": "dhiraj-kumar-gVgG2Km7RG4-unsplash.jpg", "desc": "A chunky throw with a mug and hot chocolate. Comfort in the cutest form.", "tag": "" },
    { "id": 12, "title": "Their Name, Your Thought", "cat": "Personalized", "price": 34, "img": "laura-chouette-eGBXbKtjbik-unsplash.jpg", "desc": "A custom engraved keepsake box with their name and your note.", "tag": "Custom" },
    { "id": 13, "title": "Sunny Day Daisies", "cat": "Flowers", "price": 19, "img": "keytion-13WiuT2kf1A-unsplash.jpg", "desc": "Bright daisies and sunflowers for the just-because days.", "tag": "" },
    { "id": 14, "title": "The Thank You Box", "cat": "Gift Boxes", "price": 22, "img": "grace-anne-bobadilla-_PyacZLIViw-unsplash.jpg", "desc": "A small but mighty box that says thank you, beautifully.", "tag": "" },
    { "id": 15, "title": "Slow Morning Kit", "cat": "Self Care", "price": 27, "img": "toa-heftiba-gxLzAjHayUs-unsplash.jpg", "desc": "Tea, hand cream and a lip balm for slow mornings.", "tag": "" },
    { "id": 16, "title": "Chocolate Lovers Tray", "cat": "Treats", "price": 31, "img": "olivia-bollen-3BvVFcZIL7I-unsplash.jpg", "desc": "A tray of premium chocolates in six different flavours.", "tag": "Yum" },
    { "id": 17, "title": "Little Home Glow", "cat": "For Home", "price": 21, "img": "dhiraj-kumar-gVgG2Km7RG4-unsplash.jpg", "desc": "Two soy candles and a matchbox. Small light, big mood.", "tag": "" },
    { "id": 18, "title": "Initials Teddy", "cat": "Personalized", "price": 44, "img": "rosebox-BFdSCxmqvYc-unsplash.jpg", "desc": "A premium plush with their embroidered initials.", "tag": "" },
    { "id": 19, "title": "Grand Celebration Box", "cat": "Gift Boxes", "price": 65, "img": "wedding-dreamz-XsriYQ1oowc-unsplash.jpg", "desc": "The big one: for birthdays, weddings and big moments.", "tag": "Luxe" },
    { "id": 20, "title": "Garden Mix Bouquet", "cat": "Flowers", "price": 42, "img": "micheile-henderson-Afjk-6oFzPE-unsplash.jpg", "desc": "A lush garden-style bouquet with eucalyptus and roses.", "tag": "" },
    { "id": 21, "title": "Calm & Cozy Hamper", "cat": "Self Care", "price": 36, "img": "raelle-cameron-GvE8vd_cjGw-unsplash.jpg", "desc": "Eye mask, herbal tea and a soft candle in one calm box.", "tag": "" },
    { "id": 22, "title": "Mini Treat Bag", "cat": "Treats", "price": 12, "img": "olivia-bollen-3BvVFcZIL7I-unsplash.jpg", "desc": "A tiny bag of happiness. Perfect for a small thank you.", "tag": "Under 15" },
    { "id": 23, "title": "Pretty Shelf Set", "cat": "For Home", "price": 39, "img": "grace-anne-bobadilla-_PyacZLIViw-unsplash.jpg", "desc": "A little vase, a candle and a tray to make any shelf prettier.", "tag": "" },
    { "id": 24, "title": "Message In A Box", "cat": "Personalized", "price": 27, "img": "kateryna-hliznitsova-RYZ4f7mAHtc-unsplash.jpg", "desc": "Your own words printed on a beautiful keepsake card box.", "tag": "" }
  ];

  // نحتفظ باسم الملف الأصلي (file) ونحسب الرابط (img) مرة وحدة
  const PRODUCTS = Object.fromEntries(PRODUCT_LIST.map(p => [p.id, {
    ...p, file: p.img, img: imgUrl(p.img, 600, p.id), imgFallback: origUrl(p.img),
    // نحسب التقييم والمراجعات مرة وحدة بدل كل رسم
    rating: (4.6 + ((p.id * 7) % 5) / 10).toFixed(1),
    reviews: 28 + ((p.id * 13) % 170),
    hay: `${p.title} ${p.cat} ${p.desc} ${p.tag || ''}`.toLocaleLowerCase()
  }]));

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

  const cardFlipTimers = new Map();
  const AUTO_FLIP_DELAY = 4000;

  const toastEl = $('#toast'); let tt;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.style.opacity = 1; toastEl.style.translate = '-50% 0';
    clearTimeout(tt);
    tt = setTimeout(() => { toastEl.style.opacity = 0; toastEl.style.translate = '-50% 20px'; }, 2200);
  }

  /* ===== CART ===== */
  const API = '/api/cart';
  const withImg = c => ({ ...c, items: c.items.map(i => ({ ...i, img: imgUrl(i.img, 160, i.id), imgFallback: origUrl(i.img) })) });

  async function api(action, { id, qty = 1 } = {}) {
    const req = {
      add:    ['POST',   '/items',         { id, qty }],
      set:    ['PUT',    `/items/${id}`,   { qty }],
      remove: ['DELETE', `/items/${id}`,   null]
    }[action];
    try {
      const r = await fetch(API + req[1], {
        method: req[0],
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: req[2] ? JSON.stringify(req[2]) : undefined
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || 'Something went wrong');
      return { ok: true, cart: withImg(j.data) };
    } catch (e) { toast(e.message || 'Network error'); return null; }
  }

  let cart = { items: [], count: 0, total: 0 };
  fetch(API, { credentials: 'include' })
    .then(r => r.json())
    .then(j => { if (j.success) { cart = withImg(j.data); renderCart(); } })
    .catch(() => {});

  function renderCart() {
    if ($('#cartCount')) $('#cartCount').textContent = cart.count;
    if ($('#drawerTotal')) $('#drawerTotal').textContent = fmt(cart.total);
    if ($('#drawerList')) $('#drawerList').innerHTML = cart.items.length
      ? cart.items.map(i => `
        <div class="d-item" data-id="${i.id}">
          <img src="${esc(i.img)}" data-fallback="${esc(i.imgFallback)}" alt="${esc(i.title)}" width="64" height="64" loading="lazy" decoding="async">
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
  const openDrawer  = () => { drawer?.classList.add('open'); dBack?.classList.add('open'); drawer?.setAttribute('aria-hidden', 'false'); };
  const closeDrawer = () => { drawer?.classList.remove('open'); dBack?.classList.remove('open'); drawer?.setAttribute('aria-hidden', 'true'); };
  if ($('#cartBtn')) $('#cartBtn').onclick = openDrawer;
  if ($('#drawerClose')) $('#drawerClose').onclick = closeDrawer;
  if (dBack) dBack.onclick = closeDrawer;
  if ($('#checkout')) $('#checkout').onclick = () => toast(cart.count ? 'Checkout coming soon ♡' : 'Your cart is empty');

  /* ===== FILTER PANEL ===== */
  const filterPanel = $('#filterSidebar');
  const filterOverlay = $('#filterOverlay');
  const filterLaunch = $('#filterLaunch');
  const closeFilters = () => {
    if (!filterPanel) return;
    filterPanel.classList.remove('open'); filterOverlay?.classList.remove('open');
    filterPanel.setAttribute('aria-hidden', 'true');
    filterLaunch?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('filters-open');
  };
  const openFilters = () => {
    if (!filterPanel) return;
    filterPanel.classList.add('open'); filterOverlay?.classList.add('open');
    filterPanel.setAttribute('aria-hidden', 'false');
    filterLaunch?.setAttribute('aria-expanded', 'true');
    document.body.classList.add('filters-open');
  };
  if (filterLaunch) filterLaunch.addEventListener('click', () => filterPanel.classList.contains('open') ? closeFilters() : openFilters());
  if ($('#filterClose')) $('#filterClose').addEventListener('click', closeFilters);
  if (filterOverlay) filterOverlay.addEventListener('click', closeFilters);

  /* ===== عناصر الصفحة ===== */
  const shopForm = $('#shopForm');
  const productsGrid = $('#products');
  const catBox = $('.side-categories');
  const catCount = key => key === 'All' ? PRODUCT_LIST.length : PRODUCT_LIST.filter(p => p.cat === key).length;
  if (catBox) {
    catBox.innerHTML = CATEGORIES.map(([key, label]) =>
      `<a href="?cat=${encodeURIComponent(key).replace(/%20/g, '+')}#shop"><span>${label}</span><b>${catCount(key)}</b></a>`).join('');
  }
  const categoryLinks = $$('.side-categories a');
  const navSearch = $('#navSearch');
  const shopSearch = $('#shopSearch');
  const initialParams = new URLSearchParams(location.search);
  const filterState = {
    q: initialParams.get('q') || shopSearch?.value || '',
    cat: initialParams.get('cat') || shopForm?.querySelector('input[name="cat"]')?.value || 'All',
    price: initialParams.get('price') || shopForm?.querySelector('[name="price"]:checked')?.value || 'all',
    sort: initialParams.get('sort') || shopForm?.querySelector('[name="sort"]')?.value || 'featured'
  };
  let filterTimer;
  const money = n => `${n} <small>JOD</small>`;

  /* ===== بناء الكروت مرة وحدة فقط ===== */
  const cardEls = new Map();   // id -> عنصر الكرت
  let emptyEl = null;

  function productCard(p, i) {
    const saved = favs.has(+p.id);
    // أول 4 صور بتحمّل فوراً، الباقي lazy
    const eager = i < 4;
    return `<article class="dono-card flip-card card-enter" data-id="${p.id}" style="--i:${i}" tabindex="0" aria-label="${esc(p.title)}. Click to flip for details">
      <div class="flip-card-inner"><div class="flip-face flip-front">
        <img src="${esc(p.img)}" data-fallback="${esc(p.imgFallback)}" alt="${esc(p.title)}" width="600" height="600"
             ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
        ${p.tag ? `<span class="dono-card-tag">${esc(p.tag)}</span>` : ''}
        <button class="dono-save${saved ? ' saved' : ''}" type="button" data-act="fav" aria-label="Save ${esc(p.title)}" aria-pressed="${saved}">${saved ? '♥' : '♡'}</button>
        <span class="flip-hint"><span class="flip-hint-dot"></span> TAP CARD TO DISCOVER</span>
      </div><div class="flip-face flip-back">
        <span class="flip-back-label">${esc(p.cat)} <span aria-hidden="true">✳</span> THE DETAILS</span>
        <div class="product-rating" aria-label="Rated ${p.rating} out of 5"><span class="rating-stars" aria-hidden="true">★★★★★</span><strong>${p.rating}</strong><span class="rating-reviews">(${p.reviews} reviews)</span></div>
        <h3 class="dono-card-title">${esc(p.title)}</h3><p class="flip-back-desc">${esc(p.desc)}</p>
        <div class="flip-back-bottom"><span class="dono-price">${money(p.price)}</span><button class="add-btn" type="button" data-act="add">Add to bag <span>＋</span></button></div>
        <div class="flip-back-actions"><button type="button" class="flip-again" data-act="flip" aria-label="Back to photo">Back to photo</button></div>
      </div></div></article>`;
  }

  function buildCards() {
    if (!productsGrid) return;
    productsGrid.innerHTML = PRODUCT_LIST.map((p, i) => productCard(PRODUCTS[p.id], i)).join('');
    productsGrid.querySelectorAll('.dono-card').forEach(c => {
      cardEls.set(+c.dataset.id, c);
      // بعد ما تخلص أنيميشن الدخول نشيل الكلاس، عشان ما يعيد تشغيله لما ننقل الكرت
      c.addEventListener('animationend', e => {
        if (e.target === c) c.classList.remove('card-enter');
      }, { once: true });
    });
    emptyEl = document.createElement('div');
    emptyEl.className = 'shop-empty';
    emptyEl.style.display = 'none';
    emptyEl.innerHTML = `<b>No gifts found ♡</b><p>Try another word, category or budget.</p><button type="button" data-reset-filters>Show all gifts</button>`;
    productsGrid.appendChild(emptyEl);
  }

  function syncFilterControls() {
    if (shopSearch && shopSearch.value !== filterState.q) shopSearch.value = filterState.q;
    if (navSearch && navSearch.value !== filterState.q) navSearch.value = filterState.q;
    if (shopForm) {
      const catInput = shopForm.querySelector('input[name="cat"]');
      if (catInput) catInput.value = filterState.cat;
      shopForm.querySelectorAll('[name="price"]').forEach(r => r.checked = r.value === filterState.price);
      const sortSelect = shopForm.querySelector('[name="sort"]');
      if (sortSelect) sortSelect.value = filterState.sort;
    }
    categoryLinks.forEach(a => {
      const href = new URL(a.href, location.href), c = href.searchParams.get('cat') || 'All';
      a.classList.toggle('active', c === filterState.cat);
      a.setAttribute('aria-current', c === filterState.cat ? 'true' : 'false');
    });
  }

  /* ===== الفلترة: إظهار/إخفاء + إعادة ترتيب بدون إعادة بناء ===== */
  function applyFilters() {
    if (!productsGrid) return;
    const q = filterState.q.trim().toLocaleLowerCase();

    const matches = p => {
      if (q && !p.hay.includes(q)) return false;
      if (filterState.cat !== 'All' && p.cat !== filterState.cat) return false;
      if (filterState.price === 'under25' && !(+p.price < 25)) return false;
      if (filterState.price === '25to40' && !(+p.price >= 25 && +p.price <= 40)) return false;
      if (filterState.price === 'over40' && !(+p.price > 40)) return false;
      if (favOnly && !favs.has(+p.id)) return false;
      return true;
    };

    const all = PRODUCT_LIST.map(p => PRODUCTS[p.id]);
    const visible = all.filter(matches);
    const hidden  = all.filter(p => !matches(p));
    if (filterState.sort === 'low')  visible.sort((a, b) => +a.price - +b.price);
    if (filterState.sort === 'high') visible.sort((a, b) => +b.price - +a.price);
    if (filterState.sort === 'name') visible.sort((a, b) => a.title.localeCompare(b.title));

    // إظهار/إخفاء
    const visibleIds = new Set(visible.map(p => p.id));
    cardEls.forEach((el, id) => {
      const show = visibleIds.has(id);
      el.style.display = show ? '' : 'none';
      if (!show && el.classList.contains('is-flipped')) {
        el.classList.remove('is-flipped');
        clearTimeout(cardFlipTimers.get(el)); cardFlipTimers.delete(el);
      }
    });

    // إعادة ترتيب فقط إذا الترتيب فعلاً تغيّر (نقل العناصر ما بيعيد تحميل الصور)
    const wanted = [...visible, ...hidden].map(p => cardEls.get(p.id));
    const now = $$('.dono-card', productsGrid);
    if (wanted.some((el, i) => el !== now[i])) {
      const frag = document.createDocumentFragment();
      wanted.forEach(el => frag.appendChild(el));
      productsGrid.insertBefore(frag, emptyEl);
    }

    if (emptyEl) emptyEl.style.display = visible.length ? 'none' : '';

    if ($('#productCount')) {
      $('#productCount').innerHTML = `<b>${visible.length}</b> thoughtful finds <a href="#shop" class="clear-filters" data-clear-filters>Clear</a>`;
    }
    const activeCount = Number(filterState.cat !== 'All') + Number(filterState.price !== 'all') + Number(!!q);
    const countBadge = filterLaunch?.querySelector('b'); if (countBadge) countBadge.textContent = activeCount || '';

    const url = new URL(location.href);
    ['q','cat','price','sort'].forEach(k => url.searchParams.delete(k));
    if (filterState.q.trim()) url.searchParams.set('q', filterState.q.trim());
    if (filterState.cat !== 'All') url.searchParams.set('cat', filterState.cat);
    if (filterState.price !== 'all') url.searchParams.set('price', filterState.price);
    if (filterState.sort !== 'featured') url.searchParams.set('sort', filterState.sort);
    url.hash = 'shop'; history.replaceState({}, '', url);
    syncFilterControls();
  }

  const updateFilters = (closePanel = false) => { applyFilters(); if (closePanel) closeFilters(); };
  const debouncedUpdate = () => { clearTimeout(filterTimer); filterTimer = setTimeout(() => updateFilters(), 200); };

  if (shopForm) {
    shopForm.addEventListener('submit', e => {
      e.preventDefault(); e.stopPropagation();
      filterState.q = shopSearch?.value || '';
      filterState.price = shopForm.querySelector('[name="price"]:checked')?.value || 'all';
      filterState.sort = shopForm.querySelector('[name="sort"]')?.value || 'featured';
      updateFilters(true);
    }, true);
    shopForm.querySelectorAll('[name="price"], [name="sort"]').forEach(el => el.addEventListener('change', () => {
      filterState.price = shopForm.querySelector('[name="price"]:checked')?.value || 'all';
      filterState.sort = shopForm.querySelector('[name="sort"]')?.value || 'featured';
      updateFilters();
    }));
  }

  if (shopSearch) shopSearch.addEventListener('input', () => {
    filterState.q = shopSearch.value;
    if (navSearch) navSearch.value = filterState.q;
    debouncedUpdate();
  });
  if (navSearch) navSearch.addEventListener('input', () => {
    filterState.q = navSearch.value;
    if (shopSearch) shopSearch.value = filterState.q;
    debouncedUpdate();
  });

  document.addEventListener('click', e => {
    const a = e.target.closest('.side-categories a');
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    const u = new URL(a.href, location.href);
    filterState.cat = u.searchParams.get('cat') || 'All';
    updateFilters(false);
  });

  document.addEventListener('click', e => {
    if (e.target.closest('[data-clear-filters], .filter-heading a, [data-reset-filters]')) {
      e.preventDefault();
      Object.assign(filterState, { q: '', cat: 'All', price: 'all', sort: 'featured' });
      favOnly = false;
      const fb = $('#favoritesOnly');
      if (fb) { fb.classList.remove('active'); fb.setAttribute('aria-pressed', 'false'); }
      updateFilters(true);
    }
  });

  /* ===== FAVORITES (تحديث الكرت المعني فقط) ===== */
  function paintFav(id) {
    const on = favs.has(id), c = cardEls.get(id), b = c && $('[data-act=fav]', c);
    if (b) { b.classList.toggle('saved', on); b.textContent = on ? '♥' : '♡'; b.setAttribute('aria-pressed', on); }
    if (current === id) syncModalFav();
  }
  function toggleFav(id) {
    favs.has(id) ? favs.delete(id) : favs.add(id);
    store.set('dono:favs', [...favs]);
    toast(favs.has(id) ? 'Saved to favorites ♡' : 'Removed from favorites');
    paintFav(id);
    if (favOnly) applyFilters(); // نعيد الفلترة فقط إذا وضع "المفضلة فقط" شغال
  }

  const favBtn = $('#favoritesOnly');
  if (favBtn) favBtn.addEventListener('click', () => {
    favOnly = !favOnly;
    favBtn.classList.toggle('active', favOnly);
    favBtn.setAttribute('aria-pressed', favOnly);
    applyFilters();
  });

  /* ===== CARDS: قلب الكرت + رجوع تلقائي ===== */
  function toggleCardFlip(card) {
    card.classList.toggle('is-flipped');
    if (cardFlipTimers.has(card)) {
      clearTimeout(cardFlipTimers.get(card));
      cardFlipTimers.delete(card);
    }
    if (card.classList.contains('is-flipped')) {
      cardFlipTimers.set(card, setTimeout(() => {
        card.classList.remove('is-flipped');
        cardFlipTimers.delete(card);
      }, AUTO_FLIP_DELAY));
    }
  }

  if (productsGrid) {
    productsGrid.addEventListener('click', async e => {
      const card = e.target.closest('.dono-card'); if (!card) return;
      const id = +card.dataset.id, act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'fav') return toggleFav(id);
      if (act === 'flip') { toggleCardFlip(card); return; }
      if (act === 'details') { openModal(id); return; }
      if (act === 'add') {
        const b = e.target.closest('button');
        if (await addToCart(id, 1)) {
          b.classList.add('done'); b.innerHTML = 'Added <span>✓</span>';
          setTimeout(() => { b.classList.remove('done'); b.innerHTML = 'Add to bag <span>＋</span>'; }, 1200);
        }
        return;
      }
      if (!e.target.closest('button, a, input, select, textarea')) toggleCardFlip(card);
    });
  }

  /* ===== MODAL ===== */
  const modal = $('#modal');
  function openModal(id) {
    const p = PRODUCTS[id]; if (!p || !modal) return;
    current = id; qty = 1;
    if ($('#mImg')) {
      const im = $('#mImg');
      delete im.dataset.tried;
      im.dataset.fallback = p.imgFallback;
      im.decoding = 'async';
      im.src = p.img; im.alt = p.title;
    }
    if ($('#mCat')) $('#mCat').textContent = p.cat;
    if ($('#mTitle')) $('#mTitle').textContent = p.title;
    if ($('#mDesc')) $('#mDesc').textContent = p.desc;
    if ($('#mPrice')) $('#mPrice').textContent = fmt(p.price);
    if ($('#qVal')) $('#qVal').textContent = 1;
    syncModalFav();
    modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; current = null;
  }

  function syncModalFav() {
    const on = favs.has(current), b = $('#mFav');
    if (b) { b.classList.toggle('saved', on); b.textContent = on ? '♥' : '♡'; }
  }

  const setQty = n => {
    qty = Math.min(20, Math.max(1, n));
    if ($('#qVal')) $('#qVal').textContent = qty;
    if ($('#mPrice') && current) $('#mPrice').textContent = fmt(PRODUCTS[current].price * qty);
  };

  if (modal) {
    modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
    if ($('#qMinus')) $('#qMinus').onclick = () => setQty(qty - 1);
    if ($('#qPlus')) $('#qPlus').onclick  = () => setQty(qty + 1);
    if ($('#mFav')) $('#mFav').onclick   = () => toggleFav(current);
    if ($('#mAdd')) $('#mAdd').onclick   = async () => { if (await addToCart(current, qty)) { closeModal(); openDrawer(); } };
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); closeDrawer(); }
  });

  /* ===== تشغيل ===== */
  renderCart();
  buildCards();     // مرة وحدة فقط
  applyFilters();
})();