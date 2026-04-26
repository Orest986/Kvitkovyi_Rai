/* ═══════════════════════════════════════
   КВІТКОВИЙ РАЙ — script.js
   ═══════════════════════════════════════ */

// ── Burger / overlay menu ──────────────
const burger     = document.getElementById('burger');
const navOverlay = document.getElementById('navOverlay');
const navClose   = document.getElementById('navClose');

function openMenu() {
  if (!navOverlay) return;
  navOverlay.classList.add('is-open');
  burger?.classList.add('is-open');
  burger?.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closeMenu() {
  if (!navOverlay) return;
  navOverlay.classList.remove('is-open');
  burger?.classList.remove('is-open');
  burger?.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}
burger?.addEventListener('click', openMenu);
navClose?.addEventListener('click', closeMenu);
navOverlay?.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
navOverlay?.addEventListener('click', e => { if (e.target === navOverlay) closeMenu(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeMenu(); closeCartModal(); closeOrderModal(); }
});

/* ═══════════════════════════════════════
   КОШИК
   ═══════════════════════════════════════ */
let cart = []; // [{ bouquet, price, qty }]

const cartTotal  = () => cart.reduce((s, i) => s + i.price * i.qty, 0);
const cartCount  = () => cart.reduce((s, i) => s + i.qty, 0);

/* -- Оновити значок кількості у всіх кнопках кошика -- */
function updateCartBadge() {
  const n = cartCount();
  document.querySelectorAll('.cart-badge').forEach(b => {
    b.textContent = n;
    b.hidden = n === 0;
  });
}

/* -- Додати товар до кошика -- */
function addToCart(card) {
  if (!card) return;
  const bouquet  = card.dataset.bouquet || 'Букет';
  const price    = Number(card.dataset.price) || 0;
  const existing = cart.find(i => i.bouquet === bouquet);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ bouquet, price, qty: 1 });
  }
  updateCartBadge();

  /* Анімація кнопки */
  const btn = card.querySelector('.btn-add-cart');
  if (btn) {
    btn.textContent = '✓ Додано';
    btn.classList.add('btn--added');
    setTimeout(() => {
      btn.textContent = 'До кошика';
      btn.classList.remove('btn--added');
    }, 1200);
  }
}

/* -- Рендер списку кошика -- */
function renderCartItems() {
  const listEl  = document.getElementById('cartList');
  const totalEl = document.getElementById('cartTotal');
  if (!listEl) return;

  if (cart.length === 0) {
    listEl.innerHTML = '<p class="cart-empty">Кошик порожній 🌸</p>';
    if (totalEl) totalEl.textContent = '';
    return;
  }

  listEl.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="cart-item__info">
        <span class="cart-item__name">${item.bouquet}</span>
        <span class="cart-item__price">${item.price.toLocaleString('uk-UA')} грн × ${item.qty} = ${(item.price * item.qty).toLocaleString('uk-UA')} грн</span>
      </div>
      <div class="cart-item__controls">
        <button class="cart-qty-btn" data-action="dec" data-idx="${idx}">−</button>
        <span class="cart-qty-val">${item.qty}</span>
        <button class="cart-qty-btn" data-action="inc" data-idx="${idx}">+</button>
        <button class="cart-remove-btn" data-idx="${idx}" aria-label="Видалити">✕</button>
      </div>
    </div>
  `).join('');

  if (totalEl) {
    totalEl.textContent = `Разом: ${cartTotal().toLocaleString('uk-UA')} грн`;
  }

  /* Обробники кнопок кількості */
  listEl.querySelectorAll('.cart-qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = +btn.dataset.idx;
      if (btn.dataset.action === 'inc') {
        cart[idx].qty++;
      } else {
        cart[idx].qty--;
        if (cart[idx].qty <= 0) cart.splice(idx, 1);
      }
      updateCartBadge();
      renderCartItems();
    });
  });

  /* Обробники кнопок видалення */
  listEl.querySelectorAll('.cart-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cart.splice(+btn.dataset.idx, 1);
      updateCartBadge();
      renderCartItems();
    });
  });
}

/* -- Формуємо рядок для форми замовлення -- */
function buildCartSummary() {
  if (cart.length === 0) return { bouquet: '', price: 0 };
  const bouquet = cart.map(i => `${i.bouquet} × ${i.qty} шт.`).join(', ');
  return { bouquet, price: cartTotal() };
}

/* ── Відкрити/закрити кошик ── */
const cartModal = document.getElementById('cartModal');

function openCartModal() {
  if (!cartModal) return;
  renderCartItems();
  cartModal.classList.add('is-open');
  cartModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}
function closeCartModal() {
  if (!cartModal) return;
  cartModal.classList.remove('is-open');
  cartModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

document.querySelectorAll('[data-open-cart]').forEach(b => b.addEventListener('click', openCartModal));
document.querySelectorAll('[data-close-cart]').forEach(b => b.addEventListener('click', closeCartModal));

/* Кнопка "Оформити замовлення" з кошика */
document.getElementById('cartCheckoutBtn')?.addEventListener('click', () => {
  if (cart.length === 0) return;
  closeCartModal();
  openOrderModal(null); // null = оформляємо з кошика
});

/* ── Кнопки "До кошика" ── */
document.querySelectorAll('.btn-add-cart').forEach(btn => {
  btn.addEventListener('click', () => addToCart(btn.closest('.product-card')));
});

/* ═══════════════════════════════════════
   ФОРМА ЗАМОВЛЕННЯ
   ═══════════════════════════════════════ */
const orderModal           = document.getElementById('orderModal');
const orderForm            = document.getElementById('orderForm');
const selectedBouquetLabel = document.getElementById('selectedBouquetLabel');
const orderBouquetInput    = document.getElementById('orderBouquet');
const orderPriceInput      = document.getElementById('orderPrice');
const orderStatusEl        = document.getElementById('orderFormStatus');

function openOrderModal(card) {
  if (!orderModal || !orderForm) return;

  /* Скидаємо форму */
  orderForm.reset();
  if (orderStatusEl) { orderStatusEl.textContent = ''; orderStatusEl.className = 'order-form__status'; }

  if (card) {
    /* Одиночне замовлення — з кнопки "Замовити" */
    const bouquet = card.dataset.bouquet || 'Букет';
    const price   = card.dataset.price   || '';
    if (orderBouquetInput) orderBouquetInput.value = bouquet;
    if (orderPriceInput)   orderPriceInput.value   = price;
    if (selectedBouquetLabel) {
      selectedBouquetLabel.textContent = price
        ? `${bouquet} — ${Number(price).toLocaleString('uk-UA')} грн`
        : bouquet;
    }
  } else {
    /* Замовлення з кошика */
    const { bouquet, price } = buildCartSummary();
    if (orderBouquetInput) orderBouquetInput.value = bouquet;
    if (orderPriceInput)   orderPriceInput.value   = price;
    if (selectedBouquetLabel) {
      selectedBouquetLabel.textContent = cart.length > 0
        ? `${bouquet} — ${price.toLocaleString('uk-UA')} грн`
        : 'Кошик порожній';
    }
  }

  showOrderThumb(card);
  orderModal.classList.add('is-open');
  orderModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  orderModal.querySelector('input[name="name"]')?.focus();
}

function closeOrderModal() {
  if (!orderModal) return;
  orderModal.classList.remove('is-open');
  orderModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

document.querySelectorAll('[data-close-order]').forEach(n => n.addEventListener('click', closeOrderModal));

/* Кнопки "Замовити" — одиночно */
document.querySelectorAll('.btn-order').forEach(btn => {
  btn.addEventListener('click', () => openOrderModal(btn.closest('.product-card')));
});

/* -- Відправка форми -- */
function showStatus(msg, type) {
  if (!orderStatusEl) return;
  orderStatusEl.textContent = msg;
  orderStatusEl.className   = `order-form__status is-${type}`;
}

if (orderForm) {
  orderForm.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(orderForm));

    /* Honeypot */
    if (data.company) { showStatus('Замовлення не пройшло перевірку.', 'error'); return; }

    /* Валідація телефону */
    data.phone = (data.phone || '').replace(/[\s\-()']/g, '');
    if (!/^\+?[0-9]{10,15}$/.test(data.phone)) {
      showStatus('Вкажіть коректний номер телефону.', 'error'); return;
    }

    /* Якщо поля доставки відсутні — встановимо порожні значення щоб server.js не падав */
    data.deliveryDate = data.deliveryDate || '0000-00-00';
    data.deliveryTime = data.deliveryTime || '00:00';
    data.address      = data.address      || 'уточнити при дзвінку';

    const submitBtn = orderForm.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Надсилаємо...'; }

    try {
      const res    = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok || !result.ok) throw new Error(result.message || 'Помилка сервера.');

      showStatus('✅ Дякуємо! Замовлення прийнято. Ми зателефонуємо для підтвердження.', 'success');
      cart = [];
      updateCartBadge();
      orderForm.reset();
      setTimeout(closeOrderModal, 2200);
    } catch (err) {
      showStatus(err.message || 'Сталася помилка. Спробуйте ще раз.', 'error');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Підтвердити замовлення'; }
    }
  });
}

/* ── Back to top ──────────────────────── */
const backTopBtn = document.getElementById('backTopBtn');
if (backTopBtn) {
  window.addEventListener('scroll', () => {
    backTopBtn.classList.toggle('is-visible', window.scrollY > 400);
  }, { passive: true });
  backTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ── "Детальніше" — розгортання панелі ── */
document.querySelectorAll('.btn-details').forEach(btn => {
  btn.addEventListener('click', () => {
    const targetId = btn.dataset.detail;
    const panel    = document.getElementById(targetId);
    if (!panel) return;
    const isOpen = panel.classList.contains('is-open');

    // Закрити всі інші
    document.querySelectorAll('.offer-detail.is-open').forEach(p => {
      p.classList.remove('is-open');
      const b = document.querySelector(`[data-detail="${p.id}"]`);
      if (b) b.classList.remove('is-open');
    });

    if (!isOpen) {
      panel.classList.add('is-open');
      btn.classList.add('is-open');
    }
  });
});

/* ── Показ мініатюри букету у модалці ─── */
function showOrderThumb(card) {
  const thumb     = document.getElementById('orderModalThumb');
  const thumbImg  = document.getElementById('orderModalThumbImg');
  const thumbName = document.getElementById('orderModalThumbName');
  const thumbPrice= document.getElementById('orderModalThumbPrice');
  if (!thumb) return;

  if (card) {
    const img  = card.querySelector('.image-wrap img, .frame img');
    const name = card.dataset.bouquet || '';
    const price= card.dataset.price   || '';
    if (img && name) {
      thumbImg.src        = img.src;
      thumbName.textContent = name;
      thumbPrice.textContent = price ? `${Number(price).toLocaleString('uk-UA')} грн` : '';
      thumb.style.display = 'flex';
      return;
    }
  }

  // Кошик — показуємо перший елемент
  if (cart.length > 0) {
    const first = cart[0];
    // Шукаємо зображення за назвою
    const cardEl = [...document.querySelectorAll('.product-card')]
      .find(c => c.dataset.bouquet === first.bouquet);
    const img = cardEl?.querySelector('.image-wrap img, .frame img');
    thumbImg.src          = img?.src || '';
    thumbName.textContent = cart.length === 1 ? first.bouquet : `${cart.length} букети у кошику`;
    thumbPrice.textContent = `${cartTotal().toLocaleString('uk-UA')} грн`;
    thumb.style.display   = 'flex';
  } else {
    thumb.style.display = 'none';
  }
}
