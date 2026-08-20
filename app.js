/**
 * MIE GACOAN WEB APPLICATION - CORE LOGIC & STATE MANAGEMENT
 * Dual Interface: Customer Ordering & Kitchen Order Management (Merchant)
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. STATE INITIALIZATION & STORAGE KEYS
  // ==========================================================================
  const STORAGE_KEYS = {
    MENU: 'gacoan_menu_items_v1',
    CART: 'gacoan_active_cart_v1',
    ORDERS: 'gacoan_orders_list_v1',
    ACTIVE_ORDER_ID: 'gacoan_customer_active_order_id',
    SOUND_ENABLED: 'gacoan_sound_enabled'
  };

  // Sample initial orders for realistic demo
  const INITIAL_SAMPLE_ORDERS = [
    {
      id: 'GC-9081',
      customerName: 'Budi Santoso',
      orderType: 'Dine In',
      tableNumber: 'Meja 02',
      paymentMethod: 'QRIS',
      status: 'Sedang Dimasak',
      createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
      items: [
        { name: 'Mie Gacoan', level: 4, qty: 2, price: 11000, notes: 'Pangsit dipisah' },
        { name: 'Udang Keju (3 pcs)', level: null, qty: 1, price: 10000, notes: '' },
        { name: 'Es Gobak Sodor', level: null, qty: 2, price: 9000, notes: 'Manis sedang' }
      ],
      subtotal: 50000,
      tax: 5000,
      total: 55000
    },
    {
      id: 'GC-9082',
      customerName: 'Siti Rahma',
      orderType: 'Take Away',
      tableNumber: '-',
      paymentMethod: 'GoPay / OVO',
      status: 'Menunggu Konfirmasi',
      createdAt: new Date(Date.now() - 2 * 60000).toISOString(),
      items: [
        { name: 'Mie Hompimpa', level: 2, qty: 1, price: 11000, notes: 'Jangan pakai daun bawang' },
        { name: 'Udang Rambutan (3 pcs)', level: null, qty: 1, price: 10000, notes: '' },
        { name: 'Es Teklek', level: null, qty: 1, price: 6500, notes: '' }
      ],
      subtotal: 27500,
      tax: 2750,
      total: 30250
    }
  ];

  let menuItems = loadStorage(STORAGE_KEYS.MENU, window.DEFAULT_MENU_ITEMS || []);
  let cart = loadStorage(STORAGE_KEYS.CART, []);
  let orders = loadStorage(STORAGE_KEYS.ORDERS, INITIAL_SAMPLE_ORDERS);
  let activeOrderId = localStorage.getItem(STORAGE_KEYS.ACTIVE_ORDER_ID) || null;
  let isSoundEnabled = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED) !== 'false';

  // App UI State
  let currentCategory = 'all';
  let searchQuery = '';
  let merchantFilterStatus = 'all';
  let currentCustomItem = null;
  let selectedLevel = 1;
  let customQty = 1;
  let selectedPaymentMethod = 'QRIS';
  let qrisTimerInterval = null;

  // ==========================================================================
  // 2. HELPER FUNCTIONS & STORAGE UTILITIES
  // ==========================================================================
  function loadStorage(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.warn(`Failed to parse storage key ${key}:`, e);
      return fallback;
    }
  }

  function saveStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Failed to save storage key ${key}:`, e);
    }
  }

  function formatRupiah(number) {
    return 'Rp ' + Number(number || 0).toLocaleString('id-ID');
  }

  function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
      date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  }

  function getElapsedMinutes(isoString) {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / 60000);
    return mins <= 0 ? 'Baru saja' : `${mins} menit lalu`;
  }

  // ==========================================================================
  // 3. SOUND SYNTHESIZER (WEB AUDIO API)
  // ==========================================================================
  function playAudioTone(type = 'bell') {
    if (!isSoundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === 'bell') {
        // Multi-frequency pleasant kitchen order chime
        const freqs = [587.33, 880, 1174.66]; // D5, A5, D6
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
        // Success checkout sound
        const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
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
    } catch (err) {
      console.log('Audio Context error/blocked until interaction:', err);
    }
  }

  // ==========================================================================
  // 4. DOM ELEMENTS CACHING
  // ==========================================================================
  const dom = {
    // Mode switcher
    modeCustomerBtn: document.getElementById('modeCustomerBtn'),
    modeMerchantBtn: document.getElementById('modeMerchantBtn'),
    customerView: document.getElementById('customerView'),
    merchantView: document.getElementById('merchantView'),
    brandLogoBtn: document.getElementById('brandLogoBtn'),
    soundToggleBtn: document.getElementById('soundToggleBtn'),
    soundIcon: document.getElementById('soundIcon'),
    headerActiveOrderPill: document.getElementById('headerActiveOrderPill'),
    activeOrderPillText: document.getElementById('activeOrderPillText'),

    // Customer View
    typeDineInBtn: document.getElementById('typeDineInBtn'),
    typeTakeAwayBtn: document.getElementById('typeTakeAwayBtn'),
    tableSelectionGroup: document.getElementById('tableSelectionGroup'),
    tableNumberSelect: document.getElementById('tableNumberSelect'),
    customerNameInput: document.getElementById('customerNameInput'),
    categoryTabsContainer: document.getElementById('categoryTabsContainer'),
    menuSearchInput: document.getElementById('menuSearchInput'),
    menuGridContainer: document.getElementById('menuGridContainer'),

    // Floating Cart
    floatingCartBar: document.getElementById('floatingCartBar'),
    floatingCartCount: document.getElementById('floatingCartCount'),
    floatingCartTotal: document.getElementById('floatingCartTotal'),
    floatingCartSubtitle: document.getElementById('floatingCartSubtitle'),
    openCartDrawerBtn: document.getElementById('openCartDrawerBtn'),

    // Modals
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

    // Cart Drawer
    cartDrawerOverlay: document.getElementById('cartDrawerOverlay'),
    closeCartDrawerBtn: document.getElementById('closeCartDrawerBtn'),
    cartItemsContainer: document.getElementById('cartItemsContainer'),
    cartOrderTypeDisplay: document.getElementById('cartOrderTypeDisplay'),
    cartSubtotalVal: document.getElementById('cartSubtotalVal'),
    cartTaxVal: document.getElementById('cartTaxVal'),
    cartTotalVal: document.getElementById('cartTotalVal'),
    proceedToPaymentBtn: document.getElementById('proceedToPaymentBtn'),

    // Payment Modal
    paymentModalOverlay: document.getElementById('paymentModalOverlay'),
    closePaymentModalBtn: document.getElementById('closePaymentModalBtn'),
    paymentTotalAmount: document.getElementById('paymentTotalAmount'),
    paymentOrderTypeInfo: document.getElementById('paymentOrderTypeInfo'),
    qrisPaymentBox: document.getElementById('qrisPaymentBox'),
    cashPaymentBox: document.getElementById('cashPaymentBox'),
    qrisTimer: document.getElementById('qrisTimer'),
    simulatePaymentSuccessBtn: document.getElementById('simulatePaymentSuccessBtn'),

    // Tracker Modal
    trackerModalOverlay: document.getElementById('trackerModalOverlay'),
    closeTrackerModalBtn: document.getElementById('closeTrackerModalBtn'),
    trackerOrderId: document.getElementById('trackerOrderId'),
    trackerCurrentBadge: document.getElementById('trackerCurrentBadge'),
    trackerEstimatedTime: document.getElementById('trackerEstimatedTime'),
    trackerOrderItemsSummary: document.getElementById('trackerOrderItemsSummary'),
    stepNodePending: document.getElementById('stepNodePending'),
    stepNodeCooking: document.getElementById('stepNodeCooking'),
    stepNodeReady: document.getElementById('stepNodeReady'),
    stepNodeFinished: document.getElementById('stepNodeFinished'),
    openReceiptModalBtn: document.getElementById('openReceiptModalBtn'),

    // Receipt Modal
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
    printReceiptBtn: document.getElementById('printReceiptBtn'),

    // Merchant View
    refreshOrdersBtn: document.getElementById('refreshOrdersBtn'),
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
    merchantStockTableBody: document.getElementById('merchantStockTableBody')
  };

  // ==========================================================================
  // 5. CUSTOMER VIEW LOGIC & RENDERING
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

    // Attach click events for add item buttons
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

    // Show or hide spicy level selector
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

    // Update Floating Cart Bar
    if (totalItems > 0) {
      dom.floatingCartBar.classList.add('visible');
      dom.floatingCartCount.textContent = totalItems;
      dom.floatingCartTotal.textContent = formatRupiah(subtotal);
      dom.floatingCartSubtitle = `${totalItems} item dalam keranjang`;
    } else {
      dom.floatingCartBar.classList.remove('visible');
    }

    // Update Order Type in Cart
    const isDineIn = dom.typeDineInBtn.classList.contains('active');
    const tableNo = dom.tableNumberSelect.value;
    dom.cartOrderTypeDisplay.textContent = isDineIn ? `Dine In (${tableNo})` : 'Bawa Pulang (Take Away)';

    // Update Drawer Bills
    dom.cartSubtotalVal.textContent = formatRupiah(subtotal);
    dom.cartTaxVal.textContent = formatRupiah(tax);
    dom.cartTotalVal.textContent = formatRupiah(total);

    // Render Drawer Items
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

      // Cart Item Events
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
  // 6. CHECKOUT & PAYMENT FLOW
  // ==========================================================================
  function openPaymentModal() {
    if (cart.length === 0) return;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = Math.round(subtotal * 0.1);
    const total = subtotal + tax;
    const isDineIn = dom.typeDineInBtn.classList.contains('active');
    const tableNo = dom.tableNumberSelect.value;

    dom.paymentTotalAmount.textContent = formatRupiah(total);
    dom.paymentOrderTypeInfo.textContent = isDineIn ? `Makan di Tempat (${tableNo})` : 'Bawa Pulang (Take Away)';

    // Start QRIS Countdown
    startQrisTimer();

    dom.cartDrawerOverlay.classList.remove('active');
    dom.paymentModalOverlay.classList.add('active');
  }

  function startQrisTimer() {
    clearInterval(qrisTimerInterval);
    let secondsLeft = 15 * 60; // 15 minutes
    function tick() {
      const mins = Math.floor(secondsLeft / 60);
      const secs = secondsLeft % 60;
      dom.qrisTimer.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      if (secondsLeft <= 0) {
        clearInterval(qrisTimerInterval);
      }
      secondsLeft--;
    }
    tick();
    qrisTimerInterval = setInterval(tick, 1000);
  }

  function processPaymentSuccess() {
    if (cart.length === 0) return;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const tax = Math.round(subtotal * 0.1);
    const total = subtotal + tax;
    const isDineIn = dom.typeDineInBtn.classList.contains('active');
    const tableNo = isDineIn ? dom.tableNumberSelect.value : '-';
    const customerName = dom.customerNameInput.value.trim() || 'Pelanggan Gacoan';

    // Generate 4-digit Order ID
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

    // Save Order to list
    orders.unshift(newOrder);
    saveStorage(STORAGE_KEYS.ORDERS, orders);

    // Save Active Order for tracking
    activeOrderId = newOrderId;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ORDER_ID, activeOrderId);

    // Clear cart
    cart = [];
    saveStorage(STORAGE_KEYS.CART, cart);
    updateCartUI();

    // Close payment modal
    dom.paymentModalOverlay.classList.remove('active');
    clearInterval(qrisTimerInterval);

    // Play sounds
    playAudioTone('success');
    setTimeout(() => playAudioTone('bell'), 800);

    // Update active pill & open live tracker
    updateActiveOrderHeaderPill();
    openTrackerModal(newOrderId);
    renderMerchantOrders();
  }

  // ==========================================================================
  // 7. ORDER TRACKER & RECEIPT
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

    // Reset timeline classes
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
      dom.trackerEstimatedTime.textContent = 'Pesanan SIAP! Silakan ambil atau tunggu diantar.';
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

  function openReceiptModal(orderId) {
    const targetId = orderId || activeOrderId;
    const order = orders.find(o => o.id === targetId);
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

    dom.trackerModalOverlay.classList.remove('active');
    dom.receiptModalOverlay.classList.add('active');
  }

  // ==========================================================================
  // 8. MERCHANT / KITCHEN VIEW LOGIC & RENDERING
  // ==========================================================================
  function renderMerchantKPIs() {
    const validOrders = orders.filter(o => o.status !== 'Dibatalkan');
    const totalRevenue = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const activeKitchenCount = orders.filter(o => o.status === 'Menunggu Konfirmasi' || o.status === 'Sedang Dimasak').length;

    // Calculate Best Seller
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

    // Update Filter Badges
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
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted); background: white; border-radius: var(--radius-md); border: 1px dashed var(--border-light);">
          <div style="font-size: 3rem; margin-bottom: 0.5rem;">👨‍🍳</div>
          <h3 style="font-size: 1.2rem; color: var(--text-main); font-weight: 800;">Tidak Ada Pesanan pada Kategori Ini</h3>
          <p style="font-size: 0.88rem;">Pesanan baru yang masuk dari pemesan akan otomatis muncul di sini secara real-time.</p>
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
          <button type="button" class="btn-kitchen-action btn-merchant-receipt" data-id="${order.id}" style="background: #e2e8f0; color: #0f172a;">
            🖨️ Struk
          </button>
        `;
      }

      return `
        <article class="order-kitchen-card ${statusClass}">
          <div class="order-card-header">
            <div>
              <span class="order-id-tag">#${order.id}</span>
              <span style="font-size: 0.75rem; color: var(--text-muted); display: block;">${formatTime(order.createdAt)}</span>
            </div>
            <span class="order-time-elapsed">⏱️ ${getElapsedMinutes(order.createdAt)}</span>
          </div>

          <div class="order-customer-info">
            <span class="customer-pill">👤 ${order.customerName}</span>
            <span class="type-pill ${order.orderType === 'Dine In' ? 'dinein' : 'takeaway'}">
              ${order.orderType} ${order.tableNumber !== '-' ? `(${order.tableNumber})` : ''}
            </span>
          </div>

          <div class="order-items-scroll">
            ${order.items.map(item => `
              <div class="order-item-row">
                <div>
                  <span class="item-qty-name">${item.qty}x ${item.name}</span>
                  ${item.level !== null ? `<span class="item-level-tag">Lv ${item.level}</span>` : ''}
                  ${item.notes ? `<div class="order-notes-tag">📝 "${item.notes}"</div>` : ''}
                </div>
                <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted);">${formatRupiah(item.price * item.qty)}</span>
              </div>
            `).join('')}
          </div>

          <div class="order-card-footer">
            <div style="font-size: 0.85rem; font-weight: 900; color: var(--text-main); margin-right: 0.5rem;">
              ${formatRupiah(order.total)}
            </div>
            <div style="display: flex; gap: 0.4rem; flex: 1;">
              ${actionButtons}
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach Status Update Events
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

  function updateOrderStatus(orderId, nextStatus) {
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;

    orders[orderIndex].status = nextStatus;
    saveStorage(STORAGE_KEYS.ORDERS, orders);

    playAudioTone('success');
    renderMerchantOrders();
    updateActiveOrderHeaderPill();

    // If tracker is open for this order, update it
    if (dom.trackerModalOverlay.classList.contains('active')) {
      openTrackerModal(orderId);
    }
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
            ${item.spicyAllowed ? '<span style="font-size:0.7rem; color:#dc2626; display:block;">Pedas Level 0-8</span>' : ''}
          </td>
          <td><span style="text-transform: capitalize; color: var(--text-muted);">${item.category}</span></td>
          <td><strong>${formatRupiah(item.price)}</strong></td>
          <td>
            <span style="font-weight: 800; font-size: 0.8rem; color: ${isAvailable ? '#059669' : '#dc2626'};">
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

    // Toggle stock change
    dom.merchantStockTableBody.querySelectorAll('.stock-toggle-checkbox').forEach(input => {
      input.addEventListener('change', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const isChecked = e.currentTarget.checked;
        const itemIdx = menuItems.findIndex(m => m.id === id);
        if (itemIdx > -1) {
          menuItems[itemIdx].isAvailable = isChecked;
          saveStorage(STORAGE_KEYS.MENU, menuItems);
          renderMenuGrid();
          renderMerchantStockTable();
        }
      });
    });
  }

  // ==========================================================================
  // 9. EVENT LISTENERS & CROSS-TAB SYNC
  // ==========================================================================
  function setupEventListeners() {
    // Mode Switcher Tabs
    dom.modeCustomerBtn.addEventListener('click', () => switchView('customer'));
    dom.modeMerchantBtn.addEventListener('click', () => switchView('merchant'));
    dom.brandLogoBtn.addEventListener('click', () => switchView('customer'));

    // Sound Toggle
    dom.soundToggleBtn.addEventListener('click', () => {
      isSoundEnabled = !isSoundEnabled;
      localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, isSoundEnabled);
      dom.soundIcon.textContent = isSoundEnabled ? '🔔' : '🔕';
      if (isSoundEnabled) playAudioTone('bell');
    });

    // Active Order Header Pill
    dom.headerActiveOrderPill.addEventListener('click', () => {
      if (activeOrderId) openTrackerModal(activeOrderId);
    });

    // Dine In vs Takeaway Toggle
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

    dom.tableNumberSelect.addEventListener('change', updateCartUI);

    // Category Tabs Filter
    dom.categoryTabsContainer.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        dom.categoryTabsContainer.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentCategory = e.currentTarget.getAttribute('data-category');
        renderMenuGrid();
      });
    });

    // Search Input
    dom.menuSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderMenuGrid();
    });

    // Floating Cart & Drawer
    dom.openCartDrawerBtn.addEventListener('click', () => {
      dom.cartDrawerOverlay.classList.add('active');
    });

    dom.closeCartDrawerBtn.addEventListener('click', () => {
      dom.cartDrawerOverlay.classList.remove('active');
    });

    dom.cartDrawerOverlay.addEventListener('click', (e) => {
      if (e.target === dom.cartDrawerOverlay) dom.cartDrawerOverlay.classList.remove('active');
    });

    // Customization Modal Steppers & Submit
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

    // Payment Modal
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

    // Payment Methods selection
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

    // Tracker Modal
    dom.closeTrackerModalBtn.addEventListener('click', () => {
      dom.trackerModalOverlay.classList.remove('active');
    });

    dom.trackerModalOverlay.addEventListener('click', (e) => {
      if (e.target === dom.trackerModalOverlay) dom.trackerModalOverlay.classList.remove('active');
    });

    dom.openReceiptModalBtn.addEventListener('click', () => {
      openReceiptModal(activeOrderId);
    });

    // Receipt Modal
    dom.closeReceiptModalBtn.addEventListener('click', () => {
      dom.receiptModalOverlay.classList.remove('active');
    });

    dom.receiptModalOverlay.addEventListener('click', (e) => {
      if (e.target === dom.receiptModalOverlay) dom.receiptModalOverlay.classList.remove('active');
    });

    dom.printReceiptBtn.addEventListener('click', () => {
      window.print();
    });

    // Merchant Order Filter Group
    dom.merchantOrderFilterGroup.querySelectorAll('.merchant-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        dom.merchantOrderFilterGroup.querySelectorAll('.merchant-filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        merchantFilterStatus = e.currentTarget.getAttribute('data-status');
        renderMerchantOrders();
      });
    });

    dom.refreshOrdersBtn.addEventListener('click', () => {
      orders = loadStorage(STORAGE_KEYS.ORDERS, []);
      renderMerchantOrders();
      renderMerchantStockTable();
    });

    // Real-time synchronization across browser tabs
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEYS.ORDERS) {
        const oldLength = orders.length;
        orders = loadStorage(STORAGE_KEYS.ORDERS, []);
        if (orders.length > oldLength) {
          playAudioTone('bell');
        }
        renderMerchantOrders();
        updateActiveOrderHeaderPill();
        if (dom.trackerModalOverlay.classList.contains('active') && activeOrderId) {
          openTrackerModal(activeOrderId);
        }
      } else if (e.key === STORAGE_KEYS.MENU) {
        menuItems = loadStorage(STORAGE_KEYS.MENU, window.DEFAULT_MENU_ITEMS || []);
        renderMenuGrid();
        renderMerchantStockTable();
      }
    });
  }

  function switchView(viewName) {
    if (viewName === 'customer') {
      dom.modeCustomerBtn.classList.add('active');
      dom.modeMerchantBtn.classList.remove('active', 'merchant-active');
      dom.customerView.classList.add('active-view');
      dom.merchantView.classList.remove('active-view');
      renderMenuGrid();
    } else {
      dom.modeMerchantBtn.classList.add('active', 'merchant-active');
      dom.modeCustomerBtn.classList.remove('active');
      dom.merchantView.classList.add('active-view');
      dom.customerView.classList.remove('active-view');
      renderMerchantOrders();
      renderMerchantStockTable();
    }
  }

  // ==========================================================================
  // 10. INITIALIZATION
  // ==========================================================================
  function init() {
    dom.soundIcon.textContent = isSoundEnabled ? '🔔' : '🔕';
    renderMenuGrid();
    updateCartUI();
    updateActiveOrderHeaderPill();
    renderMerchantOrders();
    renderMerchantStockTable();
    setupEventListeners();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
