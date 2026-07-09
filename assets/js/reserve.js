const state = {
  bootstrap: null,
  menuItems: [],
  selectedItems: new Map()
};

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2
});

function select(selector) {
  return document.querySelector(selector);
}

function getReservationType() {
  return document.querySelector('input[name="reservationType"]:checked')?.value || 'TABLE_ONLY';
}

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function setStatus(element, message, type) {
  if (!element) {
    return;
  }

  element.textContent = message || '';
  element.className = `status-box${type ? ` ${type}` : ''}`;
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Request failed.');
  }

  return payload;
}

function getSelectedItems() {
  return state.menuItems
    .map((item) => ({
      menuItemId: item.id,
      quantity: Number(state.selectedItems.get(item.id) || 0)
    }))
    .filter((item) => item.quantity > 0);
}

function calculateSummary() {
  const selectedItems = getSelectedItems();
  const subtotal = selectedItems.reduce((total, selectedItem) => {
    const menuItem = state.menuItems.find((item) => item.id === selectedItem.menuItemId);
    return total + Number(menuItem?.price || 0) * selectedItem.quantity;
  }, 0);
  const advancePercentage = Number(state.bootstrap?.bookingPolicy?.advancePaymentPercentage || 50);
  const advanceDue = getReservationType() === 'TABLE_WITH_PREORDER' ? (subtotal * advancePercentage) / 100 : 0;
  const balanceDue = getReservationType() === 'TABLE_WITH_PREORDER' ? subtotal - advanceDue : 0;

  return {
    subtotal,
    advancePercentage,
    advanceDue,
    balanceDue,
    selectedItems
  };
}

function renderSummary() {
  const summary = calculateSummary();
  select('#selected-count').textContent = String(summary.selectedItems.length);
  select('#subtotal-amount').textContent = formatCurrency(summary.subtotal);
  select('#advance-amount').textContent = formatCurrency(summary.advanceDue);
  select('#balance-amount').textContent = formatCurrency(summary.balanceDue);
  select('#payment-pill').textContent =
    getReservationType() === 'TABLE_WITH_PREORDER'
      ? `Advance ${summary.advancePercentage}% required`
      : 'No advance payment required';
}

function renderMenuItems() {
  const menuContainer = select('#menu-list');

  menuContainer.innerHTML = state.menuItems
    .map(
      (item) => `
        <article class="menu-item-card">
          <img src="${item.imageUrl}" alt="${item.name}">
          <div class="menu-item-copy">
            <h3>${item.name}</h3>
            <p>${item.description || ''}</p>
            <div class="menu-meta">
              <span class="menu-chip">${item.category}</span>
              <span class="menu-chip">${item.dietaryType.replace('_', ' ')}</span>
              <span class="menu-chip">${formatCurrency(item.price)}</span>
            </div>
          </div>
          <div class="qty-box">
            <label class="field-label" for="qty-${item.id}">Quantity</label>
            <input class="input-field item-qty-input" id="qty-${item.id}" type="number" min="0" max="20" value="0" data-menu-id="${item.id}">
          </div>
        </article>
      `
    )
    .join('');

  menuContainer.querySelectorAll('.item-qty-input').forEach((input) => {
    input.addEventListener('input', () => {
      const quantity = Math.max(0, Math.min(20, Number(input.value || 0)));
      input.value = String(quantity);
      state.selectedItems.set(input.dataset.menuId, quantity);
      renderSummary();
    });
  });
}

function populateBranches() {
  const branchSelect = select('#branchId');
  const lookupBranchNotes = select('#branch-notes');

  branchSelect.innerHTML = [
    '<option value="">Select a branch</option>',
    ...state.bootstrap.branches.map(
      (branch) =>
        `<option value="${branch.id}">${branch.name} (${branch.opensAt} - ${branch.closesAt})</option>`
    )
  ].join('');

  lookupBranchNotes.innerHTML = state.bootstrap.branches
    .map(
      (branch) =>
        `<div><span>${branch.name}</span><strong>${branch.phone || 'Phone unavailable'}</strong></div>`
    )
    .join('');
}

function togglePreorderPanel() {
  const preorderActive = getReservationType() === 'TABLE_WITH_PREORDER';
  select('#menu-panel').classList.toggle('active', preorderActive);
  renderSummary();
}

async function initializeBootstrap() {
  const [bootstrap, menuPayload] = await Promise.all([
    request('/api/public/bootstrap'),
    request('/api/public/menu')
  ]);

  state.bootstrap = bootstrap;
  state.menuItems = menuPayload.items;

  select('#hero-subcopy').textContent =
    `Choose your branch, date, guests, and ${bootstrap.manualPayment.provider === 'MANUAL_UPI_QR' ? 'optional preorder' : 'preorder'} in one flow.`;
  select('#policy-copy').textContent =
    `Bookings support ${bootstrap.bookingPolicy.minimumGuests} to ${bootstrap.bookingPolicy.maximumGuests} guests. Default reservation duration is ${bootstrap.bookingPolicy.defaultReservationDurationMinutes} minutes.`;
  select('#manual-payment-copy').textContent =
    `If you preorder, pay the advance using our GPay or UPI QR and send the screenshot to ${bootstrap.manualPayment.whatsappNumber}. Screenshot files are not stored on this site.`;

  populateBranches();
  renderMenuItems();
  renderSummary();
}

function buildAvailabilityPayload() {
  return {
    branchId: select('#branchId').value,
    date: select('#date').value,
    arrivalTime: select('#arrivalTime').value,
    endTime: select('#endTime').value,
    guestCount: Number(select('#guestCount').value || 0)
  };
}

async function checkAvailability() {
  const card = select('#availability-result');
  setStatus(card, 'Checking availability...', '');

  try {
    const params = new URLSearchParams(buildAvailabilityPayload());
    const availability = await request(`/api/public/availability?${params.toString()}`);
    const suggestionText = availability.suggestions.length
      ? ` Suggested times: ${availability.suggestions
          .map((slot) => `${slot.arrivalTime}-${slot.endTime}`)
          .join(', ')}.`
      : '';

    setStatus(
      card,
      `${availability.message} Remaining seats: ${availability.remainingSeats}/${availability.branch.totalSeats}.${suggestionText}`,
      availability.available ? 'success' : 'error'
    );
  } catch (error) {
    setStatus(card, error.message, 'error');
  }
}

function buildReservationPayload() {
  return {
    fullName: select('#fullName').value.trim(),
    mobileNumber: select('#mobileNumber').value.trim(),
    altMobileNumber: select('#altMobileNumber').value.trim(),
    email: select('#email').value.trim(),
    guestCount: Number(select('#guestCount').value || 0),
    branchId: select('#branchId').value,
    date: select('#date').value,
    arrivalTime: select('#arrivalTime').value,
    endTime: select('#endTime').value,
    specialRequests: select('#specialRequests').value.trim(),
    occasion: select('#occasion').value,
    reservationType: getReservationType(),
    policyAccepted: select('#policyAccepted').checked,
    items: getSelectedItems()
  };
}

function renderReservationDetails(target, reservation) {
  target.innerHTML = `
    <div class="payment-pill">${reservation.paymentStatus.replace(/_/g, ' ')}</div>
    <h3 class="headline-2">Booking ${reservation.bookingCode}</h3>
    <p>${reservation.customer.fullName}, your table request is saved for ${reservation.branch.name}.</p>
    <div class="detail-grid">
      <div><span>Date</span><strong>${reservation.reservationDate}</strong></div>
      <div><span>Time</span><strong>${reservation.arrivalTime} - ${reservation.endTime}</strong></div>
      <div><span>Guests</span><strong>${reservation.guestCount}</strong></div>
      <div><span>Status</span><strong>${reservation.bookingStatus.replace(/_/g, ' ')}</strong></div>
      <div><span>Reservation Type</span><strong>${reservation.reservationType.replace(/_/g, ' ')}</strong></div>
      <div><span>Advance Due</span><strong>${formatCurrency(reservation.advanceDue)}</strong></div>
    </div>
    ${
      reservation.items.length
        ? `<div class="qr-box"><strong>Pre-ordered Dishes</strong><p class="muted-copy">${reservation.items
            .map((item) => `${item.itemName} x ${item.quantity}`)
            .join(', ')}</p></div>`
        : ''
    }
    ${
      reservation.paymentInstructions
        ? `<div class="qr-box">
            <strong>Manual payment instructions</strong>
            <p class="muted-copy">${reservation.paymentInstructions.instructions}</p>
            <p class="muted-copy">Send the screenshot to WhatsApp: <strong>${reservation.paymentInstructions.whatsappNumber}</strong></p>
            ${
              reservation.paymentInstructions.qrImageUrl
                ? `<img src="${reservation.paymentInstructions.qrImageUrl}" alt="UPI QR code">`
                : '<p class="muted-copy">Add `PUBLIC_UPI_QR_URL` in your environment to display the QR code here.</p>'
            }
          </div>`
        : ''
    }
  `;
}

async function submitReservation(event) {
  event.preventDefault();
  const statusBox = select('#form-status');
  const submitButton = select('#submit-button');
  const payload = buildReservationPayload();

  if (payload.reservationType === 'TABLE_WITH_PREORDER' && payload.items.length === 0) {
    setStatus(statusBox, 'Choose at least one dish when using Reserve Table + Pre-order Food.', 'error');
    return;
  }

  setStatus(statusBox, 'Submitting your reservation...', '');
  submitButton.disabled = true;

  try {
    const response = await request('/api/public/reservations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    setStatus(statusBox, 'Reservation created successfully.', 'success');
    renderReservationDetails(select('#confirmation-card'), response.reservation);
    select('#confirmation-card').classList.remove('hide');
    select('#confirmation-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    setStatus(statusBox, error.message, 'error');
  } finally {
    submitButton.disabled = false;
  }
}

async function lookupReservation(event) {
  event.preventDefault();
  const bookingCode = select('#lookupBookingCode').value.trim();
  const phone = select('#lookupPhone').value.trim();
  const result = select('#lookup-result');

  setStatus(result, 'Checking your booking...', '');

  try {
    const response = await request(
      `/api/public/reservations/${encodeURIComponent(bookingCode)}?phone=${encodeURIComponent(phone)}`
    );
    result.className = 'lookup-result';
    renderReservationDetails(result, response.reservation);
  } catch (error) {
    setStatus(result, error.message, 'error');
  }
}

function applyDateDefaults() {
  const dateInput = select('#date');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  dateInput.min = today;
  dateInput.value = today;

  if (!select('#arrivalTime').value) {
    select('#arrivalTime').value = '19:00';
  }

  if (!select('#endTime').value) {
    select('#endTime').value = '21:00';
  }
}

async function initializePage() {
  try {
    applyDateDefaults();
    await initializeBootstrap();
    document.querySelectorAll('input[name="reservationType"]').forEach((input) => {
      input.addEventListener('change', togglePreorderPanel);
    });
    togglePreorderPanel();

    select('#availability-button').addEventListener('click', checkAvailability);
    select('#reservation-form').addEventListener('submit', submitReservation);
    select('#lookup-form').addEventListener('submit', lookupReservation);
  } catch (error) {
    setStatus(select('#form-status'), error.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', initializePage);
