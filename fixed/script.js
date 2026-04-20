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
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeMenu(); closeOrderModal(); } });

// ═══════════════════════════════════════
//   КОШИК (cart)
// ═══════════════════════════════════════
let cart = [];   // [{bouquet, price, qty}]

function cartTotal() {
  return cart.reduce((s, i) => s + i.price * i.qty, 0);
}
function cartCount() {
  return cart.reduce((s, i) => s + i.qty, 0);
}

function updateCartBadge() {
  document.querySelectorAll('.cart-badge').forEach(b => {
    const n = cartCount();
    b.textContent = n;
    b.hidden = n === 0;
  });
}

function renderCartItems() {
  const list = document.getElementById('cartList');
  const total = document.getElementById('cartTotal');
  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = '<p class="cart-empty">Кошик порожній</p>';
    if (total) total.textContent = '';
    return;
  }

  list.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="cart-item__info">
        <span class="cart-item__name">${item.bouquet}</span>
        <span class="cart-item__price">${item.price} грн × ${item.qty}</span>
      </div>
      <div class="cart-item__controls">
        <button class="cart-qty-btn" data-action="dec" data-idx="${idx}">−</button>
        <span class="cart-qty-val">${item.qty}</span>
        <button class="cart-qty-btn" data-action="inc" data-idx="${idx}">+</button>
        <button class="cart-remove-btn" data-idx="${idx}" aria-label="Видалити">✕</button>
      </div>
    </div>
  `).join('');

  if (total) total.textContent = `Разом: ${cartTotal().toLocaleString('uk-UA')} грн`;

  list.querySelectorAll('.cart-qty-btn').forEach(btn => {
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
      syncCartOrderSummary();
    });
  });
  list.querySelectorAll('.cart-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cart.splice(+btn.dataset.idx, 1);
      updateCartBadge();
      renderCartItems();
      syncCartOrderSummary();
    });
  });
}

function syncCartOrderSummary() {
  const el = document.getElementById('cartOrderSummary');
  if (!el) return;
  if (cart.length === 0) {
    el.textContent = 'Кошик порожній';
    return;
  }
  el.textContent = cart.map(i => `${i.bouquet} × ${i.qty}`).join(', ') + ` — ${cartTotal().toLocaleString('uk-UA')} грн`;
}

function addToCart(card) {
  const bouquet = card?.dataset?.bouquet || 'Букет';
  const price   = +(card?.dataset?.price  || 0);
  const existing = cart.find(i => i.bouquet === bouquet);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ bouquet, price, qty: 1 });
  }
  updateCartBadge();

  // Показати анімацію "Додано"
  const btn = card?.querySelector('.btn-add-cart');
  if (btn) {
    btn.textContent = '✓ Додано';
    btn.classList.add('btn--added');
    setTimeout(() => { btn.textContent = 'До кошика'; btn.classList.remove('btn--added'); }, 1200);
  }
}

// ── Cart modal ─────────────────────────
const cartModal    = document.getElementById('cartModal');
const cartOpenBtns = document.querySelectorAll('[data-open-cart]');
const cartCloseBtns= document.querySelectorAll('[data-close-cart]');

function openCartModal() {
  if (!cartModal) return;
  renderCartItems();
  syncCartOrderSummary();
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

cartOpenBtns.forEach(b => b.addEventListener('click', openCartModal));
cartCloseBtns.forEach(b => b.addEventListener('click', closeCartModal));
cartModal?.querySelector('.order-modal__backdrop')?.addEventListener('click', closeCartModal);

// "Оформити замовлення" з кошика → переходить до форми
document.getElementById('cartCheckoutBtn')?.addEventListener('click', () => {
  if (cart.length === 0) return;
  closeCartModal();
  openOrderModal(null);   // null = кошик
});

// ── Add-to-cart buttons ────────────────
document.querySelectorAll('.btn-add-cart').forEach(btn => {
  btn.addEventListener('click', () => addToCart(btn.closest('.product-card')));
});

// Кнопка "Замовити" (одразу форма, без кошика)
document.querySelectorAll('.btn-order').forEach(btn => {
  btn.addEventListener('click', () => openOrderModal(btn.closest('.product-card')));
});

// ═══════════════════════════════════════
//   ORDER MODAL
// ═══════════════════════════════════════
const orderModal           = document.getElementById('orderModal');
const orderForm            = document.getElementById('orderForm');
const selectedBouquetLabel = document.getElementById('selectedBouquetLabel');
const orderBouquet         = document.getElementById('orderBouquet');
const orderPrice           = document.getElementById('orderPrice');
const orderStatus          = document.getElementById('orderFormStatus');

function openOrderModal(card) {
  if (!orderModal || !orderForm) return;

  orderStatus.textContent = '';
  orderStatus.className   = 'order-form__status';
  orderForm.reset();

  if (card) {
    // Одиночне замовлення
    const bouquet = card.dataset.bouquet || 'Букет';
    const price   = card.dataset.price   || '';
    orderBouquet.value = bouquet;
    orderPrice.value   = price;
    if (selectedBouquetLabel)
      selectedBouquetLabel.textContent = price ? `${bouquet} — ${price} грн` : bouquet;
    orderBouquet.value = bouquet;
    orderPrice.value   = price;
  } else {
    // Замовлення з кошика
    const summary = cart.map(i => `${i.bouquet} × ${i.qty}`).join(', ');
    const total   = cartTotal();
    orderBouquet.value = summary;
    orderPrice.value   = total;
    if (selectedBouquetLabel)
      selectedBouquetLabel.textContent = `${summary} — ${total.toLocaleString('uk-UA')} грн`;
  }

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

function showStatus(msg, type) {
  if (!orderStatus) return;
  orderStatus.textContent = msg;
  orderStatus.className   = `order-form__status is-${type}`;
}

if (orderForm) {
  orderForm.addEventListener('submit', async e => {
    e.preventDefault();
    const data    = Object.fromEntries(new FormData(orderForm));
    if (data.company) { showStatus('Замовлення не пройшло перевірку.', 'error'); return; }

    data.phone = (data.phone || '').replace(/[\s\-()]/g, '');
    if (!/^\+?[0-9]{10,15}$/.test(data.phone)) {
      showStatus('Вкажіть коректний номер телефону.', 'error'); return;
    }

    const submitBtn = orderForm.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Надсилаємо...'; }

    try {
      const res  = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok || !result.ok) throw new Error(result.message || 'Помилка.');
      showStatus(result.message || 'Дякуємо! Замовлення прийнято.', 'success');
      cart = [];
      updateCartBadge();
      orderForm.reset();
      setTimeout(closeOrderModal, 1800);
    } catch (err) {
      showStatus(err.message || 'Сталася помилка.', 'error');
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Підтвердити замовлення'; }
    }
  });
}
