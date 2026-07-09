(function () {
  const page = document.body.dataset.page;
  const state = {
    admin: null,
    dashboard: null,
    branches: [],
    reservations: [],
    payments: [],
    orders: [],
    menuItems: [],
    notifications: [],
    settings: null,
    analytics: null,
    calendar: null,
    filters: {
      reservations: {
        page: 1,
        limit: 10,
        search: '',
        status: '',
        branchId: '',
        paymentStatus: '',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      },
      payments: {
        page: 1,
        limit: 10,
        search: '',
        status: '',
        branchId: ''
      },
      orders: {
        page: 1,
        limit: 10,
        branchId: '',
        status: ''
      },
      menu: {
        search: '',
        category: ''
      }
    },
    pagination: {
      reservations: { page: 1, totalPages: 1, total: 0 },
      payments: { page: 1, totalPages: 1, total: 0 },
      orders: { page: 1, totalPages: 1, total: 0 }
    },
    menuEditingId: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  async function request(path, options = {}) {
    const isFormData = options.body instanceof FormData;
    const headers = isFormData
      ? { ...(options.headers || {}) }
      : { 'Content-Type': 'application/json', ...(options.headers || {}) };

    const response = await fetch(path, {
      credentials: 'include',
      ...options,
      headers
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.message || 'Request failed.');
    }

    return payload;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function titleize(value) {
    return String(value || '')
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  function currency(value) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(Number(value || 0));
  }

  function setBanner(elementId, message, type) {
    const banner = byId(elementId);

    if (!banner) {
      return;
    }

    if (!message) {
      banner.className = 'banner hide';
      banner.textContent = '';
      return;
    }

    banner.className = `banner ${type || ''}`;
    banner.textContent = message;
  }

  function renderStatusPill(value) {
    return `<span class="status-pill ${String(value || '').toLowerCase()}">${escapeHtml(titleize(value))}</span>`;
  }

  async function setupLoginPage() {
    const form = byId('login-form');
    const button = byId('login-button');
    const status = byId('status');

    try {
      await request('/api/auth/me');
      window.location.href = '/admin';
      return;
    } catch (error) {
      status.textContent = '';
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      status.classList.remove('error');
      status.textContent = 'Signing in...';
      button.disabled = true;

      const formData = new FormData(form);

      try {
        await request('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            username: String(formData.get('username') || '').trim(),
            password: String(formData.get('password') || '')
          })
        });
        status.textContent = 'Signed in. Redirecting...';
        window.location.href = '/admin';
      } catch (error) {
        status.classList.add('error');
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
  }

  async function loadAdminContext() {
    const { admin } = await request('/api/auth/me');
    state.admin = admin;
    byId('welcome-copy').textContent = `${admin.fullName} - ${titleize(admin.role)} - ${admin.username}`;
  }

  function renderDashboard() {
    if (!state.dashboard) {
      return;
    }

    const cards = [
      ['Today\'s Bookings', state.dashboard.cards.todayBookings],
      ['Pending Reservations', state.dashboard.cards.pendingReservations],
      ['Approved Reservations', state.dashboard.cards.approvedReservations],
      ['Cancelled Reservations', state.dashboard.cards.cancelledReservations],
      ['Revenue Collected', currency(state.dashboard.cards.revenueCollected)],
      ['Pending Payments', state.dashboard.cards.pendingPayments],
      ['Pre-order Orders', state.dashboard.cards.preorderOrders],
      ['Unread Notifications', state.dashboard.cards.unreadNotifications],
      ['Total Reservations', state.dashboard.cards.totalReservations]
    ];

    byId('dashboard-cards').innerHTML = cards
      .map(
        ([label, value]) =>
          `<div class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`
      )
      .join('');

    byId('branch-stats').innerHTML = state.dashboard.branchReservations.length
      ? state.dashboard.branchReservations
          .map(
            (branch) => `
              <div class="branch-stat">
                <strong>${escapeHtml(branch.branchName)}</strong>
                <span>${branch.reservationCount} reservations</span>
                <small>${branch.totalSeats} seats - ${branch.totalTables} tables - ${branch.isActive ? 'Active' : 'Inactive'}</small>
              </div>
            `
          )
          .join('')
      : '<div class="empty-state">No branch data available yet.</div>';

    byId('recent-bookings').innerHTML = state.dashboard.recentReservations.length
      ? state.dashboard.recentReservations
          .map(
            (reservation) => `
              <div class="recent-booking">
                <strong>${escapeHtml(reservation.bookingCode)} - ${escapeHtml(reservation.customerName)}</strong>
                <span>${escapeHtml(reservation.branchName)} - ${escapeHtml(reservation.reservationDate)} - ${escapeHtml(reservation.arrivalTime)}-${escapeHtml(reservation.endTime)}</span>
                <small>${reservation.guests} guests - ${titleize(reservation.bookingStatus)} - ${titleize(reservation.paymentStatus)}</small>
              </div>
            `
          )
          .join('')
      : '<div class="empty-state">No recent bookings found.</div>';

    const notificationPreview = state.notifications.slice(0, 4);
    byId('notification-preview').innerHTML = notificationPreview.length
      ? notificationPreview
          .map(
            (notification) => `
              <div class="branch-stat">
                <strong>${escapeHtml(notification.title)}</strong>
                <span>${escapeHtml(notification.message)}</span>
              </div>
            `
          )
          .join('')
      : '<div class="empty-state">No notifications right now.</div>';
  }

  function renderReservations() {
    const tbody = byId('reservation-tbody');
    const pagination = state.pagination.reservations;

    tbody.innerHTML = state.reservations.length
      ? state.reservations
          .map(
            (reservation) => `
              <tr>
                <td>${escapeHtml(reservation.bookingCode)}</td>
                <td>
                  <strong>${escapeHtml(reservation.customerName)}</strong><br>
                  <span>${escapeHtml(reservation.phone)}</span><br>
                  <span>${escapeHtml(reservation.email || 'No email')}</span>
                </td>
                <td>${escapeHtml(reservation.branchName)}</td>
                <td>${escapeHtml(reservation.reservationDate)}<br><span>${escapeHtml(reservation.arrivalTime)}-${escapeHtml(reservation.endTime)}</span></td>
                <td>${escapeHtml(reservation.guests)}</td>
                <td>${escapeHtml(titleize(reservation.reservationType))}</td>
                <td>${renderStatusPill(reservation.paymentStatus)}</td>
                <td>${renderStatusPill(reservation.bookingStatus)}</td>
                <td>${escapeHtml(reservation.createdAt)}</td>
                <td>
                  <div class="row-actions">
                    <button class="row-action" data-action="view" data-id="${reservation.id}">View</button>
                    <button class="row-action" data-action="approve" data-id="${reservation.id}">Approve</button>
                    <button class="row-action" data-action="reject" data-id="${reservation.id}">Reject</button>
                    <button class="row-action" data-action="cancel" data-id="${reservation.id}">Cancel</button>
                    <button class="row-action" data-action="complete" data-id="${reservation.id}">Complete</button>
                    <button class="row-action" data-action="delete" data-id="${reservation.id}">Delete</button>
                  </div>
                </td>
              </tr>
            `
          )
          .join('')
      : '<tr><td colspan="10"><div class="empty-state">No reservations match the current filters.</div></td></tr>';

    byId('reservation-pagination-copy').textContent = `Page ${pagination.page} of ${pagination.totalPages} - ${pagination.total} total reservations`;
    byId('prev-page').disabled = pagination.page <= 1;
    byId('next-page').disabled = pagination.page >= pagination.totalPages;
  }

  function renderPayments() {
    const tbody = byId('payment-tbody');

    tbody.innerHTML = state.payments.length
      ? state.payments
          .map(
            (payment) => `
              <tr>
                <td>${escapeHtml(payment.bookingCode)}</td>
                <td>
                  <strong>${escapeHtml(payment.customerName)}</strong><br>
                  <span>${escapeHtml(payment.customerPhone)}</span>
                </td>
                <td>${escapeHtml(payment.branchName)}</td>
                <td>${escapeHtml(currency(payment.amount))}</td>
                <td>${escapeHtml(payment.transactionRef || 'Not added')}</td>
                <td>${renderStatusPill(payment.status)}</td>
                <td>${escapeHtml(payment.createdAt)}</td>
                <td>
                  <div class="row-actions">
                    <button class="row-action" data-payment-action="paid" data-id="${payment.id}">Mark Paid</button>
                    <button class="row-action" data-payment-action="failed" data-id="${payment.id}">Mark Failed</button>
                    <button class="row-action" data-payment-action="awaiting_confirmation" data-id="${payment.id}">Set Pending</button>
                    <button class="row-action" data-payment-action="refunded" data-id="${payment.id}">Refunded</button>
                  </div>
                </td>
              </tr>
            `
          )
          .join('')
      : '<tr><td colspan="8"><div class="empty-state">No payments found.</div></td></tr>';
  }

  function renderOrders() {
    const tbody = byId('order-tbody');

    tbody.innerHTML = state.orders.length
      ? state.orders
          .map(
            (order) => `
              <tr>
                <td>${escapeHtml(order.bookingCode)}<br><span>${escapeHtml(order.reservationDate)} ${escapeHtml(order.arrivalTime)}</span></td>
                <td>${escapeHtml(order.customerName)}</td>
                <td>${escapeHtml(order.branchName)}</td>
                <td>${escapeHtml(order.items.map((item) => `${item.itemName} x ${item.quantity}`).join(', '))}</td>
                <td>${escapeHtml(currency(order.subtotal))}</td>
                <td>${escapeHtml(currency(order.advanceDue))}</td>
                <td>${escapeHtml(currency(order.balanceDue))}</td>
                <td>${renderStatusPill(order.bookingStatus)}</td>
              </tr>
            `
          )
          .join('')
      : '<tr><td colspan="8"><div class="empty-state">No preorder orders found.</div></td></tr>';
  }

  function renderBranches() {
    const branchGrid = byId('branch-grid');

    branchGrid.innerHTML = state.branches
      .map(
        (branch) => `
          <article class="branch-editor">
            <h3>${escapeHtml(branch.name)}</h3>
            <span>${escapeHtml(branch.addressLine1)}${branch.city ? ` - ${escapeHtml(branch.city)}` : ''}</span>
            <form data-branch-id="${branch.id}">
              <div class="compact-grid">
                <label class="field">
                  <span>Tables</span>
                  <input name="totalTables" type="number" min="0" max="500" value="${branch.totalTables}" required>
                </label>
                <label class="field">
                  <span>Seats</span>
                  <input name="totalSeats" type="number" min="0" max="2000" value="${branch.totalSeats}" required>
                </label>
              </div>
              <div class="compact-grid">
                <label class="field">
                  <span>Opens At</span>
                  <input name="opensAt" type="time" value="${escapeHtml(branch.opensAt || '10:00')}" required>
                </label>
                <label class="field">
                  <span>Closes At</span>
                  <input name="closesAt" type="time" value="${escapeHtml(branch.closesAt || '23:00')}" required>
                </label>
              </div>
              <label class="field">
                <span>Phone</span>
                <input name="phone" type="text" value="${escapeHtml(branch.phone || '')}">
              </label>
              <label class="checkbox">
                <input name="isActive" type="checkbox" ${branch.isActive ? 'checked' : ''}>
                <span>Branch is active for new reservations</span>
              </label>
              <div class="button-row">
                <button class="button primary" type="submit">Save Branch</button>
              </div>
            </form>
            <span>${branch.reservationCount} reservations recorded</span>
          </article>
        `
      )
      .join('');

    branchGrid.querySelectorAll('form[data-branch-id]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const branchId = form.dataset.branchId;
        const formData = new FormData(form);

        try {
          await request(`/api/admin/branches/${branchId}`, {
            method: 'PATCH',
            body: JSON.stringify({
              totalTables: Number(formData.get('totalTables') || 0),
              totalSeats: Number(formData.get('totalSeats') || 0),
              opensAt: String(formData.get('opensAt') || ''),
              closesAt: String(formData.get('closesAt') || ''),
              phone: String(formData.get('phone') || '').trim() || null,
              isActive: form.querySelector('[name="isActive"]').checked
            })
          });
          setBanner('branch-banner', 'Branch updated successfully.', 'success');
          await Promise.all([loadBranches(), loadDashboard()]);
        } catch (error) {
          setBanner('branch-banner', error.message, 'error');
        }
      });
    });
  }

  function renderCalendar() {
    if (!state.calendar) {
      return;
    }

    byId('calendar-range').textContent = `${titleize(state.calendar.period)} view: ${state.calendar.startDate} to ${state.calendar.endDate}`;
    byId('calendar-groups').innerHTML = state.calendar.groups.length
      ? state.calendar.groups
          .map(
            (group) => `
              <div class="branch-stat">
                <strong>${escapeHtml(group.dateLabel)}</strong>
                <div class="stack" style="margin-top: 12px;">
                  ${group.reservations
                    .map(
                      (reservation) => `
                        <div class="recent-booking">
                          <strong>${escapeHtml(reservation.bookingCode)} - ${escapeHtml(reservation.customerName)}</strong>
                          <span>${escapeHtml(reservation.branchName)} - ${escapeHtml(reservation.arrivalTime)}-${escapeHtml(reservation.endTime)} - ${reservation.guests} guests</span>
                        </div>
                      `
                    )
                    .join('')}
                </div>
              </div>
            `
          )
          .join('')
      : '<div class="empty-state">No bookings in the selected calendar range.</div>';
  }

  function renderMenu() {
    const container = byId('menu-items');
    const categories = [...new Set(state.menuItems.map((item) => item.category))].sort();
    const categoryFilter = byId('menuCategoryFilter');
    const currentCategory = categoryFilter.value;

    categoryFilter.innerHTML =
      '<option value="">All categories</option>' +
      categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
    categoryFilter.value = state.filters.menu.category || currentCategory || '';

    container.innerHTML = state.menuItems.length
      ? state.menuItems
          .map(
            (item) => `
              <article class="menu-card">
                <div class="menu-card-top">
                  <div>
                    <h3>${escapeHtml(item.name)}</h3>
                    <span>${escapeHtml(item.category)} - ${escapeHtml(currency(item.price))}</span>
                  </div>
                  ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}">` : ''}
                </div>
                <p>${escapeHtml(item.description || 'No description')}</p>
                <div class="row-actions">
                  ${renderStatusPill(item.isAvailable ? 'PAID' : 'FAILED')}
                  <span class="status-pill ${item.isFeatured ? 'approved' : 'pending'}">${item.isFeatured ? 'Featured' : 'Standard'}</span>
                </div>
                <div class="row-actions" style="margin-top: 12px;">
                  <button class="row-action" data-menu-action="edit" data-id="${item.id}">Edit</button>
                  <button class="row-action" data-menu-action="delete" data-id="${item.id}">Delete</button>
                </div>
              </article>
            `
          )
          .join('')
      : '<div class="empty-state">No menu items found.</div>';
  }

  function renderBarList(elementId, rows, valueKey, formatter) {
    const target = byId(elementId);
    const max = Math.max(1, ...rows.map((row) => Number(row[valueKey] || 0)));

    target.innerHTML = rows.length
      ? rows
          .map((row) => {
            const rawValue = Number(row[valueKey] || 0);
            const width = Math.max(4, (rawValue / max) * 100);
            const label = row.label || row.branchName || row.itemName || row.hour;
            const displayValue = formatter ? formatter(rawValue) : rawValue;

            return `
              <div class="bar-row">
                <div class="bar-meta">
                  <span>${escapeHtml(label)}</span>
                  <strong>${escapeHtml(displayValue)}</strong>
                </div>
                <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
              </div>
            `;
          })
          .join('')
      : '<div class="empty-state">No analytics data yet.</div>';
  }

  function renderAnalytics() {
    if (!state.analytics) {
      return;
    }

    renderBarList('reservations-chart', state.analytics.reservationsPerDay, 'count');
    renderBarList('revenue-chart', state.analytics.revenuePerDay, 'amount', (value) => currency(value));
    renderBarList('branch-chart', state.analytics.reservationsPerBranch, 'count');
    renderBarList('popular-dishes', state.analytics.popularDishes, 'quantity');
    renderBarList('peak-hours', state.analytics.peakBookingHours, 'count');
  }

  function renderNotifications() {
    byId('notifications-unread').textContent = `${state.notifications.length} recent notifications loaded`;
    byId('notifications-list').innerHTML = state.notifications.length
      ? state.notifications
          .map(
            (notification) => `
              <article class="notif-item ${notification.isRead ? '' : 'notif-item-unread'}">
                <div>
                  <strong>${escapeHtml(notification.title)}</strong>
                  <p>${escapeHtml(notification.message)}</p>
                  <span>${escapeHtml(titleize(notification.type))} - ${escapeHtml(new Date(notification.createdAt).toLocaleString())}</span>
                </div>
                <div class="row-actions">
                  ${notification.isRead ? '<span class="status-pill approved">Read</span>' : '<span class="status-pill pending">Unread</span>'}
                  ${notification.isRead ? '' : `<button class="row-action" data-notification-id="${notification.id}">Mark Read</button>`}
                </div>
              </article>
            `
          )
          .join('')
      : '<div class="empty-state">No notifications found.</div>';

    if (state.dashboard) {
      renderDashboard();
    }
  }

  function renderSettings() {
    if (!state.settings) {
      return;
    }

    const { restaurant, bookingPolicy, manualPayment, smtp, notifications } = state.settings;

    byId('settingsRestaurantName').value = restaurant.name || '';
    byId('settingsRestaurantEmail').value = restaurant.email || '';
    byId('settingsRestaurantPhone').value = restaurant.phone || '';
    byId('settingsRestaurantTagline').value = restaurant.tagline || '';
    byId('settingsRestaurantLogo').value = restaurant.logoUrl || '';
    byId('settingsRestaurantAddress').value = restaurant.address || '';
    byId('settingsRestaurantMaps').value = restaurant.googleMaps || '';
    byId('settingsBranchesExpected').value = restaurant.branchesExpected || 3;

    byId('settingsMinGuests').value = bookingPolicy.minimumGuests;
    byId('settingsMaxGuests').value = bookingPolicy.maximumGuests;
    byId('settingsAdvancePercent').value = bookingPolicy.advancePaymentPercentage;
    byId('settingsDuration').value = bookingPolicy.defaultReservationDurationMinutes;
    byId('settingsCancellationHours').value = bookingPolicy.cancellationHours;
    byId('settingsOperatingStart').value = bookingPolicy.operatingHoursStart || '10:00';
    byId('settingsOperatingEnd').value = bookingPolicy.operatingHoursEnd || '23:00';

    byId('settingsPaymentProvider').value = manualPayment.provider || '';
    byId('settingsQrUrl').value = manualPayment.qrImageUrl || '';
    byId('settingsWhatsapp').value = manualPayment.whatsappNumber || '';
    byId('settingsPaymentInstructions').value = manualPayment.instructions || '';
    byId('settingsScreenshotStored').checked = Boolean(manualPayment.screenshotStoredOnServer);

    byId('settingsSmtpHost').value = smtp.host || '';
    byId('settingsSmtpPort').value = smtp.port || 587;
    byId('settingsSmtpUser').value = smtp.user || '';
    byId('settingsSmtpPass').value = smtp.pass || '';
    byId('settingsSmtpFromName').value = smtp.fromName || '';
    byId('settingsSmtpFromEmail').value = smtp.fromEmail || '';
    byId('settingsSmtpSecure').checked = Boolean(smtp.secure);

    byId('settingsNotifyBooking').checked = Boolean(notifications.sendBookingConfirmationEmail);
    byId('settingsNotifyStatus').checked = Boolean(notifications.sendStatusEmails);
    byId('settingsNotifyPayment').checked = Boolean(notifications.sendPaymentEmails);
  }

  function populateBranchSelects() {
    const selects = ['branchFilter', 'paymentBranchFilter', 'orderBranchFilter', 'calendarBranch'];

    selects.forEach((id) => {
      const select = byId(id);
      const current = select.value;

      select.innerHTML =
        '<option value="">All branches</option>' +
        state.branches.map((branch) => `<option value="${branch.id}">${escapeHtml(branch.name)}</option>`).join('');
      select.value = current || '';
    });
  }

  function fillMenuForm(item) {
    state.menuEditingId = item ? item.id : null;
    byId('menu-form-title').textContent = item ? `Edit Dish: ${item.name}` : 'Add Dish';
    byId('menuId').value = item?.id || '';
    byId('menuName').value = item?.name || '';
    byId('menuCode').value = item?.code || '';
    byId('menuCategory').value = item?.category || '';
    byId('menuPrice').value = item?.price || '';
    byId('menuDescription').value = item?.description || '';
    byId('menuImageUrl').value = item?.imageUrl || '';
    byId('menuDietaryType').value = item?.dietaryType || 'VEG';
    byId('menuFeatured').checked = Boolean(item?.isFeatured);
    byId('menuAvailable').checked = item ? Boolean(item.isAvailable) : true;
    byId('menuImage').value = '';
  }

  async function loadDashboard() {
    state.dashboard = await request('/api/admin/dashboard-summary');
    renderDashboard();
  }

  async function loadBranches() {
    const response = await request('/api/admin/branches');
    state.branches = response.branches;
    populateBranchSelects();
    renderBranches();
  }

  async function loadReservations() {
    const params = new URLSearchParams();
    Object.entries(state.filters.reservations).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    });
    const response = await request(`/api/admin/reservations?${params.toString()}`);
    state.reservations = response.items;
    state.pagination.reservations = response.pagination;
    renderReservations();
  }

  async function loadPayments() {
    const params = new URLSearchParams();
    Object.entries(state.filters.payments).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    });
    const response = await request(`/api/admin/payments?${params.toString()}`);
    state.payments = response.items;
    state.pagination.payments = response.pagination;
    renderPayments();
  }

  async function loadOrders() {
    const params = new URLSearchParams();
    Object.entries(state.filters.orders).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        params.set(key, String(value));
      }
    });
    const response = await request(`/api/admin/orders?${params.toString()}`);
    state.orders = response.items;
    state.pagination.orders = response.pagination;
    renderOrders();
  }

  async function loadCalendar() {
    const params = new URLSearchParams({
      period: byId('calendarPeriod').value
    });

    if (byId('calendarDate').value) {
      params.set('referenceDate', byId('calendarDate').value);
    }

    if (byId('calendarBranch').value) {
      params.set('branchId', byId('calendarBranch').value);
    }

    state.calendar = await request(`/api/admin/calendar?${params.toString()}`);
    renderCalendar();
  }

  async function loadMenu() {
    const params = new URLSearchParams();
    if (state.filters.menu.search) {
      params.set('search', state.filters.menu.search);
    }
    if (state.filters.menu.category) {
      params.set('category', state.filters.menu.category);
    }

    const response = await request(`/api/admin/menu?${params.toString()}`);
    state.menuItems = response.items;
    renderMenu();
  }

  async function loadAnalytics() {
    const days = byId('analyticsDays').value || '14';
    state.analytics = await request(`/api/admin/analytics?days=${encodeURIComponent(days)}`);
    renderAnalytics();
  }

  async function loadNotifications() {
    const response = await request('/api/admin/notifications?limit=20');
    state.notifications = response.items;
    renderNotifications();
  }

  async function loadSettings() {
    state.settings = await request('/api/admin/settings');
    renderSettings();
  }

  async function openReservationModal(reservationId) {
    const modal = byId('reservation-modal');
    byId('modal-title').textContent = 'Reservation Details';
    byId('modal-subtitle').textContent = 'Loading...';
    byId('modal-content').innerHTML = '';
    modal.classList.add('open');

    try {
      const response = await request(`/api/admin/reservations/${reservationId}`);
      const reservation = response.reservation;
      byId('modal-title').textContent = `${reservation.bookingCode} - ${reservation.customerName}`;
      byId('modal-subtitle').textContent = `${reservation.branch.name} - ${reservation.reservationDate} - ${reservation.arrivalTime}-${reservation.endTime}`;
      byId('modal-content').innerHTML = `
        <div class="reservation-detail-grid">
          <div><span>Status</span><strong>${escapeHtml(titleize(reservation.bookingStatus))}</strong></div>
          <div><span>Payment</span><strong>${escapeHtml(titleize(reservation.paymentStatus))}</strong></div>
          <div><span>Guests</span><strong>${escapeHtml(reservation.guests)}</strong></div>
          <div><span>Customer Phone</span><strong>${escapeHtml(reservation.phone)}</strong></div>
          <div><span>Alternate Phone</span><strong>${escapeHtml(reservation.altPhone || 'Not provided')}</strong></div>
          <div><span>Email</span><strong>${escapeHtml(reservation.email || 'Not provided')}</strong></div>
          <div><span>Occasion</span><strong>${escapeHtml(titleize(reservation.occasion || 'NONE'))}</strong></div>
          <div><span>Advance Due</span><strong>${escapeHtml(currency(reservation.advanceDue))}</strong></div>
          <div><span>Advance Paid</span><strong>${escapeHtml(currency(reservation.advancePaid))}</strong></div>
        </div>
        <div class="panel-block" style="padding:0;">
          <h3>Special Requests</h3>
          <div class="banner">${escapeHtml(reservation.specialRequests || 'No special requests shared.')}</div>
        </div>
        <div class="panel-block" style="padding:16px 0 0;">
          <h3>Pre-ordered Dishes</h3>
          <div class="detail-list">
            ${
              reservation.items.length
                ? reservation.items
                    .map(
                      (item) => `
                        <div class="detail-list-item">
                          <span>${escapeHtml(item.itemName)} x ${item.quantity}</span>
                          <strong>${escapeHtml(currency(item.subtotal))}</strong>
                        </div>
                      `
                    )
                    .join('')
                : '<div class="banner">No pre-ordered dishes on this reservation.</div>'
            }
          </div>
        </div>
        <div class="panel-block" style="padding:16px 0 0;">
          <h3>Payment Entries</h3>
          <div class="detail-list">
            ${
              reservation.payments.length
                ? reservation.payments
                    .map(
                      (payment) => `
                        <div class="detail-list-item">
                          <span>${escapeHtml(titleize(payment.provider))} - ${escapeHtml(titleize(payment.status))}</span>
                          <strong>${escapeHtml(currency(payment.amount))}</strong>
                        </div>
                      `
                    )
                    .join('')
                : '<div class="banner">No payment entries linked yet.</div>'
            }
          </div>
        </div>
        ${reservation.manualPaymentNote ? `<div class="banner">${escapeHtml(reservation.manualPaymentNote)}</div>` : ''}
      `;
    } catch (error) {
      byId('modal-subtitle').textContent = error.message;
      byId('modal-content').innerHTML = `<div class="banner error">${escapeHtml(error.message)}</div>`;
    }
  }

  async function loadAll() {
    await Promise.all([
      loadDashboard(),
      loadBranches(),
      loadReservations(),
      loadPayments(),
      loadOrders(),
      loadMenu(),
      loadAnalytics(),
      loadNotifications(),
      loadSettings(),
      loadCalendar()
    ]);
  }

  function wireDashboardEvents() {
    byId('logout-button').addEventListener('click', async () => {
      try {
        await request('/api/auth/logout', { method: 'POST' });
      } finally {
        window.location.href = '/admin/login';
      }
    });

    byId('refresh-dashboard').addEventListener('click', async () => {
      await loadAll();
    });

    ['search', 'statusFilter', 'branchFilter', 'paymentFilter', 'sortBy', 'sortOrder'].forEach((id) => {
      byId(id).addEventListener('change', async () => {
        state.filters.reservations.page = 1;
        state.filters.reservations.search = byId('search').value.trim();
        state.filters.reservations.status = byId('statusFilter').value;
        state.filters.reservations.branchId = byId('branchFilter').value;
        state.filters.reservations.paymentStatus = byId('paymentFilter').value;
        state.filters.reservations.sortBy = byId('sortBy').value;
        state.filters.reservations.sortOrder = byId('sortOrder').value;
        await loadReservations();
      });
    });

    byId('prev-page').addEventListener('click', async () => {
      if (state.pagination.reservations.page > 1) {
        state.filters.reservations.page = state.pagination.reservations.page - 1;
        await loadReservations();
      }
    });

    byId('next-page').addEventListener('click', async () => {
      if (state.pagination.reservations.page < state.pagination.reservations.totalPages) {
        state.filters.reservations.page = state.pagination.reservations.page + 1;
        await loadReservations();
      }
    });

    byId('paymentSearch').addEventListener('input', async () => {
      state.filters.payments.search = byId('paymentSearch').value.trim();
      await loadPayments();
    });
    byId('paymentStatusFilter').addEventListener('change', async () => {
      state.filters.payments.status = byId('paymentStatusFilter').value;
      await loadPayments();
    });
    byId('paymentBranchFilter').addEventListener('change', async () => {
      state.filters.payments.branchId = byId('paymentBranchFilter').value;
      await loadPayments();
    });

    byId('orderBranchFilter').addEventListener('change', async () => {
      state.filters.orders.branchId = byId('orderBranchFilter').value;
      await loadOrders();
    });
    byId('orderStatusFilter').addEventListener('change', async () => {
      state.filters.orders.status = byId('orderStatusFilter').value;
      await loadOrders();
    });

    byId('calendar-reload').addEventListener('click', loadCalendar);
    byId('analytics-reload').addEventListener('click', loadAnalytics);
    byId('notifications-refresh').addEventListener('click', loadNotifications);
    byId('mark-all-read').addEventListener('click', async () => {
      await request('/api/admin/notifications/read-all', { method: 'POST' });
      await Promise.all([loadNotifications(), loadDashboard()]);
    });

    byId('menuSearch').addEventListener('input', async () => {
      state.filters.menu.search = byId('menuSearch').value.trim();
      await loadMenu();
    });
    byId('menuCategoryFilter').addEventListener('change', async () => {
      state.filters.menu.category = byId('menuCategoryFilter').value;
      await loadMenu();
    });

    byId('menu-reset').addEventListener('click', () => {
      fillMenuForm(null);
    });

    byId('menu-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData();
      formData.set('name', byId('menuName').value.trim());
      formData.set('code', byId('menuCode').value.trim());
      formData.set('category', byId('menuCategory').value.trim());
      formData.set('price', byId('menuPrice').value);
      formData.set('description', byId('menuDescription').value.trim());
      formData.set('imageUrl', byId('menuImageUrl').value.trim());
      formData.set('dietaryType', byId('menuDietaryType').value);
      formData.set('isFeatured', String(byId('menuFeatured').checked));
      formData.set('isAvailable', String(byId('menuAvailable').checked));
      if (byId('menuImage').files[0]) {
        formData.set('image', byId('menuImage').files[0]);
      }

      try {
        if (state.menuEditingId) {
          await request(`/api/admin/menu/${state.menuEditingId}`, {
            method: 'PATCH',
            body: formData
          });
          setBanner('menu-banner', 'Menu item updated successfully.', 'success');
        } else {
          await request('/api/admin/menu', {
            method: 'POST',
            body: formData
          });
          setBanner('menu-banner', 'Menu item created successfully.', 'success');
        }

        fillMenuForm(null);
        await loadMenu();
      } catch (error) {
        setBanner('menu-banner', error.message, 'error');
      }
    });

    byId('settings-form').addEventListener('submit', async (event) => {
      event.preventDefault();

      try {
        await request('/api/admin/settings', {
          method: 'PATCH',
          body: JSON.stringify({
            restaurant: {
              name: byId('settingsRestaurantName').value.trim(),
              email: byId('settingsRestaurantEmail').value.trim(),
              phone: byId('settingsRestaurantPhone').value.trim(),
              tagline: byId('settingsRestaurantTagline').value.trim(),
              logoUrl: byId('settingsRestaurantLogo').value.trim(),
              address: byId('settingsRestaurantAddress').value.trim(),
              googleMaps: byId('settingsRestaurantMaps').value.trim(),
              branchesExpected: Number(byId('settingsBranchesExpected').value || 3)
            },
            bookingPolicy: {
              minimumGuests: Number(byId('settingsMinGuests').value || 1),
              maximumGuests: Number(byId('settingsMaxGuests').value || 20),
              advancePaymentPercentage: Number(byId('settingsAdvancePercent').value || 50),
              defaultReservationDurationMinutes: Number(byId('settingsDuration').value || 120),
              cancellationHours: Number(byId('settingsCancellationHours').value || 4),
              operatingHoursStart: byId('settingsOperatingStart').value,
              operatingHoursEnd: byId('settingsOperatingEnd').value
            },
            manualPayment: {
              provider: byId('settingsPaymentProvider').value.trim(),
              qrImageUrl: byId('settingsQrUrl').value.trim(),
              whatsappNumber: byId('settingsWhatsapp').value.trim(),
              screenshotStoredOnServer: byId('settingsScreenshotStored').checked,
              instructions: byId('settingsPaymentInstructions').value.trim()
            },
            smtp: {
              host: byId('settingsSmtpHost').value.trim(),
              port: Number(byId('settingsSmtpPort').value || 587),
              secure: byId('settingsSmtpSecure').checked,
              user: byId('settingsSmtpUser').value.trim(),
              pass: byId('settingsSmtpPass').value.trim(),
              fromName: byId('settingsSmtpFromName').value.trim(),
              fromEmail: byId('settingsSmtpFromEmail').value.trim()
            },
            notifications: {
              sendBookingConfirmationEmail: byId('settingsNotifyBooking').checked,
              sendStatusEmails: byId('settingsNotifyStatus').checked,
              sendPaymentEmails: byId('settingsNotifyPayment').checked
            }
          })
        });
        setBanner('settings-banner', 'Settings updated successfully.', 'success');
        await Promise.all([loadSettings(), loadDashboard()]);
      } catch (error) {
        setBanner('settings-banner', error.message, 'error');
      }
    });

    byId('reservation-tbody').addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) {
        return;
      }

      const reservationId = button.dataset.id;
      const action = button.dataset.action;

      if (action === 'view') {
        await openReservationModal(reservationId);
        return;
      }

      if (action === 'delete') {
        if (!window.confirm('Delete this reservation permanently?')) {
          return;
        }

        try {
          await request(`/api/admin/reservations/${reservationId}`, { method: 'DELETE' });
          setBanner('reservation-banner', 'Reservation deleted successfully.', 'success');
          await Promise.all([loadReservations(), loadDashboard()]);
        } catch (error) {
          setBanner('reservation-banner', error.message, 'error');
        }
        return;
      }

      const statusMap = {
        approve: 'APPROVED',
        reject: 'REJECTED',
        cancel: 'CANCELLED',
        complete: 'COMPLETED'
      };

      if (statusMap[action]) {
        try {
          await request(`/api/admin/reservations/${reservationId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: statusMap[action] })
          });
          setBanner('reservation-banner', `Reservation marked as ${titleize(statusMap[action])}.`, 'success');
          await Promise.all([loadReservations(), loadDashboard(), loadNotifications()]);
        } catch (error) {
          setBanner('reservation-banner', error.message, 'error');
        }
      }
    });

    byId('payment-tbody').addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-payment-action]');
      if (!button) {
        return;
      }

      const statusMap = {
        paid: 'PAID',
        failed: 'FAILED',
        awaiting_confirmation: 'AWAITING_CONFIRMATION',
        refunded: 'REFUNDED'
      };
      const nextStatus = statusMap[button.dataset.paymentAction];
      const transactionRef =
        nextStatus === 'PAID' || nextStatus === 'REFUNDED'
          ? window.prompt('Enter transaction reference (optional):', '') || ''
          : '';

      try {
        await request(`/api/admin/payments/${button.dataset.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            status: nextStatus,
            transactionRef
          })
        });
        setBanner('payment-banner', `Payment marked as ${titleize(nextStatus)}.`, 'success');
        await Promise.all([loadPayments(), loadReservations(), loadDashboard(), loadNotifications()]);
      } catch (error) {
        setBanner('payment-banner', error.message, 'error');
      }
    });

    byId('menu-items').addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-menu-action]');
      if (!button) {
        return;
      }

      const item = state.menuItems.find((menuItem) => menuItem.id === button.dataset.id);

      if (!item) {
        return;
      }

      if (button.dataset.menuAction === 'edit') {
        fillMenuForm(item);
        return;
      }

      if (button.dataset.menuAction === 'delete') {
        if (!window.confirm(`Delete dish "${item.name}"?`)) {
          return;
        }

        try {
          await request(`/api/admin/menu/${item.id}`, { method: 'DELETE' });
          setBanner('menu-banner', 'Menu item deleted successfully.', 'success');
          fillMenuForm(null);
          await loadMenu();
        } catch (error) {
          setBanner('menu-banner', error.message, 'error');
        }
      }
    });

    byId('notifications-list').addEventListener('click', async (event) => {
      const button = event.target.closest('button[data-notification-id]');
      if (!button) {
        return;
      }

      await request(`/api/admin/notifications/${button.dataset.notificationId}/read`, {
        method: 'PATCH'
      });
      await Promise.all([loadNotifications(), loadDashboard()]);
    });

    byId('close-modal').addEventListener('click', () => {
      byId('reservation-modal').classList.remove('open');
    });

    byId('reservation-modal').addEventListener('click', (event) => {
      if (event.target.id === 'reservation-modal') {
        byId('reservation-modal').classList.remove('open');
      }
    });
  }

  async function setupDashboardPage() {
    wireDashboardEvents();
    try {
      const now = new Date();
      byId('calendarDate').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      await loadAdminContext();
      await loadAll();
      fillMenuForm(null);
    } catch (error) {
      setBanner('reservation-banner', error.message, 'error');
    }
  }

  if (page === 'login') {
    setupLoginPage();
  }

  if (page === 'dashboard') {
    setupDashboardPage();
  }
})();
