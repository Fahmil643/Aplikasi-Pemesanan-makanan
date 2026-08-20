/**
 * MERCHANT / KITCHEN PORTAL SCRIPT (PORT 4000) - MIE GACOAN
 * Dedicated Client Logic for Kitchen Order Management, Order Processing & Stock Control
 */

(function () {
  'use strict';

  const STORAGE_KEYS = {
    MENU: 'gacoan_menu_items_v1',
    ORDERS: 'gacoan_orders_list_v1',
    SOUND_ENABLED: 'gacoan_merchant_sound_enabled'
  };

  const broadcastSync = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('gacoan_live_sync') : null;

  let menuItems = loadStorage(STORAGE_KEYS.MENU, window.DEFAULT_MENU_ITEMS || []);
  let orders = loadStorage(STORAGE_KEYS.ORDERS, []);
  let isSoundEnabled = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED) !== 'false';
  let merchantFilterStatus = 'all';

  function loadStorage(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function formatRupiah(number) {
    return 'Rp ' + Number(number || 0).toLocaleString('id-ID');
  }

  function formatTime(isoString) {
    const date = new Date(isoString || Date.now());
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateTime(isoString) {
    const date = new Date(isoString || Date.now());
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
      date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  function getElapsedMinutes(isoString) {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / 60000);
    return mins <= 0 ? 'Baru saja' : `${mins} menit lalu`;
  }

  function playAudioTone(type = 'bell') {
    if (!isSoundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'bell') {
        const freqs = [587.33, 880, 1174.66];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
          gain.gain.setValueAtTime(0.3, ctx.currentTime + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.12);
          osc.stop(ctx.currentTime + idx * 0.12 + 0.65);
        });
      } else if (type === 'success') {
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.25, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.45);
        });
      }
    } catch (err) {}
  }

  // ==========================================================================
  // SERVER API SYNC
  // ==========================================================================
  async function fetchServerState() {
    try {
      const ordersRes = await fetch('/api/orders');
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        if (Array.isArray(data)) {
          if (data.length > orders.length) {
            playAudioTone('bell');
          }
          orders = data;
          saveStorage(STORAGE_KEYS.ORDERS, orders);
          renderMerchantOrders();
        }
      }

      const menuRes = await fetch('/api/menu');
      if (menuRes.ok) {
        const data = await menuRes.json();
        if (Array.isArray(data) && data.length > 0) {
          menuItems = data;
          saveStorage(STORAGE_KEYS.MENU, menuItems);
          renderMerchantStockTable();
        }
      }
    } catch (e) {
      // Fallback
    }
  }

  // ==========================================================================
  // DOM REFERENCES
  // ==========================================================================
  const dom = {
    refreshOrdersBtn: document.getElementById('refreshOrdersBtn'),
    soundToggleBtn: document.getElementById('soundToggleBtn'),
    soundIcon: document.getElementById('soundIcon'),

    kpiRevenue: document.getElementById('kpiRevenue'),
    kpiTotalOrders: document.getElementById('kpiTotalOrders'),
    kpiActiveKitchen: document.getElementById('kpiActiveKitchen'),
    kpiBestSeller: document.getElementById('kpiBestSeller'),

    merchantOrderFilterGroup: document.getElementById('merchantOrderFilterGroup'),
    countAllOrders: document.getElementById('countAllOrders'),
    countPendingOrders: document.getElementById('countPendingOrders'),
    countCookingOrders: document.getElementById('countCookingOrders'),
    countReadyOrders: document.getElementById('countReadyOrders'),
    countDoneOrders: document.getElementById('countDoneOrders'),

    merchantOrdersGrid: document.getElementById('merchantOrdersGrid'),
    merchantStockTableBody: document.getElementById('merchantStockTableBody'),

    receiptModalOverlay: document.getElementById('receiptModalOverlay'),
    closeReceiptModalBtn: document.getElementById('closeReceiptModalBtn'),
    receiptDate: document.getElementById('receiptDate'),
    receiptOrderId: document.getElementById('receiptOrderId'),
    receiptCustomerName: document.getElementById('receiptCustomerName'),
    receiptOrderType: document.getElementById('receiptOrderType'),
    receiptPaymentMethod: document.getElementById('receiptPaymentMethod'),
    receiptItemsList: document.getElementById('receiptItemsList'),
    receiptSubtotal: document.getElementById('receiptSubtotal'),
    receiptTax: document.getElementById('receiptTax'),
    receiptTotal: document.getElementById('receiptTotal'),
    printReceiptBtn: document.getElementById('printReceiptBtn')
  };

  // ==========================================================================
  // KPI & ORDERS BOARD
  // ==========================================================================
  function renderMerchantKPIs() {
    const validOrders = orders.filter(o => o.status !== 'Dibatalkan');
    const totalRevenue = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const activeKitchenCount = orders.filter(o => o.status === 'Menunggu Konfirmasi' || o.status === 'Sedang Dimasak').length;

    const itemFreq = {};
    validOrders.forEach(o => {
      (o.items || []).forEach(i => {
        itemFreq[i.name] = (itemFreq[i.name] || 0) + i.qty;
      });
    });

    let bestSellerName = '-';
    let maxCount = 0;
    for (const [name, count] of Object.entries(itemFreq)) {
      if (count > maxCount) {
        maxCount = count;
        bestSellerName = `${name} (${count}x)`;
      }
    }

    dom.kpiRevenue.textContent = formatRupiah(totalRevenue);
    dom.kpiTotalOrders.textContent = `${orders.length} Pesanan`;
    dom.kpiActiveKitchen.textContent = `${activeKitchenCount} Antrean`;
    dom.kpiBestSeller.textContent = bestSellerName;

    dom.countAllOrders.textContent = orders.length;
    dom.countPendingOrders.textContent = orders.filter(o => o.status === 'Menunggu Konfirmasi').length;
    dom.countCookingOrders.textContent = orders.filter(o => o.status === 'Sedang Dimasak').length;
    dom.countReadyOrders.textContent = orders.filter(o => o.status === 'Siap Disajikan').length;
    dom.countDoneOrders.textContent = orders.filter(o => o.status === 'Selesai').length;
  }

  function renderMerchantOrders() {
    renderMerchantKPIs();
    if (!dom.merchantOrdersGrid) return;

    const filtered = orders.filter(o => {
      if (merchantFilterStatus === 'all') return true;
      return o.status === merchantFilterStatus;
    });

    if (filtered.length === 0) {
      dom.merchantOrdersGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted); background: #1e293b; border-radius: var(--radius-md); border: 1px dashed #334155;">
          <div style="font-size: 3rem; margin-bottom: 0.5rem;">👨‍🍳</div>
          <h3 style="font-size: 1.2rem; color: #fff; font-weight: 800;">Tidak Ada Antrean Pesanan</h3>
          <p style="font-size: 0.88rem; color: #94a3b8;">Pesanan baru dari pemesan akan langsung otomatis muncul di sini.</p>
        </div>
      `;
      return;
    }

    dom.merchantOrdersGrid.innerHTML = filtered.map(order => {
      let statusClass = 'status-menunggu';
      let actionButtons = '';

      if (order.status === 'Menunggu Konfirmasi') {
        statusClass = 'status-menunggu';
        actionButtons = `
          <button type="button" class="btn-kitchen-action btn-process btn-update-status" data-id="${order.id}" data-status="Sedang Dimasak">
            🍳 Terima & Masak
          </button>
          <button type="button" class="btn-kitchen-action btn-cancel btn-update-status" data-id="${order.id}" data-status="Dibatalkan" style="flex: unset; padding: 0.6rem 0.8rem;" title="Tolak Pesanan">
            ✕
          </button>
        `;
      } else if (order.status === 'Sedang Dimasak') {
        statusClass = 'status-diproses';
        actionButtons = `
          <button type="button" class="btn-kitchen-action btn-ready btn-update-status" data-id="${order.id}" data-status="Siap Disajikan">
            🍜 Pesanan Siap Saji
          </button>
        `;
      } else if (order.status === 'Siap Disajikan') {
        statusClass = 'status-siap';
        actionButtons = `
          <button type="button" class="btn-kitchen-action btn-finish btn-update-status" data-id="${order.id}" data-status="Selesai">
            ✅ Selesaikan Pesanan
          </button>
        `;
      } else {
        statusClass = order.status === 'Selesai' ? 'status-selesai' : 'status-dibatalkan';
        actionButtons = `
          <button type="button" class="btn-kitchen-action btn-merchant-receipt" data-id="${order.id}" style="background: #334155; color: #fff;">
            🖨️ Struk
          </button>
        `;
      }

      return `
        <article class="order-kitchen-card ${statusClass}" style="background: #1e293b; border-color: #334155; color: #fff;">
          <div class="order-card-header" style="background: #0f172a; border-bottom-color: #334155;">
            <div>
              <span class="order-id-tag" style="color: #fff;">#${order.id}</span>
              <span style="font-size: 0.75rem; color: #94a3b8; display: block;">${formatTime(order.createdAt)}</span>
            </div>
            <span class="order-time-elapsed" style="color: #cbd5e1;">⏱️ ${getElapsedMinutes(order.createdAt)}</span>
          </div>

          <div class="order-customer-info" style="background: #1e293b; border-bottom-color: #334155;">
            <span class="customer-pill" style="color: #f8fafc;">👤 ${order.customerName}</span>
            <span class="type-pill ${order.orderType === 'Dine In' ? 'dinein' : 'takeaway'}">
              ${order.orderType} ${order.tableNumber !== '-' ? `(${order.tableNumber})` : ''}
            </span>
          </div>

          <div class="order-items-scroll">
            ${order.items.map(item => `
              <div class="order-item-row">
                <div>
                  <span class="item-qty-name" style="color: #f8fafc;">${item.qty}x ${item.name}</span>
                  ${item.level !== null ? `<span class="item-level-tag">Lv ${item.level}</span>` : ''}
                  ${item.notes ? `<div class="order-notes-tag" style="background: #78350f; color: #fef3c7;">📝 "${item.notes}"</div>` : ''}
                </div>
                <span style="font-size: 0.82rem; font-weight: 700; color: #94a3b8;">${formatRupiah(item.price * item.qty)}</span>
              </div>
            `).join('')}
          </div>

          <div class="order-card-footer" style="background: #0f172a; border-top-color: #334155;">
            <div style="font-size: 0.85rem; font-weight: 900; color: #fb7185; margin-right: 0.5rem;">
              ${formatRupiah(order.total)}
            </div>
            <div style="display: flex; gap: 0.4rem; flex: 1;">
              ${actionButtons}
            </div>
          </div>
        </article>
      `;
    }).join('');

    dom.merchantOrdersGrid.querySelectorAll('.btn-update-status').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.getAttribute('data-id');
        const nextStatus = e.currentTarget.getAttribute('data-status');
        updateOrderStatus(orderId, nextStatus);
      });
    });

    dom.merchantOrdersGrid.querySelectorAll('.btn-merchant-receipt').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.currentTarget.getAttribute('data-id');
        openReceiptModal(orderId);
      });
    });
  }

  async function updateOrderStatus(orderId, nextStatus) {
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;

    orders[orderIndex].status = nextStatus;
    saveStorage(STORAGE_KEYS.ORDERS, orders);

    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
    } catch (e) {}

    if (broadcastSync) {
      broadcastSync.postMessage({ type: 'STATUS_UPDATE', orderId, status: nextStatus });
    }

    playAudioTone('success');
    renderMerchantOrders();
  }

  function renderMerchantStockTable() {
    if (!dom.merchantStockTableBody) return;

    dom.merchantStockTableBody.innerHTML = menuItems.map(item => {
      const isAvailable = item.isAvailable !== false;
      return `
        <tr>
          <td><img src="${item.image}" alt="${item.name}" style="width: 48px; height: 48px; border-radius: 6px; object-fit: cover;"></td>
          <td>
            <strong>${item.name}</strong>
            ${item.spicyAllowed ? '<span style="font-size:0.7rem; color:#f87171; display:block;">Pedas Level 0-8</span>' : ''}
          </td>
          <td><span style="text-transform: capitalize; color: #94a3b8;">${item.category}</span></td>
          <td><strong>${formatRupiah(item.price)}</strong></td>
          <td>
            <span style="font-weight: 800; font-size: 0.8rem; color: ${isAvailable ? '#34d399' : '#f87171'};">
              ${isAvailable ? '● Tersedia' : '○ Habis'}
            </span>
          </td>
          <td>
            <label class="switch-toggle">
              <input type="checkbox" class="stock-toggle-checkbox" data-id="${item.id}" ${isAvailable ? 'checked' : ''}>
              <span class="slider-round"></span>
            </label>
          </td>
        </tr>
      `;
    }).join('');

    dom.merchantStockTableBody.querySelectorAll('.stock-toggle-checkbox').forEach(input => {
      input.addEventListener('change', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const isChecked = e.currentTarget.checked;
        const itemIdx = menuItems.findIndex(m => m.id === id);
        if (itemIdx > -1) {
          menuItems[itemIdx].isAvailable = isChecked;
          saveStorage(STORAGE_KEYS.MENU, menuItems);

          try {
            await fetch(`/api/menu/${id}/availability`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isAvailable: isChecked })
            });
          } catch (err) {}

          if (broadcastSync) {
            broadcastSync.postMessage({ type: 'MENU_UPDATE', id, isAvailable: isChecked });
          }

          renderMerchantStockTable();
        }
      });
    });
  }

  function openReceiptModal(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    dom.receiptDate.textContent = formatDateTime(order.createdAt);
    dom.receiptOrderId.textContent = `#${order.id}`;
    dom.receiptCustomerName.textContent = order.customerName;
    dom.receiptOrderType.textContent = `${order.orderType} (${order.tableNumber})`;
    dom.receiptPaymentMethod.textContent = `${order.paymentMethod} (LUNAS)`;

    dom.receiptItemsList.innerHTML = order.items.map(item => `
      <div class="receipt-row">
        <span>${item.qty}x ${item.name} ${item.level !== null ? `(Lv ${item.level})` : ''}</span>
        <span>${formatRupiah(item.price * item.qty)}</span>
      </div>
      ${item.notes ? `<div style="font-size:0.7rem; color:#555; margin-left:10px;">* ${item.notes}</div>` : ''}
    `).join('');

    dom.receiptSubtotal.textContent = formatRupiah(order.subtotal);
    dom.receiptTax.textContent = formatRupiah(order.tax);
    dom.receiptTotal.textContent = formatRupiah(order.total);

    dom.receiptModalOverlay.classList.add('active');
  }

  function setupEventListeners() {
    dom.soundToggleBtn.addEventListener('click', () => {
      isSoundEnabled = !isSoundEnabled;
      localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, isSoundEnabled);
      dom.soundIcon.textContent = isSoundEnabled ? '🔔' : '🔕';
      if (isSoundEnabled) playAudioTone('bell');
    });

    dom.refreshOrdersBtn.addEventListener('click', () => {
      fetchServerState();
    });

    dom.merchantOrderFilterGroup.querySelectorAll('.merchant-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        dom.merchantOrderFilterGroup.querySelectorAll('.merchant-filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        merchantFilterStatus = e.currentTarget.getAttribute('data-status');
        renderMerchantOrders();
      });
    });

    dom.closeReceiptModalBtn.addEventListener('click', () => {
      dom.receiptModalOverlay.classList.remove('active');
    });

    dom.receiptModalOverlay.addEventListener('click', (e) => {
      if (e.target === dom.receiptModalOverlay) dom.receiptModalOverlay.classList.remove('active');
    });

    dom.printReceiptBtn.addEventListener('click', () => {
      window.print();
    });

    if (broadcastSync) {
      broadcastSync.onmessage = (e) => {
        if (e.data.type === 'NEW_ORDER') {
          playAudioTone('bell');
          fetchServerState();
        }
      };
    }

    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEYS.ORDERS) {
        const oldLength = orders.length;
        orders = loadStorage(STORAGE_KEYS.ORDERS, []);
        if (orders.length > oldLength) {
          playAudioTone('bell');
        }
        renderMerchantOrders();
      } else if (e.key === STORAGE_KEYS.MENU) {
        menuItems = loadStorage(STORAGE_KEYS.MENU, window.DEFAULT_MENU_ITEMS || []);
        renderMerchantStockTable();
      }
    });

    setInterval(fetchServerState, 2500);
  }

  function init() {
    dom.soundIcon.textContent = isSoundEnabled ? '🔔' : '🔕';
    renderMerchantOrders();
    renderMerchantStockTable();
    setupEventListeners();
    fetchServerState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
