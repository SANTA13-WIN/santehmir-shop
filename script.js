// ОЧИСТКА ПОВРЕЖДЁННЫХ ДАННЫХ
(function(){
    try{ localStorage.removeItem('santehmir_products'); }catch(e){}
    try{ localStorage.removeItem('santehmir_cart'); }catch(e){}
})();

const CONFIG={shopEmail:'Santehmir_info@mail.ru',shopDomain:'santehmir.com',shopName:'САНТЕХМИР',shopPhone:'8 (800) 555-35-35'};
let products=[],cart=[],favorites=[],orders=[],currentCat='all',promo=false,rawData=null,currentPage=1,viewMode='grid';
let priceMin=0,priceMax=200000;
const itemsPerPage=24,categoryIcons={shower:'🚿',sink:'🚰',faucet:'🔧',toilet:'🚽',bath:'🛁',default:'📦'};
const demos=[{id:'1',article:'ST001',name:'Душевая кабина Aqua 90',price:68990,category:'shower',image:''},{id:'2',article:'ST002',name:'Раковина Onda 60',price:12990,category:'sink',image:''},{id:'3',article:'ST003',name:'Смеситель Mare',price:8990,category:'faucet',image:''},{id:'4',article:'ST004',name:'Унитаз Sospeso',price:24990,category:'toilet',image:''},{id:'5',article:'ST005',name:'Ванна Profondo',price:57990,category:'bath',image:''}];

function init(){
    products=[...demos];cart=[];favorites=[];orders=[];
    try{ renderCatalog(); }catch(e){ console.log(e); }
    updateCartBadge();updateFavoritesBadge();setupUI();setupImport();
}
function save(){ try{ localStorage.santehmir_products=JSON.stringify(products);localStorage.santehmir_cart=JSON.stringify(cart);localStorage.santehmir_orders=JSON.stringify(orders); }catch(e){} }

function renderCatalog(){
    let filtered=products.filter(p=>{
        let catMatch=currentCat==='all'||(p.category||'shower')===currentCat;
        let priceMatch=(p.price||0)>=priceMin&&(p.price||0)<=priceMax;
        return catMatch&&priceMatch;
    });
    const s=(document.getElementById('searchInput')?.value||'').toLowerCase();
    if(s)filtered=filtered.filter(p=>(p.name||'').toLowerCase().includes(s));
    const sort=document.getElementById('sortSelect')?.value;
    if(sort==='price-asc')filtered.sort((a,b)=>(a.price||0)-(b.price||0));
    if(sort==='price-desc')filtered.sort((a,b)=>(b.price||0)-(a.price||0));
    const grid=document.getElementById('catalogGrid');if(!grid)return;
    if(!filtered.length){grid.innerHTML='<p style="grid-column:1/-1;text-align:center;padding:60px;">Товары не найдены</p>';if(document.getElementById('pagination'))document.getElementById('pagination').innerHTML='';return;}
    const total=Math.ceil(filtered.length/itemsPerPage);if(currentPage>total)currentPage=1;
    const start=(currentPage-1)*itemsPerPage,toShow=filtered.slice(start,start+itemsPerPage);
    grid.className=viewMode==='grid'?'catalog__grid':'catalog__list';
    grid.innerHTML=toShow.map(p=>{const icon=categoryIcons[p.category]||categoryIcons.default,img=p.image?`<img src="${p.image}" onerror="this.innerHTML='<i>${icon}</i>'">`:`<i>${icon}</i>`;return viewMode==='grid'?`<div class="product-card"><div class="product-image">${img}</div><div class="product-card__content"><h3>${p.name||'Товар'}</h3><div class="product-price">${(p.price||0).toLocaleString()} ₽</div><button class="btn btn-primary btn-block" onclick="addToCart('${p.id}')">В корзину</button></div></div>`:`<div class="product-list-item"><div class="product-list-item__image">${img}</div><div class="product-list-item__info"><h3>${p.name||'Товар'}</h3><div class="product-price">${(p.price||0).toLocaleString()} ₽</div></div><div class="product-list-item__price"><button class="btn btn-primary" onclick="addToCart('${p.id}')">В корзину</button></div></div>`}).join('');
    renderPagination(filtered.length,total);
}
function renderPagination(totalItems,totalPages){let p=document.getElementById('pagination');if(!p)return;if(totalPages<=1){p.innerHTML=`<span>${totalItems} товаров</span>`;return;}let h=`<button onclick="changePage(${currentPage-1})" ${currentPage===1?'disabled':''}>←</button>`;for(let i=1;i<=totalPages;i++){if(i===1||i===totalPages||(i>=currentPage-2&&i<=currentPage+2))h+=`<button onclick="changePage(${i})" class="${i===currentPage?'active':''}">${i}</button>`;else if(i===currentPage-3||i===currentPage+3)h+='<span>...</span>';}h+=`<button onclick="changePage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>→</button>`;h+=`<span> ${Math.min(itemsPerPage,totalItems)} из ${totalItems}</span>`;p.innerHTML=h;}
window.changePage=(p)=>{currentPage=p;renderCatalog();scrollTo({top:400,behavior:'smooth'});};
window.addToCart=(id)=>{let p=products.find(x=>x.id==id);if(!p)return;let e=cart.find(i=>i.id==id);e?e.qty++:cart.push({...p,qty:1});save();updateCartBadge();toast(`✅ ${p.name||'Товар'} добавлен`);};
function updateCartBadge(){let b=document.getElementById('cartBadge');if(b)b.textContent=cart.reduce((s,i)=>s+(i.qty||0),0);}
function updateFavoritesBadge(){let b=document.getElementById('favoritesCount');if(b)b.textContent=favorites.length;}
function renderCart(){let c=document.getElementById('cartItems'),t=0;if(!c)return;if(!cart.length){c.innerHTML='<p>Корзина пуста</p>';document.getElementById('cartTotal').textContent='0';return;}c.innerHTML=cart.map(i=>{t+=(i.price||0)*(i.qty||0);return `<div style="display:flex;justify-content:space-between;padding:10px 0"><span>${i.name||'Товар'} x${i.qty||1}</span><span>${((i.price||0)*(i.qty||1)).toLocaleString()} ₽</span><button onclick="removeFromCart('${i.id}')">✕</button></div>`}).join('');document.getElementById('cartTotal').textContent=(promo?Math.round(t*0.8):t).toLocaleString();}
window.removeFromCart=(id)=>{cart=cart.filter(i=>i.id!=id);save();updateCartBadge();renderCart();};
window.applyPromo=()=>{if(document.getElementById('promoInput').value.toUpperCase()==='FIRST20'){promo=true;renderCart();toast('🎉 Скидка 20%');}};
window.copyPromo=()=>{navigator.clipboard?.writeText('FIRST20');toast('📋 Промокод скопирован');};
window.checkout=()=>{if(!cart.length){toast('Корзина пуста','error');return;}let q=cart.reduce((s,i)=>s+(i.qty||0),0),sub=cart.reduce((s,i)=>s+(i.price||0)*(i.qty||0),0),tot=promo?Math.round(sub*0.8):sub;document.getElementById('checkoutQty').textContent=q;document.getElementById('checkoutSum').textContent=sub.toLocaleString();document.getElementById('checkoutTotal').textContent=tot.toLocaleString();closeModal('cartModal');openModal('checkoutModal');};

function setupUI(){
    document.querySelectorAll('[data-cat]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();document.querySelectorAll('[data-cat]').forEach(x=>x.classList.remove('active'));el.classList.add('active');currentCat=el.dataset.cat;currentPage=1;renderCatalog();document.getElementById('megaMenu')?.classList.remove('active');}));
    document.getElementById('catalogMenuBtn')?.addEventListener('click',()=>document.getElementById('megaMenu').classList.toggle('active'));
    document.addEventListener('click',(e)=>{if(!e.target.closest('#megaMenu')&&!e.target.closest('#catalogMenuBtn'))document.getElementById('megaMenu')?.classList.remove('active');});
    document.getElementById('searchInput')?.addEventListener('input',()=>{currentPage=1;renderCatalog();});
    document.getElementById('sortSelect')?.addEventListener('change',renderCatalog);
    document.querySelectorAll('.view-btn').forEach(b=>b.addEventListener('click',function(){document.querySelectorAll('.view-btn').forEach(x=>x.classList.remove('active'));this.classList.add('active');viewMode=this.dataset.view;renderCatalog();}));
    document.getElementById('applyPriceFilter')?.addEventListener('click',()=>{priceMin=parseInt(document.getElementById('priceMin')?.value)||0;priceMax=parseInt(document.getElementById('priceMax')?.value)||200000;currentPage=1;renderCatalog();});
    document.getElementById('resetPriceFilter')?.addEventListener('click',()=>{document.getElementById('priceMin').value=0;document.getElementById('priceMax').value=200000;priceMin=0;priceMax=200000;currentPage=1;renderCatalog();});
    document.getElementById('cartBtn')?.addEventListener('click',()=>{renderCart();openModal('cartModal');});
    document.getElementById('checkoutBtn')?.addEventListener('click',checkout);
    document.getElementById('applyPromo')?.addEventListener('click',applyPromo);
    document.getElementById('adminBtn')?.addEventListener('click',()=>{renderAdminTable();renderOrdersTable();openModal('adminModal');});
    document.querySelectorAll('.admin-tab').forEach(t=>t.addEventListener('click',function(){document.querySelectorAll('.admin-tab').forEach(x=>x.classList.remove('active'));this.classList.add('active');let tab=this.dataset.tab;document.getElementById('tab-products').style.display=tab==='products'?'block':'none';document.getElementById('tab-orders').style.display=tab==='orders'?'block':'none';document.getElementById('tab-import').style.display=tab==='import'?'block':'none';document.getElementById('tab-seo').style.display=tab==='seo'?'block':'none';}));
    document.getElementById('checkoutForm')?.addEventListener('submit',e=>{e.preventDefault();let order={id:'ORD-'+Date.now().toString().slice(-8),date:new Date().toLocaleString('ru-RU'),customer:{name:document.getElementById('customerName').value,phone:document.getElementById('customerPhone').value,email:document.getElementById('customerEmail').value,address:document.getElementById('customerAddress').value},items:cart.map(i=>({name:i.name,price:i.price,qty:i.qty})),total:(promo?Math.round(cart.reduce((s,i)=>s+i.price*i.qty,0)*0.8):cart.reduce((s,i)=>s+i.price*i.qty,0))};orders.push(order);save();alert(`Заказ №${order.id} оформлен! Уведомление на ${CONFIG.shopEmail}`);document.getElementById('thankYouName').textContent=order.customer.name;document.getElementById('orderNumber').textContent=order.id;cart=[];promo=false;save();updateCartBadge();closeModal('checkoutModal');openModal('thankYouModal');});
    document.getElementById('applySeo')?.addEventListener('click',()=>{document.title=document.getElementById('seoTitle').value;document.querySelector('meta[name="description"]')?.setAttribute('content',document.getElementById('seoDesc').value);toast('SEO применено');});
    document.getElementById('generateSitemap')?.addEventListener('click',()=>{let xml=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://${CONFIG.shopDomain}/</loc></url></urlset>`;let b=new Blob([xml],{type:'application/xml'});let a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='sitemap.xml';a.click();toast('Sitemap сгенерирован');});
}

function renderAdminTable(){let t=document.querySelector('#adminProductsBody');if(!t)return;document.getElementById('totalProductsCount').textContent=products.length;t.innerHTML=products.slice(0,50).map(p=>`<tr><td>${p.name}</td><td>${(p.price||0).toLocaleString()} ₽</td><td><button onclick="deleteProduct('${p.id}')">🗑️</button></td></tr>`).join('');}
window.deleteProduct=(id)=>{products=products.filter(p=>p.id!=id);save();renderCatalog();renderAdminTable();};
window.clearAllProducts=()=>{if(confirm('Удалить все?')){products=[...demos];save();renderCatalog();renderAdminTable();}};
function renderOrdersTable(){let t=document.querySelector('#ordersBody');if(!t)return;t.innerHTML=orders.slice(-20).reverse().map(o=>`<tr><td>${o.id}</td><td>${o.date}</td><td>${o.customer.name}</td><td>${o.total.toLocaleString()} ₽</td></tr>`).join('');}
window.exportOrders=()=>{let b=new Blob([JSON.stringify(orders,null,2)],{type:'application/json'});let a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='orders.json';a.click();};

function setupImport(){
    document.getElementById('importFile')?.addEventListener('change',async e=>{
        let f=e.target.files[0];if(!f)return;let t=await f.text();
        try{rawData=JSON.parse(t);}catch{rawData=parseCSV(t);}
        if(!Array.isArray(rawData))rawData=[rawData];
        let fields=Object.keys(rawData[0]||{});
        ['fieldName','fieldPrice','fieldArticle','fieldImage'].forEach(id=>{let s=document.getElementById(id);if(s)s.innerHTML='<option value="">—</option>'+fields.map(f=>`<option>${f}</option>`).join('');});
        document.getElementById('importStatus').innerHTML=`✅ ${rawData.length} записей`;
    });
    document.getElementById('runImport')?.addEventListener('click',()=>{
        if(!rawData)return;let n=document.getElementById('fieldName')?.value,p=document.getElementById('fieldPrice')?.value,a=document.getElementById('fieldArticle')?.value,img=document.getElementById('fieldImage')?.value,added=0;
        rawData.slice(0,5000).forEach((it,i)=>{let name=it[n],price=parseFloat(String(it[p]).replace(/[^\d.,]/g,'').replace(',','.'));if(!name||!price)return;products.push({id:`imp_${Date.now()}_${i}`,name,price,category:detectCategory(name),article:it[a]||'',image:it[img]||''});added++;});
        if(added){save();renderCatalog();renderAdminTable();toast(`✅ ${added} товаров`);closeModal('adminModal');}
    });
}
function parseCSV(t){let l=t.split('\n').filter(l=>l.trim()),d=t.includes(';')?';':',',h=l[0].split(d).map(h=>h.trim());return l.slice(1).map(li=>{let v=li.split(d),o={};h.forEach((h,i)=>o[h]=v[i]?.trim());return o;});}
function detectCategory(n){let s=(n||'').toLowerCase();if(s.includes('душ')||s.includes('shower'))return'shower';if(s.includes('смес')||s.includes('faucet'))return'faucet';if(s.includes('рак')||s.includes('sink'))return'sink';if(s.includes('унит')||s.includes('toilet'))return'toilet';if(s.includes('ванн')||s.includes('bath'))return'bath';return'shower';}

window.openModal=(id)=>{let m=document.getElementById(id);if(m)m.classList.add('active');document.body.style.overflow='hidden';};
window.closeModal=(id)=>{let m=document.getElementById(id);if(m)m.classList.remove('active');document.body.style.overflow='';};
function toast(m,t='success'){let e=document.getElementById('toast');if(!e)return;e.textContent=m;e.style.background=t==='error'?'#e74c3c':'var(--primary-deep)';e.style.display='block';setTimeout(()=>e.style.display='none',3000);}

document.addEventListener('DOMContentLoaded',init);