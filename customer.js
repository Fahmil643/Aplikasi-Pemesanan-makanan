/**
 * CUSTOMER PORTAL SCRIPT (PORT 3000) - MIE GACOAN
 * Dedicated Client Logic for Customer Ordering, Level Customization & Live Tracker
 */

(function () {
  'use strict';

  const STORAGE_KEYS = {
    MENU: 'gacoan_menu_items_v1',
    CART: 'gacoan_active_cart_v1',
    ORDERS: 'gacoan_orders_list_v1',
    ACTIVE_ORDER_ID: 'gacoan_customer_active_order_id',
    SOUND_ENABLED: 'gacoan_sound_enabled'
  };

  // Broadcast Channel for seamless cross-port & cross-tab communication
  const broadcastSync = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('gacoan_live_sync') : null;

  let menuItems = loadStorage(STORAGE_KEYS.MENU, window.DEFAULT_MENU_ITEMS || []);
  let cart = loadStorage(STORAGE_KEYS.CART, []);
  let orders = loadStorage(STORAGE_KEYS.ORDERS, []);
  let activeOrderId = localStorage.getItem(STORAGE_KEYS.ACTIVE_ORDER_ID) || null;
  let isSoundEnabled = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED) !== 'false';

  let currentCategory = 'all';
  let searchQuery = '';
  let currentCustomItem = null;
  let selectedLevel = 1;
  let customQty = 1;
  let selectedPaymentMethod = 'QRIS';
  let qrisTimerInterval = null;

  // ==========================================================================
  // HELPERS
  // ==========================================================================
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

  function formatDateTime(isoString) {
    const date = new Date(isoString || Date.now());
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
      date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  // Audio tone generator
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
      const menuRes = await fetch('/api/menu');
      if (menuRes.ok) {
        const data = await menuRes.json();
        if (Array.isArray(data) && data.length > 0) {
          menuItems = data;
          saveStorage(STORAGE_KEYS.MENU, menuItems);
          renderMenuGrid();
        }
      }

      const ordersRes = await fetch('/api/orders');
      if (ordersRes.ok) {
        const data = await ordersRes.json();
        if (Array.isArray(data)) {
          orders = data;
          saveStorage(STORAGE_KEYS.ORDERS, orders);
          updateActiveOrderHeaderPill();
          if (dom.trackerModalOverlay.classList.contains('active') && activeOrderId) {
            openTrackerModal(activeOrderId);
          }
        }
      }
    } catch (e) {
      // Offline / Static file mode fallback to localStorage
    }
  }

  // ==========================================================================
  // DOM REFERENCES
  // ==========================================================================
  const dom = {
    soundToggleBtn: document.getElementById('soundToggleBtn'),
    soundIcon: document.getElementById('soundIcon'),
    headerActiveOrderPill: document.getElementById('headerActiveOrderPill'),
    activeOrderPillText: document.getElementById('activeOrderPillText'),

    typeDineInBtn: document.getElementById('typeDineInBtn'),
    typeTakeAwayBtn: document.getElementById('typeTakeAwayBtn'),
    tableSelectionGroup: document.getElementById('tableSelectionGroup'),
    tableNumberInput: document.getElementById('tableNumberInput'),
    customerNameInput: document.getElementById('customerNameInput'),
    categoryTabsContainer: document.getElementById('categoryTabsContainer'),
    menuSearchInput: document.getElementById('menuSearchInput'),
    menuGridContainer: document.getElementById('menuGridContainer'),

    floatingCartBar: document.getElementById('floatingCartBar'),
    floatingCartCount: document.getElementById('floatingCartCount'),
    floatingCartTotal: document.getElementById('floatingCartTotal'),
    floatingCartSubtitle: document.getElementById('floatingCartSubtitle'),
    openCartDrawerBtn: document.getElementById('openCartDrawerBtn'),

    customizationModalOverlay: document.getElementById('customizationModalOverlay'),
    closeCustomizationModalBtn: document.getElementById('closeCustomizationModalBtn'),
    customModalImg: document.getElementById('customModalImg'),
    customModalName: document.getElementById('customModalName'),
    customModalPrice: document.getElementById('customModalPrice'),
    spicyLevelSection: document.getElementById('spicyLevelSection'),
    spicyLevelsContainer: document.getElementById('spicyLevelsContainer'),
    customModalNotes: document.getElementById('customModalNotes'),
    customModalQtyMinus: document.getElementById('customModalQtyMinus'),
    customModalQtyVal: document.getElementById('customModalQtyVal'),
    customModalQtyPlus: document.getElementById('customModalQtyPlus'),
    customModalSubtotal: document.getElementById('customModalSubtotal'),
    customModalAddToCartBtn: document.getElementById('customModalAddToCartBtn'),

    cartDrawerOverlay: document.getElementById('cartDrawerOverlay'),
    closeCartDrawerBtn: document.getElementById('closeCartDrawerBtn'),
    cartItemsContainer: document.getElementById('cartItemsContainer'),
    cartOrderTypeDisplay: document.getElementById('cartOrderTypeDisplay'),
    cartSubtotalVal: document.getElementById('cartSubtotalVal'),
    cartTaxVal: document.getElementById('cartTaxVal'),
    cartTotalVal: document.getElementById('cartTotalVal'),
    proceedToPaymentBtn: document.getElementById('proceedToPaymentBtn'),

    paymentModalOverlay: document.getElementById('paymentModalOverlay'),
    closePaymentModalBtn: document.getElementById('closePaymentModalBtn'),
    paymentTotalAmount: document.getElementById('paymentTotalAmount'),
    paymentOrderTypeInfo: document.getElementById('paymentOrderTypeInfo'),
    qrisPaymentBox: document.getElementById('qrisPaymentBox'),
    cashPaymentBox: document.getElementById('cashPaymentBox'),
    qrisTimer: document.getElementById('qrisTimer'),
    simulatePaymentSuccessBtn: document.getElementById('simulatePaymentSuccessBtn'),

    trackerModalOverlay: document.getElementById('trackerModalOverlay'),
    closeTrackerModalBtn: document.getElementById('closeTrackerModalBtn'),
    closeTrackerModalFooterBtn: document.getElementById('closeTrackerModalFooterBtn'),
    trackerOrderId: document.getElementById('trackerOrderId'),
    trackerCurrentBadge: document.getElementById('trackerCurrentBadge'),
    trackerEstimatedTime: document.getElementById('trackerEstimatedTime'),
    trackerOrderItemsSummary: document.getElementById('trackerOrderItemsSummary'),
    stepNodePending: document.getElementById('stepNodePending'),
    stepNodeCooking: document.getElementById('stepNodeCooking'),
    stepNodeReady: document.getElementById('stepNodeReady'),
    stepNodeFinished: document.getElementById('stepNodeFinished')
  };

  // ==========================================================================
  // MENU CATALOG
  // ==========================================================================
  function renderMenuGrid() {
    if (!dom.menuGridContainer) return;

    const filtered = menuItems.filter(item => {
      const matchCategory = currentCategory === 'all' || item.category === currentCategory;
      const matchSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });

    if (filtered.length === 0) {
      dom.menuGridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 0.5rem;">🔍</div>
          <h3 style="font-size: 1.2rem; color: var(--text-main); font-weight: 800;">Menu Tidak Ditemukan</h3>
          <p style="font-size: 0.9rem;">Coba cari dengan kata kunci lain atau pilih kategori di atas.</p>
        </div>
      `;
      return;
    }

    dom.menuGridContainer.innerHTML = filtered.map(item => {
      const isAvailable = item.isAvailable !== false;
      const spicyTag = item.spicyAllowed ? '<span class="menu-badge" style="background:#dc2626;">🌶️ Level 0-8</span>' : '';
      const bestsellerTag = item.isBestSeller ? `<span class="menu-badge" style="background:#ea580c;">${item.badge || 'Favorit'}</span>` : '';

      return `
        <article class="menu-card ${!isAvailable ? 'sold-out' : ''}" data-id="${item.id}">
          <div class="menu-card-img-wrap">
            <img src="${item.image}" alt="${item.name}" class="menu-card-img" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80'">
            ${bestsellerTag || spicyTag}
            ${!isAvailable ? '<div class="sold-out-badge">HABIS / SOLD OUT</div>' : ''}
          </div>
          <div class="menu-card-body">
            <h3 class="menu-card-title">${item.name}</h3>
            <p class="menu-card-desc">${item.description}</p>
            <div class="menu-card-footer">
              <div class="menu-card-price">
                <span class="price-current">${formatRupiah(item.price)}</span>
                ${item.originalPrice ? `<span class="price-original">${formatRupiah(item.originalPrice)}</span>` : ''}
              </div>
              <button type="button" class="btn-add-item" ${!isAvailable ? 'disabled' : ''} data-id="${item.id}">
                ${isAvailable ? '<span>Pilih</span> ＋' : 'Habis'}
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    dom.menuGridContainer.querySelectorAll('.btn-add-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        openCustomizationModal(id);
      });
    });
  }

  function openCustomizationModal(itemId) {
    const item = menuItems.find(m => m.id === itemId);
    if (!item || item.isAvailable === false) return;

    currentCustomItem = item;
    selectedLevel = item.spicyAllowed ? 1 : 0;
    customQty = 1;

    dom.customModalImg.src = item.image;
    dom.customModalName.textContent = item.name;
    dom.customModalPrice.textContent = formatRupiah(item.price);
    dom.customModalNotes.value = '';
    dom.customModalQtyVal.textContent = customQty;

    if (item.spicyAllowed) {
      dom.spicyLevelSection.style.display = 'block';
      dom.spicyLevelsContainer.innerHTML = (window.SPICE_LEVELS || []).map(lvl => `
        <button type="button" class="level-option-btn ${lvl.level === selectedLevel ? 'selected' : ''}" data-level="${lvl.level}">
          <div class="level-badge-row">
            <span class="level-name">${lvl.label}</span>
            <span>${lvl.icon}</span>
          </div>
          <span class="level-desc">${lvl.desc}</span>
        </button>
      `).join('');

      dom.spicyLevelsContainer.querySelectorAll('.level-option-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          dom.spicyLevelsContainer.querySelectorAll('.level-option-btn').forEach(b => b.classList.remove('selected'));
          e.currentTarget.classList.add('selected');
          selectedLevel = parseInt(e.currentTarget.getAttribute('data-level'), 10);
        });
      });
    } else {
      dom.spicyLevelSection.style.display = 'none';
    }

    updateCustomModalSubtotal();
    dom.customizationModalOverlay.classList.add('active');
  }

  function updateCustomModalSubtotal() {
    if (!currentCustomItem) return;
    const total = currentCustomItem.price * customQty;
    dom.customModalSubtotal.textContent = formatRupiah(total);
  }

  function addItemToCart() {
    if (!currentCustomItem) return;

    const notes = dom.customModalNotes.value.trim();
    const cartItemId = `${currentCustomItem.id}_lvl${selectedLevel}_${encodeURIComponent(notes)}`;

    const existingIndex = cart.findIndex(ci => ci.cartItemId === cartItemId);
    if (existingIndex > -1) {
      cart[existingIndex].qty += customQty;
    } else {
      cart.push({
        cartItemId,
        id: currentCustomItem.id,
        name: currentCustomItem.name,
        image: currentCustomItem.image,
        price: currentCustomItem.price,
        level: currentCustomItem.spicyAllowed ? selectedLevel : null,
        notes: notes,
        qty: customQty
      });
    }

    saveStorage(STORAGE_KEYS.CART, cart);
    updateCartUI();
    dom.customizationModalOverlay.classList.remove('active');
    playAudioTone('success');
  }

  function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = Math.round(subtotal * 0.1);
    const total = subtotal + tax;

    if (totalItems > 0) {
      dom.floatingCartBar.classList.add('visible');
      dom.floatingCartCount.textContent = totalItems;
      dom.floatingCartTotal.textContent = formatRupiah(subtotal);
      dom.floatingCartSubtitle = `${totalItems} item dalam keranjang`;
    } else {
      dom.floatingCartBar.classList.remove('visible');
    }

    const isDineIn = dom.typeDineInBtn.classList.contains('active');
    const tableNo = dom.tableNumberInput.value.trim();
    dom.cartOrderTypeDisplay.textContent = isDineIn ? (tableNo ? `Dine In (${tableNo})` : 'Dine In (Makan di Tempat)') : 'Bawa Pulang (Take Away)';

    dom.cartSubtotalVal.textContent = formatRupiah(subtotal);
    dom.cartTaxVal.textContent = formatRupiah(tax);
    dom.cartTotalVal.textContent = formatRupiah(total);

    if (!dom.cartItemsContainer) return;
    if (cart.length === 0) {
      dom.cartItemsContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 3rem; margin-bottom: 0.5rem;">🛒</div>
          <h4 style="font-size: 1.1rem; color: var(--text-main); font-weight: 800;">Keranjang Belanja Kosong</h4>
          <p style="font-size: 0.85rem;">Yuk pilih Mie Gacoan & dimsum favoritmu!</p>
        </div>
      `;
      dom.proceedToPaymentBtn.disabled = true;
      dom.proceedToPaymentBtn.style.opacity = '0.5';
    } else {
      dom.proceedToPaymentBtn.disabled = false;
      dom.proceedToPaymentBtn.style.opacity = '1';
      dom.cartItemsContainer.innerHTML = cart.map((ci, index) => `
        <div class="cart-item-card" data-index="${index}">
          <button type="button" class="btn-remove-item" data-index="${index}" title="Hapus Item">✕</button>
          <img src="${ci.image}" alt="${ci.name}" class="cart-item-thumb">
          <div class="cart-item-content">
            <h4 class="cart-item-title">${ci.name}</h4>
            ${ci.level !== null ? `<span class="cart-item-meta">🌶️ Level ${ci.level}</span>` : ''}
            ${ci.notes ? `<p class="cart-item-notes">"${ci.notes}"</p>` : ''}
            <div class="cart-item-bottom">
              <span class="cart-item-price">${formatRupiah(ci.price * ci.qty)}</span>
              <div class="quantity-stepper">
                <button type="button" class="qty-btn btn-cart-minus" data-index="${index}">-</button>
                <span class="qty-display">${ci.qty}</span>
                <button type="button" class="qty-btn btn-cart-plus" data-index="${index}">+</button>
              </div>
            </div>
          </div>
        </div>
      `).join('');

      dom.cartItemsContainer.querySelectorAll('.btn-cart-minus').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
          if (cart[idx].qty > 1) {
            cart[idx].qty -= 1;
          } else {
            cart.splice(idx, 1);
          }
          saveStorage(STORAGE_KEYS.CART, cart);
          updateCartUI();
        });
      });

      dom.cartItemsContainer.querySelectorAll('.btn-cart-plus').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
          cart[idx].qty += 1;
          saveStorage(STORAGE_KEYS.CART, cart);
          updateCartUI();
        });
      });

      dom.cartItemsContainer.querySelectorAll('.btn-remove-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
          cart.splice(idx, 1);
          saveStorage(STORAGE_KEYS.CART, cart);
          updateCartUI();
        });
      });
    }
  }

  // ==========================================================================
  // CHECKOUT & PAYMENT
  // ==========================================================================
  function openPaymentModal() {
    if (cart.length === 0) return;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = Math.round(subtotal * 0.1);
    const total = subtotal + tax;
    const isDineIn = dom.typeDineInBtn.classList.contains('active');
    const tableNo = dom.tableNumberInput.value.trim();

    dom.paymentTotalAmount.textContent = formatRupiah(total);
    dom.paymentOrderTypeInfo.textContent = isDineIn ? (tableNo ? `Makan di Tempat (${tableNo})` : 'Makan di Tempat (Dine In)') : 'Bawa Pulang (Take Away)';

    startQrisTimer();
    dom.cartDrawerOverlay.classList.remove('active');
    dom.paymentModalOverlay.classList.add('active');
  }

  function startQrisTimer() {
    clearInterval(qrisTimerInterval);
    let secondsLeft = 15 * 60;
    function tick() {
      const mins = Math.floor(secondsLeft / 60);
      const secs = secondsLeft % 60;
      dom.qrisTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      if (secondsLeft <= 0) clearInterval(qrisTimerInterval);
      secondsLeft--;
    }
    tick();
    qrisTimerInterval = setInterval(tick, 1000);
  }

  async function processPaymentSuccess() {
    if (cart.length === 0) return;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = Math.round(subtotal * 0.1);
    const total = subtotal + tax;
    const isDineIn = dom.typeDineInBtn.classList.contains('active');
    const tableNo = isDineIn ? (dom.tableNumberInput.value.trim() || 'Meja -') : '-';
    const customerName = dom.customerNameInput.value.trim() || 'Pelanggan';

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const newOrderId = `GC-${randomDigits}`;

    const newOrder = {
      id: newOrderId,
      customerName: customerName,
      orderType: isDineIn ? 'Dine In' : 'Take Away',
      tableNumber: tableNo,
      paymentMethod: selectedPaymentMethod,
      status: 'Menunggu Konfirmasi',
      createdAt: new Date().toISOString(),
      items: JSON.parse(JSON.stringify(cart)),
      subtotal,
      tax,
      total
    };

    // Send to Server API
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      });
    } catch (e) {}

    // Save to local storage & broadcast
    orders.unshift(newOrder);
    saveStorage(STORAGE_KEYS.ORDERS, orders);

    activeOrderId = newOrderId;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ORDER_ID, activeOrderId);

    if (broadcastSync) {
      broadcastSync.postMessage({ type: 'NEW_ORDER', order: newOrder });
    }

    cart = [];
    saveStorage(STORAGE_KEYS.CART, cart);
    updateCartUI();

    dom.paymentModalOverlay.classList.remove('active');
    clearInterval(qrisTimerInterval);

    playAudioTone('success');
    updateActiveOrderHeaderPill();
    openTrackerModal(newOrderId);
  }

  // ==========================================================================
  // LIVE ORDER TRACKER & RECEIPT
  // ==========================================================================
  function updateActiveOrderHeaderPill() {
    if (!activeOrderId) {
      dom.headerActiveOrderPill.style.display = 'none';
      return;
    }
    const order = orders.find(o => o.id === activeOrderId);
    if (!order) {
      dom.headerActiveOrderPill.style.display = 'none';
      return;
    }

    dom.headerActiveOrderPill.style.display = 'inline-flex';
    dom.activeOrderPillText.textContent = `Pesanan #${order.id}: ${order.status}`;
  }

  function openTrackerModal(orderId) {
    const targetId = orderId || activeOrderId;
    const order = orders.find(o => o.id === targetId);
    if (!order) return;

    dom.trackerOrderId.textContent = `No. Pesanan: #${order.id} (${order.orderType} ${order.tableNumber !== '-' ? '- ' + order.tableNumber : ''})`;
    dom.trackerCurrentBadge.textContent = order.status;

    [dom.stepNodePending, dom.stepNodeCooking, dom.stepNodeReady, dom.stepNodeFinished].forEach(node => {
      node.classList.remove('active', 'completed');
    });

    if (order.status === 'Menunggu Konfirmasi') {
      dom.stepNodePending.classList.add('active');
      dom.trackerEstimatedTime.textContent = 'Estimasi waktu saji: 15 - 20 Menit';
    } else if (order.status === 'Sedang Dimasak') {
      dom.stepNodePending.classList.add('completed');
      dom.stepNodeCooking.classList.add('active');
      dom.trackerEstimatedTime.textContent = 'Estimasi waktu saji: 8 - 12 Menit';
    } else if (order.status === 'Siap Disajikan') {
      dom.stepNodePending.classList.add('completed');
      dom.stepNodeCooking.classList.add('completed');
      dom.stepNodeReady.classList.add('active');
      dom.trackerEstimatedTime.textContent = 'Pesanan SIAP! Silakan ambil atau tunggu diantar koki.';
    } else if (order.status === 'Selesai') {
      dom.stepNodePending.classList.add('completed');
      dom.stepNodeCooking.classList.add('completed');
      dom.stepNodeReady.classList.add('completed');
      dom.stepNodeFinished.classList.add('completed');
      dom.trackerEstimatedTime.textContent = 'Pesanan telah selesai. Terima kasih!';
    } else if (order.status === 'Dibatalkan') {
      dom.trackerCurrentBadge.textContent = 'Dibatalkan ❌';
      dom.trackerEstimatedTime.textContent = 'Pesanan ini telah dibatalkan.';
    }

    dom.trackerOrderItemsSummary.innerHTML = order.items.map(item => `
      <div style="display: flex; justify-content: space-between;">
        <span><strong>${item.qty}x</strong> ${item.name} ${item.level !== null ? `(Lv ${item.level})` : ''}</span>
        <span>${formatRupiah(item.price * item.qty)}</span>
      </div>
    `).join('');

    dom.trackerModalOverlay.classList.add('active');
  }


  // ==========================================================================
  // EVENT LISTENERS & SYNC
  // ==========================================================================
  function setupEventListeners() {
    dom.soundToggleBtn.addEventListener('click', () => {
      isSoundEnabled = !isSoundEnabled;
      localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, isSoundEnabled);
      dom.soundIcon.textContent = isSoundEnabled ? '🔔' : '🔕';
      if (isSoundEnabled) playAudioTone('bell');
    });

    dom.headerActiveOrderPill.addEventListener('click', () => {
      if (activeOrderId) openTrackerModal(activeOrderId);
    });

    dom.typeDineInBtn.addEventListener('click', () => {
      dom.typeDineInBtn.classList.add('active');
      dom.typeTakeAwayBtn.classList.remove('active');
      dom.tableSelectionGroup.style.display = 'flex';
      updateCartUI();
    });

    dom.typeTakeAwayBtn.addEventListener('click', () => {
      dom.typeTakeAwayBtn.classList.add('active');
      dom.typeDineInBtn.classList.remove('active');
      dom.tableSelectionGroup.style.display = 'none';
      updateCartUI();
    });

    dom.tableNumberInput.addEventListener('input', updateCartUI);

    dom.categoryTabsContainer.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        dom.categoryTabsContainer.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentCategory = e.currentTarget.getAttribute('data-category');
        renderMenuGrid();
      });
    });

    dom.menuSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderMenuGrid();
    });

    dom.openCartDrawerBtn.addEventListener('click', () => {
      dom.cartDrawerOverlay.classList.add('active');
    });

    dom.closeCartDrawerBtn.addEventListener('click', () => {
      dom.cartDrawerOverlay.classList.remove('active');
    });

    dom.cartDrawerOverlay.addEventListener('click', (e) => {
      if (e.target === dom.cartDrawerOverlay) dom.cartDrawerOverlay.classList.remove('active');
    });

    dom.customModalQtyMinus.addEventListener('click', () => {
      if (customQty > 1) {
        customQty--;
        dom.customModalQtyVal.textContent = customQty;
        updateCustomModalSubtotal();
      }
    });

    dom.customModalQtyPlus.addEventListener('click', () => {
      customQty++;
      dom.customModalQtyVal.textContent = customQty;
      updateCustomModalSubtotal();
    });

    dom.closeCustomizationModalBtn.addEventListener('click', () => {
      dom.customizationModalOverlay.classList.remove('active');
    });

    dom.customizationModalOverlay.addEventListener('click', (e) => {
      if (e.target === dom.customizationModalOverlay) dom.customizationModalOverlay.classList.remove('active');
    });

    dom.customModalAddToCartBtn.addEventListener('click', addItemToCart);
    dom.proceedToPaymentBtn.addEventListener('click', openPaymentModal);

    dom.closePaymentModalBtn.addEventListener('click', () => {
      dom.paymentModalOverlay.classList.remove('active');
      clearInterval(qrisTimerInterval);
    });

    dom.paymentModalOverlay.addEventListener('click', (e) => {
      if (e.target === dom.paymentModalOverlay) {
        dom.paymentModalOverlay.classList.remove('active');
        clearInterval(qrisTimerInterval);
      }
    });

    document.querySelectorAll('.pay-method-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.pay-method-btn').forEach(b => b.classList.remove('selected'));
        const target = e.currentTarget;
        target.classList.add('selected');
        selectedPaymentMethod = target.getAttribute('data-method');

        if (selectedPaymentMethod === 'Tunai di Kasir') {
          dom.qrisPaymentBox.style.display = 'none';
          dom.cashPaymentBox.style.display = 'block';
        } else {
          dom.qrisPaymentBox.style.display = 'flex';
          dom.cashPaymentBox.style.display = 'none';
        }
      });
    });

    dom.simulatePaymentSuccessBtn.addEventListener('click', processPaymentSuccess);

    dom.closeTrackerModalBtn.addEventListener('click', () => {
      dom.trackerModalOverlay.classList.remove('active');
    });

    dom.trackerModalOverlay.addEventListener('click', (e) => {
      if (e.target === dom.trackerModalOverlay) dom.trackerModalOverlay.classList.remove('active');
    });

    if (dom.closeTrackerModalFooterBtn) {
      dom.closeTrackerModalFooterBtn.addEventListener('click', () => {
        dom.trackerModalOverlay.classList.remove('active');
      });
    }

    // Cross-tab & Broadcast Sync
    if (broadcastSync) {
      broadcastSync.onmessage = (e) => {
        if (e.data.type === 'STATUS_UPDATE' || e.data.type === 'MENU_UPDATE') {
          fetchServerState();
        }
      };
    }

    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEYS.ORDERS) {
        orders = loadStorage(STORAGE_KEYS.ORDERS, []);
        updateActiveOrderHeaderPill();
        if (dom.trackerModalOverlay.classList.contains('active') && activeOrderId) {
          openTrackerModal(activeOrderId);
        }
      } else if (e.key === STORAGE_KEYS.MENU) {
        menuItems = loadStorage(STORAGE_KEYS.MENU, window.DEFAULT_MENU_ITEMS || []);
        renderMenuGrid();
      }
    });

    // Auto-polling sync with backend server every 2.5 seconds
    setInterval(fetchServerState, 2500);
  }

  function init() {
    dom.soundIcon.textContent = isSoundEnabled ? '🔔' : '🔕';
    renderMenuGrid();
    updateCartUI();
    updateActiveOrderHeaderPill();
    setupEventListeners();
    fetchServerState();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
