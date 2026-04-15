// ==================== НАСТРОЙКИ ====================
const CONFIG = {
    telegramBotToken: '',
    telegramChatId: '',
    shopName: 'САНТЕХМИР',
    shopPhone: '8 (800) 555-35-35'
};

// ==================== СОСТОЯНИЕ ====================
let products = [];
let cart = [];
let favorites = [];
let orders = [];
let currentCat = 'all';
let promo = false;
let rawData = null;
let currentPage = 1;
const itemsPerPage = 24;
let viewMode = 'grid';

const categoryIcons = {
    shower: '🚿', sink: '🚰', faucet: '🔧', toilet: '🚽', bath: '🛁', default: '📦'
};

// ==================== ДЕМО-ТОВАРЫ ====================
const demos = [
    { id: '1', article: 'ST001', name: 'Душевая кабина Aqua 90 Premium', price: 68990, category: 'shower', image: '' },
    { id: '2', article: 'ST002', name: 'Раковина Onda 60 из камня', price: 12990, category: 'sink', image: '' },
    { id: '3', article: 'ST003', name: 'Смеситель Mare с термостатом', price: 8990, category: 'faucet', image: '' },
    { id: '4', article: 'ST004', name: 'Унитаз Sospeso подвесной', price: 24990, category: 'toilet', image: '' },
    { id: '5', article: 'ST005', name: 'Ванна Profondo акриловая', price: 57990, category: 'bath', image: '' }
];

// ==================== СЖАТИЕ ДАННЫХ ====================
function compressProducts(prods) {
    return JSON.stringify(prods.map(p => ({
        i: p.id || ('p' + Date.now() + Math.random()),
        n: (p.name || '').substring(0, 100),
        p: p.price || 0,
        c: p.category || 'shower',
        a: (p.article || '').substring(0, 50),
        img: p.image || ''
    })));
}

function decompressProducts(json) {
    try {
        return JSON.parse(json).map(p => ({
            id: p.i, name: p.n, price: p.p, category: p.c, article: p.a, image: p.img
        }));
    } catch(e) { return [...demos]; }
}

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
function init() {
    loadFromStorage();
    if (!products.length) products = [...demos];
    renderCatalog();
    updateCartBadge();
    updateFavoritesBadge();
    setupUI();
    setupImport();
    loadOrders();
}

function loadFromStorage() {
    try {
        const saved = localStorage.getItem('santehmir_products');
        products = saved ? decompressProducts(saved) : [];
        cart = JSON.parse(localStorage.getItem('santehmir_cart') || '[]');
        favorites = JSON.parse(localStorage.getItem('santehmir_favorites') || '[]');
    } catch(e) { products = [...demos]; cart = []; favorites = []; }
}

function save() {
    try {
        localStorage.setItem('santehmir_products', compressProducts(products));
        localStorage.setItem('santehmir_cart', JSON.stringify(cart));
        localStorage.setItem('santehmir_favorites', JSON.stringify(favorites));
        localStorage.setItem('santehmir_orders', JSON.stringify(orders));
    } catch(e) { console.error('Save error:', e); }
}

function loadOrders() {
    try { orders = JSON.parse(localStorage.getItem('santehmir_orders') || '[]'); }
    catch(e) { orders = []; }
}

// ==================== КАТАЛОГ ====================
function renderCatalog() {
    let filtered = products.filter(p => currentCat === 'all' || p.category === currentCat);
    const searchVal = (document.getElementById('searchInput')?.value || '').toLowerCase();
    if (searchVal) filtered = filtered.filter(p => (p.name || '').toLowerCase().includes(searchVal));
    
    const sort = document.getElementById('sortSelect')?.value;
    if (sort === 'price-asc') filtered.sort((a,b) => a.price - b.price);
    if (sort === 'price-desc') filtered.sort((a,b) => b.price - a.price);
    
    const grid = document.getElementById('catalogGrid');
    if (!grid) return;
    
    if (!filtered.length) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;"><i class="fas fa-search" style="font-size:48px;opacity:0.3;margin-bottom:20px;"></i><h3>Товары не найдены</h3></div>`;
        document.getElementById('pagination').innerHTML = '';
        return;
    }
    
    const totalPages = Math.ceil(filtered.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = 1;
    const start = (currentPage - 1) * itemsPerPage;
    const toShow = filtered.slice(start, start + itemsPerPage);
    
    grid.className = viewMode === 'grid' ? 'catalog__grid' : 'catalog__list';
    
    grid.innerHTML = toShow.map(p => {
        const icon = categoryIcons[p.category] || categoryIcons.default;
        const isFav = favorites.includes(p.id);
        const imageHtml = p.image ? 
            `<img src="${p.image}" alt="${p.name}" onerror="this.parentElement.innerHTML='<i>${icon}</i>'">` : 
            `<i>${icon}</i>`;
        
        return viewMode === 'grid' ? `
            <div class="product-card">
                <div class="product-image">${imageHtml}</div>
                <button class="product-card__favorite ${isFav ? 'active' : ''}" onclick="toggleFavorite('${p.id}')"><i class="${isFav ? 'fas' : 'far'} fa-heart"></i></button>
                <div class="product-card__content">
                    <div class="product-card__article">Арт. ${p.article || '—'}</div>
                    <h3>${p.name}</h3>
                    <div class="product-price">${p.price.toLocaleString()} ₽</div>
                    <button class="btn btn-primary" onclick="addToCart('${p.id}')"><i class="fas fa-cart-plus"></i> В корзину</button>
                </div>
            </div>
        ` : `
            <div class="product-list-item">
                <div class="product-list-item__image">${imageHtml}</div>
                <div class="product-list-item__info">
                    <div class="product-card__article">Арт. ${p.article || '—'}</div>
                    <h3>${p.name}</h3>
                    <p class="product-list-item__desc">Премиальное качество</p>
                </div>
                <div class="product-list-item__price">
                    <div class="product-price">${p.price.toLocaleString()} ₽</div>
                    <button class="btn btn-primary" onclick="addToCart('${p.id}')"><i class="fas fa-cart-plus"></i> В корзину</button>
                </div>
            </div>
        `;
    }).join('');
    
    renderPagination(filtered.length, totalPages);
}

function renderPagination(totalItems, totalPages) {
    const pag = document.getElementById('pagination');
    if (totalPages <= 1) { pag.innerHTML = `<div class="pagination__info">${totalItems} товаров</div>`; return; }
    let html = `<button onclick="changePage(${currentPage-1})" ${currentPage===1?'disabled':''}><i class="fas fa-chevron-left"></i></button>`;
    for (let i=1; i<=totalPages; i++) {
        if (i===1 || i===totalPages || (i>=currentPage-2 && i<=currentPage+2)) {
            html += `<button onclick="changePage(${i})" class="${i===currentPage?'active':''}">${i}</button>`;
        } else if (i===currentPage-3 || i===currentPage+3) html += `<span>...</span>`;
    }
    html += `<button onclick="changePage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}><i class="fas fa-chevron-right"></i></button>`;
    html += `<div class="pagination__info">${Math.min(itemsPerPage, totalItems)} из ${totalItems}</div>`;
    pag.innerHTML = html;
}

window.changePage = (page) => { currentPage = page; renderCatalog(); window.scrollTo({top:400,behavior:'smooth'}); };
window.toggleFavorite = (id) => {
    const idx = favorites.indexOf(id);
    idx === -1 ? favorites.push(id) : favorites.splice(idx, 1);
    save(); updateFavoritesBadge(); renderCatalog();
};
function updateFavoritesBadge() { document.getElementById('favoritesCount').textContent = favorites.length; }

// ==================== КОРЗИНА ====================
window.addToCart = (id) => {
    const p = products.find(x => x.id == id); if (!p) return;
    const ex = cart.find(i => i.id == id);
    ex ? ex.qty++ : cart.push({...p, qty:1});
    save(); updateCartBadge();
    toast(`✅ ${p.name} добавлен`);
};
function updateCartBadge() { document.getElementById('cartBadge').textContent = cart.reduce((s,i) => s + i.qty, 0); }

function renderCart() {
    const cont = document.getElementById('cartItems');
    if (!cart.length) { cont.innerHTML = '<p style="text-align:center;padding:40px;">🛒 Корзина пуста</p>'; document.getElementById('cartTotal').textContent = '0'; return; }
    let subtotal = 0;
    cont.innerHTML = cart.map(i => {
        subtotal += i.price * i.qty;
        return `<div class="cart-item"><div class="cart-item__info"><strong>${i.name}</strong><span>${i.price.toLocaleString()} ₽</span></div><div class="cart-item__qty"><button onclick="updateQty('${i.id}',-1)">−</button><span>${i.qty}</span><button onclick="updateQty('${i.id}',1)">+</button></div><button class="cart-item__remove" onclick="removeFromCart('${i.id}')"><i class="fas fa-trash"></i></button></div>`;
    }).join('');
    document.getElementById('cartTotal').textContent = (promo ? Math.round(subtotal*0.8) : subtotal).toLocaleString();
}
window.updateQty = (id, d) => { const i = cart.find(x => x.id == id); if(i) { i.qty = Math.max(1, i.qty + d); save(); updateCartBadge(); renderCart(); } };
window.removeFromCart = (id) => { cart = cart.filter(i => i.id != id); save(); updateCartBadge(); renderCart(); };

// ==================== ПРОМОКОД ====================
window.applyPromo = () => {
    if (document.getElementById('promoInput').value.toUpperCase() === 'FIRST20') { promo = true; renderCart(); toast('🎉 Скидка 20% применена!'); }
    else { toast('❌ Неверный промокод', 'error'); }
};
window.copyPromo = () => { navigator.clipboard?.writeText('FIRST20'); toast('📋 Промокод FIRST20 скопирован!'); };

// ==================== ОФОРМЛЕНИЕ ====================
window.checkout = () => {
    if (!cart.length) { toast('Корзина пуста', 'error'); return; }
    const qty = cart.reduce((s,i) => s + i.qty, 0);
    const subtotal = cart.reduce((s,i) => s + i.price * i.qty, 0);
    const total = promo ? Math.round(subtotal * 0.8) : subtotal;
    document.getElementById('checkoutQty').textContent = qty;
    document.getElementById('checkoutSum').textContent = subtotal.toLocaleString();
    document.getElementById('checkoutTotal').textContent = total.toLocaleString();
    closeModal('cartModal'); openModal('checkoutModal');
};

// ==================== АДМИНКА ====================
function renderAdminTable() {
    const tbody = document.querySelector('#adminTable tbody');
    document.getElementById('totalProductsCount').textContent = products.length;
    tbody.innerHTML = products.slice(0, 50).map(p => `<tr><td>${p.name}</td><td>${p.price.toLocaleString()} ₽</td><td><button onclick="deleteProduct('${p.id}')" style="color:red;"><i class="fas fa-trash"></i></button></td></tr>`).join('');
}
window.deleteProduct = (id) => { if(confirm('Удалить?')) { products = products.filter(p => p.id != id); save(); renderCatalog(); renderAdminTable(); } };
window.clearAllProducts = () => { if(confirm('Удалить ВСЕ товары?')) { products = [...demos]; save(); renderCatalog(); renderAdminTable(); } };

function renderOrdersTable() {
    const tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;
    tbody.innerHTML = orders.slice().reverse().map(o => `<tr><td>${o.id}</td><td>${o.date}</td><td>${o.customer.name}<br>${o.customer.phone}</td><td>${o.total.toLocaleString()} ₽</td><td>${o.status}</td><td><button onclick="viewOrder('${o.id}')"><i class="fas fa-eye"></i></button></td></tr>`).join('');
}
window.viewOrder = (id) => { const o = orders.find(x => x.id === id); if(o) alert(JSON.stringify(o, null, 2)); };
window.exportOrders = () => { const blob = new Blob([JSON.stringify(orders, null, 2)], {type: 'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'orders.json'; a.click(); };
window.clearOrders = () => { if(confirm('Удалить все заказы?')) { orders = []; save(); renderOrdersTable(); } };

// ==================== АВТООПРЕДЕЛЕНИЕ КАТЕГОРИИ ====================
function detectCategory(name, article, extra = '') {
    const text = (name + ' ' + article + ' ' + extra).toLowerCase();
    
    // Душевые
    if (text.includes('душ') || text.includes('shower') || text.includes('кабин') || text.includes('шторк') || text.includes('поддон') || text.includes('огражден')) {
        return 'shower';
    }
    // Смесители
    if (text.includes('смес') || text.includes('кран') || text.includes('faucet') || text.includes('mixer') || text.includes('излив') || text.includes('термостат')) {
        return 'faucet';
    }
    // Раковины
    if (text.includes('рак') || text.includes('умыв') || text.includes('sink') || text.includes('мойк') || text.includes('рукомой') || text.includes('пьедест')) {
        return 'sink';
    }
    // Унитазы
    if (text.includes('унит') || text.includes('toilet') || text.includes('биде') || text.includes('писсуар') || text.includes('инсталляц') || text.includes('бачок')) {
        return 'toilet';
    }
    // Ванны
    if (text.includes('ванн') || text.includes('bath') || text.includes('купель') || text.includes('джакуз') || text.includes('гидромассаж')) {
        return 'bath';
    }
    
    return 'shower'; // По умолчанию
}

// ==================== ИМПОРТ ====================
function setupImport() {
    const fileInput = document.getElementById('importFile');
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0]; 
        if(!file) return;
        
        const status = document.getElementById('importStatus');
        status.innerHTML = '⏳ Читаем файл...';
        
        const text = await file.text();
        
        try { 
            rawData = JSON.parse(text); 
            status.innerHTML = `✅ JSON загружен. Записей: ${rawData.length}`;
        } catch { 
            rawData = parseCSV(text);
            if (rawData.length) {
                status.innerHTML = `✅ CSV загружен. Записей: ${rawData.length}`;
            } else {
                status.innerHTML = '❌ Ошибка парсинга';
                return;
            }
        }
        
        if (!Array.isArray(rawData)) rawData = [rawData];
        if (!rawData.length) { status.innerHTML = '❌ Нет данных'; return; }
        
        const firstItem = rawData[0];
        const fields = Object.keys(firstItem);
        
        ['fieldName', 'fieldPrice', 'fieldArticle', 'fieldImage'].forEach(id => {
            const s = document.getElementById(id);
            s.innerHTML = '<option value="">— Не выбрано —</option>' + fields.map(f => `<option value="${f}">${f}</option>`).join('');
        });
        
        // Автоопределение полей
        fields.forEach(f => {
            const fl = f.toLowerCase();
            if (fl.includes('назван') || fl.includes('name') || fl.includes('title') || fl.includes('наимен')) 
                document.getElementById('fieldName').value = f;
            if (fl.includes('цен') || fl.includes('price') || fl.includes('cost') || fl.includes('стоим')) 
                document.getElementById('fieldPrice').value = f;
            if (fl.includes('артикул') || fl.includes('article') || fl.includes('articul') || fl.includes('код')) 
                document.getElementById('fieldArticle').value = f;
            if (fl.includes('фото') || fl.includes('image') || fl.includes('picture') || fl.includes('img')) 
                document.getElementById('fieldImage').value = f;
        });
        
        status.innerHTML += `<br><button class="btn btn-outline" onclick="showSample()" style="margin-top:10px;">Показать пример</button>`;
    });
    
    document.getElementById('runImport').addEventListener('click', () => {
        if (!rawData) { toast('Загрузите файл', 'error'); return; }
        
        const nameF = document.getElementById('fieldName').value;
        const priceF = document.getElementById('fieldPrice').value;
        const artF = document.getElementById('fieldArticle').value;
        const imgF = document.getElementById('fieldImage').value;
        
        if (!nameF || !priceF) { toast('Выберите название и цену', 'error'); return; }
        
        let added = 0;
        const maxImport = Math.min(rawData.length, 10000);
        
        for (let i = 0; i < maxImport; i++) {
            const item = rawData[i];
            const name = item[nameF];
            let price = item[priceF];
            
            if (!name) continue;
            
            if (typeof price === 'string') {
                price = parseFloat(price.replace(/[^\d.,]/g, '').replace(',', '.'));
            }
            if (isNaN(price) || price <= 0) continue;
            
            const article = artF ? String(item[artF] || `IMP${i}`) : `IMP${Date.now()}_${i}`;
            const image = imgF ? item[imgF] : '';
            
            // АВТООПРЕДЕЛЕНИЕ КАТЕГОРИИ
            const category = detectCategory(name, article, item.category || item.категория || '');
            
            products.push({
                id: `imp_${Date.now()}_${i}_${Math.random().toString(36)}`,
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

window.showSample = function() {
    if (!rawData) return;
    const sample = rawData.slice(0, 3);
    const status = document.getElementById('importStatus');
    status.innerHTML += `<pre style="background:#1a2e3b;color:#a0e0f0;padding:10px;margin-top:10px;max-height:300px;overflow:auto;font-size:11px;">${JSON.stringify(sample, null, 2)}</pre>`;
};

function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return [];
    const delim = text.includes(';') ? ';' : ',';
    const headers = lines[0].split(delim).map(h => h.trim().replace(/"/g,''));
    return lines.slice(1).map(l => { 
        const v = l.split(delim); 
        const o = {}; 
        headers.forEach((h,i) => o[h] = v[i]?.trim()); 
        return o; 
    });
}

// ==================== UI ====================
function setupUI() {
    document.querySelectorAll('[data-cat]').forEach(el => el.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('[data-cat]').forEach(x => x.classList.remove('active'));
        this.classList.add('active');
        currentCat = this.dataset.cat; 
        currentPage = 1; 
        renderCatalog();
        document.getElementById('megaMenu')?.classList.remove('active');
    }));
    
    document.getElementById('catalogMenuBtn')?.addEventListener('click', () => {
        document.getElementById('megaMenu').classList.toggle('active');
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#megaMenu') && !e.target.closest('#catalogMenuBtn')) {
            document.getElementById('megaMenu')?.classList.remove('active');
        }
    });
    
    document.getElementById('searchInput')?.addEventListener('input', () => { currentPage = 1; renderCatalog(); });
    document.getElementById('sortSelect')?.addEventListener('change', renderCatalog);
    
    document.querySelectorAll('.view-btn').forEach(b => b.addEventListener('click', function() {
        document.querySelectorAll('.view-btn').forEach(x => x.classList.remove('active'));
        this.classList.add('active'); 
        viewMode = this.dataset.view; 
        renderCatalog();
    }));
    
    document.getElementById('cartBtn')?.addEventListener('click', () => { renderCart(); openModal('cartModal'); });
    document.getElementById('checkoutBtn')?.addEventListener('click', checkout);
    document.getElementById('applyPromo')?.addEventListener('click', applyPromo);
    document.getElementById('adminBtn')?.addEventListener('click', () => { renderAdminTable(); renderOrdersTable(); openModal('adminModal'); });
    
    document.querySelectorAll('.admin-tab').forEach(t => t.addEventListener('click', function() {
        document.querySelectorAll('.admin-tab').forEach(x => x.classList.remove('active'));
        this.classList.add('active');
        const tab = this.dataset.tab;
        document.getElementById('tab-products').style.display = tab==='products'?'block':'none';
        document.getElementById('tab-orders').style.display = tab==='orders'?'block':'none';
        document.getElementById('tab-import').style.display = tab==='import'?'block':'none';
        document.getElementById('tab-seo').style.display = tab==='seo'?'block':'none';
        if (tab==='orders') renderOrdersTable();
    }));
    
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
                delivery: document.getElementById('deliveryMethod').value,
                payment: document.getElementById('paymentMethod').value,
                comment: document.getElementById('orderComment').value
            },
            items: cart.map(i => ({ name: i.name, price: i.price, qty: i.qty })),
            subtotal: cart.reduce((s,i) => s + i.price * i.qty, 0),
            discount: promo ? 20 : 0,
            total: (promo ? Math.round(cart.reduce((s,i) => s + i.price * i.qty, 0) * 0.8) : cart.reduce((s,i) => s + i.price * i.qty, 0)),
            status: 'Новый'
        };
        
        orders.push(order);
        save();
        
        if (CONFIG.telegramBotToken && CONFIG.telegramChatId) {
            fetch(`https://api.telegram.org/bot${CONFIG.telegramBotToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CONFIG.telegramChatId,
                    text: `🛒 *НОВЫЙ ЗАКАЗ №${order.id}*\n\n👤 ${order.customer.name}\n📞 ${order.customer.phone}\n📍 ${order.customer.address}\n\n💰 Сумма: ${order.total.toLocaleString()} ₽\n📦 Товаров: ${order.items.length}`,
                    parse_mode: 'Markdown'
                })
            }).catch(e => console.error('Telegram error:', e));
        }
        
        document.getElementById('thankYouName').textContent = order.customer.name;
        document.getElementById('orderNumber').textContent = order.id;
        
        cart = []; promo = false; save(); updateCartBadge();
        closeModal('checkoutModal');
        openModal('thankYouModal');
        toast('🎉 Заказ оформлен!');
    });
    
    document.getElementById('applySeo')?.addEventListener('click', () => {
        document.title = document.getElementById('seoTitle').value;
        document.querySelector('meta[name="description"]')?.setAttribute('content', document.getElementById('seoDesc').value);
        let kw = document.querySelector('meta[name="keywords"]');
        if (!kw) { kw = document.createElement('meta'); kw.name = 'keywords'; document.head.appendChild(kw); }
        kw.content = document.getElementById('seoKeywords').value;
        toast('✅ SEO применено');
    });
    
    document.getElementById('generateSitemap')?.addEventListener('click', () => {
        const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://santehmir.ru/</loc></url></urlset>`;
        const blob = new Blob([xml], {type: 'application/xml'}); 
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); 
        a.download = 'sitemap.xml'; 
        a.click();
        toast('✅ Sitemap сгенерирован');
    });
}

window.openModal = (id) => { document.getElementById(id).classList.add('active'); document.body.style.overflow = 'hidden'; };
window.closeModal = (id) => { document.getElementById(id).classList.remove('active'); document.body.style.overflow = ''; };

function toast(msg, type='success') {
    const t = document.getElementById('toast');
    t.textContent = msg; 
    t.style.background = type==='error'?'#e74c3c':'var(--primary-dark)';
    t.style.display = 'block'; 
    setTimeout(() => t.style.display = 'none', 3000);
}

// ==================== ЗАПУСК ====================
document.addEventListener('DOMContentLoaded', init);