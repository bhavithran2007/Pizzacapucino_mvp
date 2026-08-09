const state = {
  bootstrap: null
};

function select(selector) {
  return document.querySelector(selector);
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

async function initializeBootstrap() {
  const bootstrap = await request('/api/public/bootstrap');

  state.bootstrap = bootstrap;

  select('#hero-subcopy').textContent = 'Choose your branch, date, and guests to request a table.';
  select('#policy-copy').textContent =
    `Bookings support ${bootstrap.bookingPolicy.minimumGuests} to ${bootstrap.bookingPolicy.maximumGuests} guests. Default reservation duration is ${bootstrap.bookingPolicy.defaultReservationDurationMinutes} minutes.`;

  populateBranches();
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
    reservationType: 'TABLE_ONLY',
    policyAccepted: select('#policyAccepted').checked,
    items: []
  };
}

function renderReservationDetails(target, reservation) {
  target.innerHTML = `
    <h3 class="headline-2">Booking ${reservation.bookingCode}</h3>
    <p>${reservation.customer.fullName}, your table request is saved for ${reservation.branch.name}.</p>
    <div class="detail-grid">
      <div><span>Date</span><strong>${reservation.reservationDate}</strong></div>
      <div><span>Time</span><strong>${reservation.arrivalTime} - ${reservation.endTime}</strong></div>
      <div><span>Guests</span><strong>${reservation.guestCount}</strong></div>
      <div><span>Status</span><strong>${reservation.bookingStatus.replace(/_/g, ' ')}</strong></div>
    </div>
  `;
}

async function submitReservation(event) {
  event.preventDefault();
  const statusBox = select('#form-status');
  const submitButton = select('#submit-button');
  const payload = buildReservationPayload();

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

    select('#availability-button').addEventListener('click', checkAvailability);
    select('#reservation-form').addEventListener('submit', submitReservation);
    select('#lookup-form').addEventListener('submit', lookupReservation);
  } catch (error) {
    setStatus(select('#form-status'), error.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', initializePage);
