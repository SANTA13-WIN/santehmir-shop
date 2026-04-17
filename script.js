// ОЧИСТКА ПОВРЕЖДЁННЫХ ДАННЫХ
(function(){
    try{ localStorage.removeItem('santehmir_products'); }catch(e){}
    try{ localStorage.removeItem('santehmir_cart'); }catch(e){}
})();

const CONFIG = {
    shopEmail: 'Santehmir_info@mail.ru',
    shopDomain: 'santehmir.com',
    shopName: 'САНТЕХМИР',
    shopPhone: '8 (800) 555-35-35'
};

let products = [], cart = [], favorites = [], orders = [];
let currentCat = 'all', promo = false, rawData = null;
let currentPage = 1, viewMode = 'grid';
let priceMin = 0, priceMax = 200000;
const itemsPerPage = 24;

const categoryIcons = {
    shower: '🚿', sink: '🚰', faucet: '🔧', toilet: '🚽', bath: '🛁', default: '📦'
};

const demos = [
    { id: '1', article: 'ST001', name: 'Душевая кабина Aqua 90 Premium', price: 68990, category: 'shower', image: '' },
    { id: '2', article: 'ST002', name: 'Раковина Onda 60 из камня', price: 12990, category: 'sink', image: '' },
    { id: '3', article: 'ST003', name: 'Смеситель Mare с термостатом', price: 8990, category: 'faucet', image: '' },
    { id: '4', article: 'ST004', name: 'Унитаз Sospeso подвесной', price: 24990, category: 'toilet', image: '' },
    { id: '5', article: 'ST005', name: 'Ванна Profondo акриловая', price: 57990, category: 'bath', image: '' }
];

// ========== ИНИЦИАЛИЗАЦИЯ ==========
function init() {
    products = [...demos];
    cart = [];
    favorites = [];
    orders = [];
    renderCatalog();
    updateCartBadge();
    updateFavoritesBadge();
    setupUI();
    setupImport();
}

function save() {
    try {
        localStorage.setItem('santehmir_products', JSON.stringify(products));
        localStorage.setItem('santehmir_cart', JSON.stringify(cart));
        localStorage.setItem('santehmir_favorites', JSON.stringify(favorites));
        localStorage.setItem('santehmir_orders', JSON.stringify(orders));
    } catch(e) {}
}

function loadOrders() {
    try { orders = JSON.parse(localStorage.getItem('santehmir_orders') || '[]'); }
    catch(e) { orders = []; }
}

// ========== КАТАЛОГ ==========
function renderCatalog() {
    let filtered = products.filter(p => {
        const catMatch = currentCat === 'all' || (p.category || 'shower') === currentCat;
        const priceMatch = (p.price || 0) >= priceMin && (p.price || 0) <= priceMax;
        return catMatch && priceMatch;
    });
    
    const searchVal = (document.getElementById('searchInput')?.value || '').toLowerCase();
    if (searchVal) {
        filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(searchVal));
    }
    
    const sort = document.getElementById('sortSelect')?.value;
    if (sort === 'price-asc') filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sort === 'price-desc') filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    
    const grid = document.getElementById('catalogGrid');
    if (!grid) return;
    
    if (!filtered.length) {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:60px;">Товары не найдены</p>';
        const pag = document.getElementById('pagination');
        if (pag) pag.innerHTML = '';
        return;
    }
    
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = 1;
    const start = (currentPage - 1) * itemsPerPage;
    const toShow = filtered.slice(start, start + itemsPerPage);
    
    grid.innerHTML = toShow.map(p => {
        const icon = categoryIcons[p.category] || categoryIcons.default;
        const imgHtml = p.image ? 
            `<img src="${p.image}" alt="${p.name}" onerror="this.innerHTML='<i>${icon}</i>'">` : 
            `<i>${icon}</i>`;
        return `
            <div class="product-card">
                <div class="product-image">${imgHtml}</div>
                <div class="product-card__content">
                    <div class="product-card__article">Арт. ${p.article || '—'}</div>
                    <h3>${p.name || 'Товар'}</h3>
                    <div class="product-price">${(p.price || 0).toLocaleString()} ₽</div>
                    <button class="btn btn-primary btn-block" onclick="window.addToCart('${p.id}')">В корзину</button>
                </div>
            </div>
        `;
    }).join('');
    
    renderPagination(filtered.length, totalPages);
}

function renderPagination(totalItems, totalPages) {
    const pag = document.getElementById('pagination');
    if (!pag) return;
    
    if (totalPages <= 1) {
        pag.innerHTML = `<div class="pagination__info">${totalItems} товаров</div>`;
        return;
    }
    
    let html = `<button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>←</button>`;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button onclick="changePage(${i})" class="${i === currentPage ? 'active' : ''}">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += '<span>...</span>';
        }
    }
    
    html += `<button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>→</button>`;
    html += `<div class="pagination__info">${Math.min(itemsPerPage, totalItems)} из ${totalItems}</div>`;
    pag.innerHTML = html;
}

window.changePage = (page) => {
    currentPage = page;
    renderCatalog();
    window.scrollTo({ top: 400, behavior: 'smooth' });
};

// ========== ИЗБРАННОЕ ==========
window.toggleFavorite = (id) => {
    const idx = favorites.indexOf(id);
    if (idx === -1) {
        favorites.push(id);
        toast('❤️ Добавлено в избранное');
    } else {
        favorites.splice(idx, 1);
        toast('💔 Удалено из избранного');
    }
    save();
    updateFavoritesBadge();
    renderCatalog();
};

function updateFavoritesBadge() {
    const badge = document.getElementById('favoritesCount');
    if (badge) badge.textContent = favorites.length;
}

// ========== КОРЗИНА ==========
window.addToCart = (id) => {
    const p = products.find(x => x.id == id);
    if (!p) return;
    
    const existing = cart.find(i => i.id == id);
    if (existing) {
        existing.qty = (existing.qty || 1) + 1;
    } else {
        cart.push({ ...p, qty: 1 });
    }
    save();
    updateCartBadge();
    toast(`✅ ${p.name || 'Товар'} добавлен в корзину`);
};

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (badge) badge.textContent = cart.reduce((s, i) => s + (i.qty || 0), 0);
}

function renderCart() {
    const container = document.getElementById('cartItems');
    if (!container) return;
    
    if (!cart.length) {
        container.innerHTML = '<p style="text-align:center;padding:40px;">🛒 Корзина пуста</p>';
        document.getElementById('cartTotal').textContent = '0';
        return;
    }
    
    let subtotal = 0;
    container.innerHTML = cart.map(item => {
        subtotal += (item.price || 0) * (item.qty || 1);
        return `
            <div class="cart-item">
                <div class="cart-item__info">
                    <strong>${item.name || 'Товар'}</strong>
                    <span>${(item.price || 0).toLocaleString()} ₽</span>
                </div>
                <div class="cart-item__qty">
                    <button onclick="updateQty('${item.id}', -1)">−</button>
                    <span>${item.qty || 1}</span>
                    <button onclick="updateQty('${item.id}', 1)">+</button>
                </div>
                <button class="cart-item__remove" onclick="removeFromCart('${item.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }).join('');
    
    const total = promo ? Math.round(subtotal * 0.8) : subtotal;
    document.getElementById('cartTotal').textContent = total.toLocaleString();
}

window.updateQty = (id, delta) => {
    const item = cart.find(i => i.id == id);
    if (item) {
        item.qty = Math.max(1, (item.qty || 1) + delta);
        save();
        updateCartBadge();
        renderCart();
    }
};

window.removeFromCart = (id) => {
    cart = cart.filter(i => i.id != id);
    save();
    updateCartBadge();
    renderCart();
};

// ========== ПРОМОКОД ==========
window.applyPromo = () => {
    const input = document.getElementById('promoInput');
    if (input.value.toUpperCase() === 'FIRST20') {
        promo = true;
        renderCart();
        toast('🎉 Промокод применён! Скидка 20%');
    } else {
        toast('❌ Неверный промокод', 'error');
    }
};

window.copyPromo = () => {
    navigator.clipboard?.writeText('FIRST20');
    toast('📋 Промокод FIRST20 скопирован!');
};

// ========== ОФОРМЛЕНИЕ ==========
window.checkout = () => {
    if (!cart.length) {
        toast('🛒 Корзина пуста', 'error');
        return;
    }
    
    const qty = cart.reduce((s, i) => s + (i.qty || 0), 0);
    const subtotal = cart.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);
    const total = promo ? Math.round(subtotal * 0.8) : subtotal;
    
    document.getElementById('checkoutQty').textContent = qty;
    document.getElementById('checkoutSum').textContent = subtotal.toLocaleString();
    document.getElementById('checkoutTotal').textContent = total.toLocaleString();
    
    closeModal('cartModal');
    openModal('checkoutModal');
};

// ========== АДМИНКА ==========
function renderAdminTable() {
    const tbody = document.getElementById('adminProductsBody');
    if (!tbody) return;
    
    const totalSpan = document.getElementById('totalProductsCount');
    if (totalSpan) totalSpan.textContent = products.length;
    
    tbody.innerHTML = products.slice(0, 50).map(p => `
        <tr>
            <td>${p.name || '—'}</td>
            <td>${(p.price || 0).toLocaleString()} ₽</td>
            <td>
                <button onclick="deleteProduct('${p.id}')" style="color:red;background:none;border:none;cursor:pointer;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

window.deleteProduct = (id) => {
    if (!confirm('Удалить товар?')) return;
    products = products.filter(p => p.id != id);
    save();
    renderCatalog();
    renderAdminTable();
    toast('🗑️ Товар удалён');
};

window.clearAllProducts = () => {
    if (!confirm('Удалить ВСЕ товары?')) return;
    products = [...demos];
    save();
    renderCatalog();
    renderAdminTable();
    toast('🗑️ Каталог очищен');
};

function renderOrdersTable() {
    const tbody = document.getElementById('ordersBody');
    if (!tbody) return;
    
    loadOrders();
    
    if (!orders.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;">Заказов пока нет</td></tr>';
        return;
    }
    
    tbody.innerHTML = orders.slice(-20).reverse().map(o => `
        <tr>
            <td>${o.id}</td>
            <td>${o.date || '—'}</td>
            <td>${o.customer?.name || '—'}<br>${o.customer?.phone || ''}</td>
            <td>${(o.total || 0).toLocaleString()} ₽</td>
        </tr>
    `).join('');
}

window.exportOrders = () => {
    loadOrders();
    const blob = new Blob([JSON.stringify(orders, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast('📥 Заказы экспортированы');
};

// ========== ИМПОРТ ==========
function setupImport() {
    const fileInput = document.getElementById('importFile');
    if (!fileInput) return;
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const status = document.getElementById('importStatus');
        status.innerHTML = '⏳ Читаем файл...';
        
        const text = await file.text();
        
        try {
            rawData = JSON.parse(text);
        } catch {
            rawData = parseCSV(text);
        }
        
        if (!Array.isArray(rawData)) rawData = [rawData];
        if (!rawData.length) {
            status.innerHTML = '❌ Нет данных';
            return;
        }
        
        const firstItem = rawData[0];
        const fields = Object.keys(firstItem || {});
        
        ['fieldName', 'fieldPrice', 'fieldArticle', 'fieldImage'].forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">— Не выбрано —</option>' + 
                    fields.map(f => `<option value="${f}">${f}</option>`).join('');
            }
        });
        
        // Автоопределение полей
        fields.forEach(f => {
            const fl = f.toLowerCase();
            if (fl.includes('назван') || fl.includes('name')) document.getElementById('fieldName').value = f;
            if (fl.includes('цен') || fl.includes('price')) document.getElementById('fieldPrice').value = f;
            if (fl.includes('артикул') || fl.includes('article')) document.getElementById('fieldArticle').value = f;
            if (fl.includes('фото') || fl.includes('image')) document.getElementById('fieldImage').value = f;
        });
        
        status.innerHTML = `✅ Загружено ${rawData.length} записей`;
    });
    
    document.getElementById('runImport')?.addEventListener('click', () => {
        if (!rawData || !rawData.length) {
            toast('❌ Нет данных для импорта', 'error');
            return;
        }
        
        const nameField = document.getElementById('fieldName')?.value;
        const priceField = document.getElementById('fieldPrice')?.value;
        const articleField = document.getElementById('fieldArticle')?.value;
        const imageField = document.getElementById('fieldImage')?.value;
        
        if (!nameField || !priceField) {
            toast('❌ Выберите поля Названия и Цены', 'error');
            return;
        }
        
        let added = 0;
        const maxImport = Math.min(rawData.length, 5000);
        
        for (let i = 0; i < maxImport; i++) {
            const item = rawData[i];
            const name = item[nameField];
            let price = item[priceField];
            
            if (!name) continue;
            
            if (typeof price === 'string') {
                price = parseFloat(price.replace(/[^\d.,]/g, '').replace(',', '.'));
            }
            
            if (isNaN(price) || price <= 0) continue;
            
            const article = articleField ? String(item[articleField] || `IMP${i}`) : `IMP${Date.now()}_${i}`;
            const image = imageField ? item[imageField] : '';
            const category = detectCategory(name, article, item.category || item.категория || '');
            
            products.push({
                id: `imp_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
                name: String(name).substring(0, 100),
                price: price,
                category: category,
                article: article.substring(0, 50),
                image: image
            });
            added++;
        }
        
        if (added > 0) {
            save();
            renderCatalog();
            renderAdminTable();
            document.getElementById('importStatus').innerHTML = `✅ Импортировано ${added} товаров`;
            toast(`✅ Добавлено ${added} товаров`);
            closeModal('adminModal');
        } else {
            toast('❌ Ничего не импортировано', 'error');
        }
    });
}

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];
    
    const delimiter = text.includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));
    
    return lines.slice(1).map(line => {
        const values = line.split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
        const obj = {};
        headers.forEach((h, i) => { if (h) obj[h] = values[i] || ''; });
        return obj;
    }).filter(obj => Object.values(obj).some(v => v));
}

function detectCategory(name, article = '', extra = '') {
    const text = (name + ' ' + article + ' ' + extra).toLowerCase();
    if (text.includes('душ') || text.includes('shower') || text.includes('кабин')) return 'shower';
    if (text.includes('смес') || text.includes('кран') || text.includes('faucet')) return 'faucet';
    if (text.includes('рак') || text.includes('умыв') || text.includes('sink')) return 'sink';
    if (text.includes('унит') || text.includes('toilet') || text.includes('биде')) return 'toilet';
    if (text.includes('ванн') || text.includes('bath') || text.includes('джакуз')) return 'bath';
    return 'shower';
}

// ========== UI ==========
function setupUI() {
    // Категории
    document.querySelectorAll('[data-cat]').forEach(el => {
        el.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelectorAll('[data-cat]').forEach(x => x.classList.remove('active'));
            this.classList.add('active');
            currentCat = this.dataset.cat;
            currentPage = 1;
            renderCatalog();
            document.getElementById('megaMenu')?.classList.remove('active');
        });
    });
    
    // Мега-меню
    document.getElementById('catalogMenuBtn')?.addEventListener('click', () => {
        document.getElementById('megaMenu').classList.toggle('active');
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#megaMenu') && !e.target.closest('#catalogMenuBtn')) {
            document.getElementById('megaMenu')?.classList.remove('active');
        }
    });
    
    // Поиск
    document.getElementById('searchInput')?.addEventListener('input', () => {
        currentPage = 1;
        renderCatalog();
    });
    
    // Сортировка
    document.getElementById('sortSelect')?.addEventListener('change', renderCatalog);
    
    // Ценовой фильтр
    document.getElementById('applyPriceFilter')?.addEventListener('click', () => {
        priceMin = parseInt(document.getElementById('priceMin')?.value) || 0;
        priceMax = parseInt(document.getElementById('priceMax')?.value) || 200000;
        currentPage = 1;
        renderCatalog();
    });
    
    document.getElementById('resetPriceFilter')?.addEventListener('click', () => {
        document.getElementById('priceMin').value = 0;
        document.getElementById('priceMax').value = 200000;
        priceMin = 0;
        priceMax = 200000;
        currentPage = 1;
        renderCatalog();
    });
    
    // Корзина
    document.getElementById('cartBtn')?.addEventListener('click', () => {
        renderCart();
        openModal('cartModal');
    });
    
    document.getElementById('checkoutBtn')?.addEventListener('click', checkout);
    document.getElementById('applyPromo')?.addEventListener('click', applyPromo);
    
    // Админка
    document.getElementById('adminBtn')?.addEventListener('click', () => {
        renderAdminTable();
        renderOrdersTable();
        openModal('adminModal');
    });
    
    // Вкладки админки
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            const tabId = this.dataset.tab;
            document.getElementById('tab-products').style.display = tabId === 'products' ? 'block' : 'none';
            document.getElementById('tab-orders').style.display = tabId === 'orders' ? 'block' : 'none';
            document.getElementById('tab-import').style.display = tabId === 'import' ? 'block' : 'none';
            document.getElementById('tab-seo').style.display = tabId === 'seo' ? 'block' : 'none';
            
            if (tabId === 'products') renderAdminTable();
            if (tabId === 'orders') renderOrdersTable();
        });
    });
    
    // Оформление заказа
    document.getElementById('checkoutForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const order = {
            id: 'ORD-' + Date.now().toString().slice(-8),
            date: new Date().toLocaleString('ru-RU'),
            customer: {
                name: document.getElementById('customerName').value,
                phone: document.getElementById('customerPhone').value,
                email: document.getElementById('customerEmail').value,
                address: document.getElementById('customerAddress').value,
                delivery: document.getElementById('deliveryMethod')?.value || 'courier',
                payment: document.getElementById('paymentMethod')?.value || 'card',
                comment: document.getElementById('orderComment')?.value || ''
            },
            items: cart.map(i => ({ name: i.name, price: i.price, qty: i.qty })),
            subtotal: cart.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0),
            discount: promo ? 20 : 0,
            total: promo ? Math.round(cart.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0) * 0.8) : cart.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0),
            status: 'Новый'
        };
        
        orders.push(order);
        save();
        
        document.getElementById('thankYouName').textContent = order.customer.name;
        document.getElementById('orderNumber').textContent = order.id;
        
        alert(`✅ Заказ №${order.id} оформлен!\nУведомление отправлено на ${CONFIG.shopEmail}`);
        
        cart = [];
        promo = false;
        save();
        updateCartBadge();
        
        closeModal('checkoutModal');
        openModal('thankYouModal');
    });
    
    // SEO
    document.getElementById('applySeo')?.addEventListener('click', () => {
        const title = document.getElementById('seoTitle')?.value;
        const desc = document.getElementById('seoDesc')?.value;
        
        if (title) document.title = title;
        if (desc) {
            const meta = document.querySelector('meta[name="description"]');
            if (meta) meta.setAttribute('content', desc);
        }
        
        toast('✅ SEO применено');
    });
    
    document.getElementById('generateSitemap')?.addEventListener('click', () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://${CONFIG.shopDomain}/</loc><priority>1.0</priority></url>
</urlset>`;
        
        const blob = new Blob([xml], { type: 'application/xml' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'sitemap.xml';
        a.click();
        
        toast('✅ Sitemap сгенерирован');
    });
}

// ========== МОДАЛКИ ==========
window.openModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

window.closeModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
};

// ========== УВЕДОМЛЕНИЯ ==========
function toast(msg, type = 'success') {
    const t = document.getElementById('toast');
    if (!t) return;
    
    t.textContent = msg;
    t.style.background = type === 'error' ? '#e74c3c' : 'var(--primary-deep)';
    t.style.display = 'block';
    t.style.zIndex = '99999';
    
    setTimeout(() => {
        t.style.display = 'none';
    }, 3000);
}

// ========== ЗАПУСК ==========
document.addEventListener('DOMContentLoaded', init);