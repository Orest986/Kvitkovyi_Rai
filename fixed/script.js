// ── Burger / overlay menu ──
const burger     = document.getElementById('burger');
const navOverlay = document.getElementById('navOverlay');
const navClose   = document.getElementById('navClose');

function openMenu() {
  if (!navOverlay) return;
  navOverlay.classList.add('is-open');
  burger && burger.classList.add('is-open');
  burger && burger.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closeMenu() {
  if (!navOverlay) return;
  navOverlay.classList.remove('is-open');
  burger && burger.classList.remove('is-open');
  burger && burger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

if (burger)   burger.addEventListener('click', openMenu);
if (navClose) navClose.addEventListener('click', closeMenu);
if (navOverlay) {
  navOverlay.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  navOverlay.addEventListener('click', e => { if (e.target === navOverlay) closeMenu(); });
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

const orderModal = document.getElementById('orderModal');
const orderForm = document.getElementById('orderForm');
const selectedBouquetLabel = document.getElementById('selectedBouquetLabel');
const orderBouquet = document.getElementById('orderBouquet');
const orderPrice = document.getElementById('orderPrice');
const orderStatus = document.getElementById('orderFormStatus');

function openOrderModal(card) {
  if (!orderModal || !orderForm) return;
  const bouquet = card?.dataset?.bouquet || 'Букет не вказано';
  const price = card?.dataset?.price || '';
  orderBouquet.value = bouquet;
  orderPrice.value = price;
  selectedBouquetLabel.textContent = price ? `${bouquet} — ${price} грн` : bouquet;
  orderStatus.textContent = '';
  orderStatus.className = 'order-form__status';
  orderForm.reset();
  orderBouquet.value = bouquet;
  orderPrice.value = price;
  orderModal.classList.add('is-open');
  orderModal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeOrderModal() {
  if (!orderModal) return;
  orderModal.classList.remove('is-open');
  orderModal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

document.querySelectorAll('.btn-order').forEach(button => {
  button.addEventListener('click', () => openOrderModal(button.closest('.product-card')));
});

document.querySelectorAll('[data-close-order]').forEach(node => {
  node.addEventListener('click', closeOrderModal);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeOrderModal();
});

function showStatus(message, type) {
  if (!orderStatus) return;
  orderStatus.textContent = message;
  orderStatus.className = `order-form__status is-${type}`;
}

function normalizePhone(phone) {
  return phone.replace(/[\s\-()]/g, '');
}

if (orderForm) {
  orderForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const formData = new FormData(orderForm);
    const payload = Object.fromEntries(formData.entries());

    if (payload.company) {
      showStatus('Замовлення не пройшло перевірку.', 'error');
      return;
    }

    payload.phone = normalizePhone(payload.phone || '');

    if (!/^\+?[0-9]{10,15}$/.test(payload.phone)) {
      showStatus('Вкажіть коректний номер телефону.', 'error');
      return;
    }

    const submitButton = orderForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Надсилаємо...';
    }

    try {
      const response = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'Не вдалося надіслати замовлення.');
      }

      showStatus(result.message || 'Дякуємо! Замовлення успішно відправлено.', 'success');
      orderForm.reset();
      setTimeout(() => {
        closeOrderModal();
      }, 1600);
    } catch (error) {
      showStatus(error.message || 'Сталася помилка під час відправки замовлення.', 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Підтвердити замовлення';
      }
    }
  });
}
