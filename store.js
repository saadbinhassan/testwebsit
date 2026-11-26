// =========================================================================
// SLAO STORE SETTINGS, BACKEND SYNC & CART/LIKE HELPERS (v13)
// =========================================================================

const SLAO_API_BASE = window.location.origin.startsWith('http')
    ? window.location.origin + '/api'
    : 'http://localhost:3000/api';


// =========================================================================
// FIREBASE CONFIG (slao-collections) & CUSTOMER PROFILE SYNC
// =========================================================================
const SLAO_FIREBASE_CONFIG = {
    apiKey: "AIzaSyCtte2KWzKsCWysJ0EGwMKs_KFjsg6r7_0",
    authDomain: "slao-collections.firebaseapp.com",
    projectId: "slao-collections",
    storageBucket: "slao-collections.firebasestorage.app",
    messagingSenderId: "505858269592",
    appId: "1:505858269592:web:dcbca234f8d2a352be8bed",
    measurementId: "G-EM759EGCR6"
};


// =========================================================================
// FIRESTORE LIVE SYNC HELPERS (slao-collections)
// =========================================================================
let slaoFirestore = null;
if (typeof firebase !== "undefined" && typeof SLAO_FIREBASE_CONFIG !== "undefined") {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(SLAO_FIREBASE_CONFIG);
        }
        slaoFirestore = firebase.firestore();
    } catch (err) {
        console.warn("Firebase init warning:", err);
    }
}

function slaoCleanDocId(rawId) {
    return String(rawId || ("doc-" + Date.now())).replace(/[\/#?\[\]]/g, "_");
}

async function slaoFsUpsert(collectionName, docId, payload) {
    if (!slaoFirestore || !payload) return false;
    try {
        const cleanId = slaoCleanDocId(docId || payload.id || payload.orderId || payload.voucherId || Date.now());
        await slaoFirestore.collection(collectionName).doc(cleanId).set({
            ...payload,
            _updatedAtMs: Date.now()
        }, { merge: true });
        return true;
    } catch (err) {
        console.warn("Firestore upsert failed (" + collectionName + "):", err);
        return false;
    }
}

async function slaoFsGetAll(collectionName) {
    if (!slaoFirestore) return null;
    try {
        const snap = await slaoFirestore.collection(collectionName).get();
        return snap.docs.map(d => ({ _fsDocId: d.id, ...d.data() }));
    } catch (err) {
        console.warn("Firestore fetch failed (" + collectionName + "):", err);
        return null;
    }
}

function syncCustomerProfileToBackend(userObj) {
    if (!userObj || !userObj.email) return;
    const list = JSON.parse(localStorage.getItem('slao_customers') || '[]');
    const idx = list.findIndex(c => (c.email || '').toLowerCase() === userObj.email.toLowerCase());
    const rec = {
        ...userObj,
        updatedAt: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    };
    if (idx !== -1) list[idx] = rec;
    else list.unshift(rec);
    localStorage.setItem('slao_customers', JSON.stringify(list));

    slaoFsUpsert('customers', rec.id || rec.email || ('CUST-' + Date.now()), rec);

    fetch(`${SLAO_API_BASE}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rec)
    }).catch(() => {});
}

const SLAO_DELIVERY_FEE = 0;
const SLAO_URGENT_FEE = 0;
const SLAO_FREE_SHIPPING_MIN = 3500;
const SLAO_COD_FEE = 80;

const SLAO_SIZE_PRICE_DIFF = {
    "S": -200,
    "M": 0,
    "L": 300,
    "XL": 600
};

const SLAO_PRODUCTS = [
    {
        id: 1,
        name: "Noir Embroidered Lawn 3-Piece",
        category: "unstitched",
        price: 6490,
        originalPrice: 7990,
        isSale: true,
        image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop",
        colorImages: {
            "Black": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop",
            "Maroon": "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop",
            "Emerald": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop"
        },
        colors: ["Black", "Maroon", "Emerald"],
        tag: "Bestseller",
        description: "Exquisite embroidered lawn shirt accompanied by organza bordered trousers and printed chiffon dupatta."
    },
    {
        id: 2,
        name: "Dusty Rose Printed Pret Kurti",
        category: "ready",
        price: 3850,
        originalPrice: 3850,
        isSale: false,
        image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=800&auto=format&fit=crop",
        colorImages: {
            "Dusty Rose": "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=800&auto=format&fit=crop",
            "White": "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=800&auto=format&fit=crop",
            "Peach": "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=800&auto=format&fit=crop"
        },
        colors: ["Dusty Rose", "White", "Peach"],
        tag: "New",
        description: "Soft cotton pret kurti with delicate neck embroidery and straight cut silhouette."
    },
    {
        id: 3,
        name: "Lilac Chiffon Festive Edition",
        category: "unstitched",
        price: 8990,
        originalPrice: 10990,
        isSale: true,
        image: "https://images.unsplash.com/photo-1563178406-4cdc2923acbc?q=80&w=800&auto=format&fit=crop",
        colorImages: {
            "Lilac": "https://images.unsplash.com/photo-1563178406-4cdc2923acbc?q=80&w=800&auto=format&fit=crop",
            "Gold": "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop",
            "Lavender": "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=800&auto=format&fit=crop"
        },
        colors: ["Lilac", "Gold", "Lavender"],
        tag: "Luxury",
        description: "Graceful unstitched 3-piece suit featuring zari thread work."
    },
    {
        id: 4,
        name: "Maroon Embroidered Kurti Suit",
        category: "ready",
        price: 7450,
        originalPrice: 7450,
        isSale: false,
        image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop",
        colorImages: {
            "Maroon": "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop",
            "Black": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop",
            "Gold": "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop"
        },
        colors: ["Maroon", "Black", "Gold"],
        tag: "Trending",
        description: "Deep stitched ensemble tailored to perfection for formal evening wear."
    },
    {
        id: 5,
        name: "Olive Floral Daily Pret",
        category: "ready",
        price: 2950,
        originalPrice: 3500,
        isSale: true,
        image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop",
        colorImages: {
            "Olive": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop",
            "Sage": "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=800&auto=format&fit=crop",
            "Cream": "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=800&auto=format&fit=crop"
        },
        colors: ["Olive", "Sage", "Cream"],
        tag: "Sale",
        description: "Vibrant printed kurti set crafted in lightweight breathable cotton."
    },
    {
        id: 6,
        name: "Beige Minimal Silk Tunic",
        category: "western",
        price: 5290,
        originalPrice: 5290,
        isSale: false,
        image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=800&auto=format&fit=crop",
        colorImages: {
            "Beige": "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=800&auto=format&fit=crop",
            "Ivory": "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=800&auto=format&fit=crop",
            "Brown": "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop"
        },
        colors: ["Beige", "Ivory", "Brown"],
        tag: "Modern",
        description: "Elegant tunic crafted from premium silk blend fabric."
    },
    {
        id: 7,
        name: "Royal Crimson Jacquard 2-Piece",
        category: "unstitched",
        price: 5490,
        originalPrice: 6500,
        isSale: true,
        image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop",
        colorImages: {
            "Crimson": "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop",
            "Maroon": "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop",
            "Black": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop"
        },
        colors: ["Crimson", "Maroon", "Black"],
        tag: "Limited",
        description: "Rich jacquard weave fabric with detailed neck motif."
    },
    {
        id: 8,
        name: "Classic Ivory Linen Co-Ord Set",
        category: "western",
        price: 3200,
        originalPrice: 3200,
        isSale: false,
        image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=800&auto=format&fit=crop",
        colorImages: {
            "Ivory": "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=800&auto=format&fit=crop",
            "Sand": "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=800&auto=format&fit=crop",
            "Black": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop"
        },
        colors: ["Ivory", "Sand", "Black"],
        tag: "Casual",
        description: "Minimalist matching co-ord set ideal for summer daytime outings."
    }
];

function getPriceForSize(product, size = "M") {
    if (product.sizePrices && typeof product.sizePrices[size] === "number") {
        return Math.max(0, product.sizePrices[size]);
    }
    const diff = SLAO_SIZE_PRICE_DIFF[size] || 0;
    return Math.max(0, product.price + diff);
}

function getImageForColor(product, color) {
    if (product.colorImages && color && product.colorImages[color]) {
        return product.colorImages[color];
    }
    return product.image;
}


const SLAO_EXTRA_GALLERY_POOL = [
    "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1563178406-4cdc2923acbc?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=800&auto=format&fit=crop"
];

function getProductGalleryImages(prod, activeColor) {
    if (!prod) return [];
    const list = [];
    const seen = new Set();
    const pushUnique = (u) => {
        if (!u) return;
        const resolved = resolveProductImage(u, "");
        if (resolved && !seen.has(resolved)) {
            seen.add(resolved);
            list.push(resolved);
        }
    };

    if (activeColor && prod.colorImages && prod.colorImages[activeColor]) {
        pushUnique(prod.colorImages[activeColor]);
    }
    pushUnique(prod.image);
    if (Array.isArray(prod.gallery)) {
        prod.gallery.forEach(pushUnique);
    }
    if (prod.colorImages && typeof prod.colorImages === 'object') {
        Object.values(prod.colorImages).forEach(pushUnique);
    }
    // Ensure at least 4 distinct pictures per product for easy switching
    const startIdx = (Number(prod.id || 1) - 1) % SLAO_EXTRA_GALLERY_POOL.length;
    for (let i = 0; list.length < 4 && i < SLAO_EXTRA_GALLERY_POOL.length * 2; i++) {
        pushUnique(SLAO_EXTRA_GALLERY_POOL[(startIdx + i) % SLAO_EXTRA_GALLERY_POOL.length]);
    }
    return list;
}

function resolveProductImage(imgPath, prefix = "") {
    if (!imgPath) return "";
    if (imgPath.startsWith("http://") || imgPath.startsWith("https://") || imgPath.startsWith("data:")) {
        return imgPath;
    }
    return prefix + imgPath;
}

function getCart() {
    return JSON.parse(localStorage.getItem('slao_cart') || '[]');
}

function saveCart(cart) {
    localStorage.setItem('slao_cart', JSON.stringify(cart));
}

function getCartCount() {
    return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

function quickAddToCart(prodId, selectedColor) {
    const product = SLAO_PRODUCTS.find(p => p.id === Number(prodId));
    if (!product) return;
    const color = selectedColor || product.colors[0];
    const size = 'M';
    const cart = getCart();
    const existing = cart.find(x => x.id === product.id && x.size === size && x.color === color);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: getPriceForSize(product, size),
            image: getImageForColor(product, color),
            size,
            color,
            quantity: 1
        });
    }
    saveCart(cart);
    updateHeaderCounts();
    alert(`${product.name} (${color}) added to your cart!`);
}

function calculateDeliveryCharges(subtotal, deliveryType = "STANDARD") {
    return 0;
}

function calculateCodCharges(subtotal, payType = "COD") {
    if (subtotal <= 0) return 0;
    return payType === "COD" ? SLAO_COD_FEE : 0;
}

function getLikedProducts() {
    return JSON.parse(localStorage.getItem('slao_liked') || '[]');
}

function saveLikedProducts(ids) {
    localStorage.setItem('slao_liked', JSON.stringify(ids));
}

function syncLikeToServer(prodId, isLiked) {
    const product = SLAO_PRODUCTS.find(p => p.id === Number(prodId));
    const user = JSON.parse(localStorage.getItem('slao_current_user') || 'null');
    const payload = {
        productId: Number(prodId),
        productName: product ? product.name : ('Product #' + prodId),
        customerName: user ? user.name : 'Guest Shopper',
        customerEmail: user ? user.email : 'guest@slao.pk',
        liked: isLiked
    };

    const localLikeRecords = JSON.parse(localStorage.getItem('slao_admin_likes') || '[]')
        .filter(l => !(Number(l.productId) === payload.productId && l.customerEmail === payload.customerEmail));
    if (isLiked) {
        localLikeRecords.unshift({
            ...payload,
            date: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        });
    }
    localStorage.setItem('slao_admin_likes', JSON.stringify(localLikeRecords));

    const likeDocId = slaoCleanDocId((payload.customerEmail || 'guest') + '_' + payload.productId);
    slaoFsUpsert('likes', likeDocId, {
        ...payload,
        id: likeDocId,
        date: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    });

    fetch(`${SLAO_API_BASE}/likes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    }).catch(() => {});
}

function toggleLikeProduct(prodId, btnEl) {
    const idNum = Number(prodId);
    const liked = getLikedProducts();
    const exists = liked.includes(idNum);
    const nowLiked = !exists;
    const updated = exists ? liked.filter(id => id !== idNum) : [...liked, idNum];
    saveLikedProducts(updated);
    updateHeaderCounts();
    syncLikeToServer(idNum, nowLiked);

    if (btnEl) {
        const icon = btnEl.querySelector('i');
        if (icon) {
            icon.className = nowLiked
                ? 'fa-solid fa-heart text-rose-600'
                : 'fa-regular fa-heart text-slao-maroon';
        }
        const label = btnEl.querySelector('span');
        if (label) {
            label.innerText = nowLiked ? 'Saved in Liked Items' : 'Save to Liked Items';
        }
    }
    return nowLiked;
}

function updateHeaderCounts() {
    const cartEl = document.getElementById('cart-count');
    if (cartEl) cartEl.innerText = getCartCount();

    const likedEl = document.getElementById('liked-count');
    if (likedEl) likedEl.innerText = getLikedProducts().length;

    const user = JSON.parse(localStorage.getItem('slao_current_user') || 'null');
    const profileIcon = document.getElementById('header-profile-icon');
    if (profileIcon) {
        const parentLink = profileIcon.closest('a');
        if (user && parentLink) {
            parentLink.title = `${user.name} (View Profile)`;
            if (user.picture) {
                parentLink.innerHTML = `<img id="header-profile-icon" src="${user.picture}" referrerpolicy="no-referrer" alt="${user.name}" class="w-8 h-8 rounded-full object-cover border-2 border-slao-maroon">`;
            } else {
                const initial = (user.name || 'U').charAt(0).toUpperCase();
                parentLink.innerHTML = `<span id="header-profile-icon" class="w-8 h-8 rounded-full bg-slao-maroon text-white text-xs font-bold inline-flex items-center justify-center">${initial}</span>`;
            }
        }
    }
}

function getBasePathPrefix() {
    return window.location.pathname.includes('/collections/') ? '../../' : '';
}

function toggleTopSearch() {
    let panel = document.getElementById('top-search-panel');
    if (!panel) {
        const header = document.querySelector('header');
        if (!header) return;
        panel = document.createElement('div');
        panel.id = 'top-search-panel';
        panel.className = 'hidden bg-white border-b border-gray-200 shadow-2xl px-4 py-4';
        panel.innerHTML = `
            <div class="max-w-4xl mx-auto space-y-3">
                <div class="flex items-center gap-2">
                    <div class="relative flex-grow">
                        <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-3.5 text-gray-400 text-sm"></i>
                        <input id="top-search-input" type="text" oninput="runTopSearch(this.value)"
                            placeholder="Search suits by name, category, or color..."
                            class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slao-maroon">
                    </div>
                    <button type="button" onclick="toggleTopSearch()" class="px-3.5 py-2.5 text-xs font-bold text-gray-600 hover:text-slao-maroon border rounded-xl">Close</button>
                </div>
                <div id="top-search-results" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-80 overflow-y-auto"></div>
            </div>
        `;
        header.appendChild(panel);
    }

    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
        const input = document.getElementById('top-search-input');
        input.focus();
        runTopSearch(input.value);
    }
}

function runTopSearch(query) {
    const q = (query || '').trim().toLowerCase();
    const box = document.getElementById('top-search-results');
    if (!box) return;

    const prefix = getBasePathPrefix();
    const matches = !q
        ? SLAO_PRODUCTS
        : SLAO_PRODUCTS.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.colors.some(c => c.toLowerCase().includes(q))
        );

    if (!matches.length) {
        box.innerHTML = `<p class="text-xs text-rose-600 col-span-full py-2">No matching products found.</p>`;
        return;
    }

    box.innerHTML = matches.map(p => `
        <a href="${prefix}product.html?id=${p.id}" class="flex items-center gap-3 p-2.5 border rounded-xl hover:border-slao-maroon bg-slao-cream/50 transition">
            <img src="${resolveProductImage(p.image, prefix)}" alt="${p.name}" class="w-12 h-14 object-cover rounded-lg border">
            <div class="text-xs">
                <p class="font-bold text-gray-900 line-clamp-1">${p.name}</p>
                <p class="text-[11px] text-gray-500 capitalize">${p.category} &bull; ${p.colors.join(', ')}</p>
                <p class="text-slao-maroon font-bold mt-0.5">Rs. ${p.price.toLocaleString()}</p>
            </div>
        </a>
    `).join('');
}

document.addEventListener('DOMContentLoaded', updateHeaderCounts);


// =========================================================================
// GLOBAL CENTER POPUP FOR ALL NOTIFICATIONS/ERRORS + CENTER LOGO ZOOM MODAL
// =========================================================================
function ensureGlobalPopups() {
    if (!document.body) return;

    // 1. Center Notification / Error Popup Modal
    if (!document.getElementById('slao-global-popup')) {
        const popupEl = document.createElement('div');
        popupEl.id = 'slao-global-popup';
        popupEl.className = 'hidden fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4';
        popupEl.innerHTML = `
            <div id="slao-global-popup-card" class="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-slao-maroon">
                <div id="slao-global-popup-header" class="bg-slao-maroon text-white px-6 py-4 flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <i id="slao-global-popup-icon" class="fa-solid fa-circle-info text-lg text-slao-gold"></i>
                        <h3 id="slao-global-popup-title" class="font-serif text-base sm:text-lg font-bold">SLAO Notification</h3>
                    </div>
                    <button type="button" onclick="closeSlaoPopup()" class="text-white/80 hover:text-white text-lg">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="p-6 space-y-4 text-xs sm:text-sm">
                    <div id="slao-global-popup-body" class="text-gray-800 leading-relaxed font-medium"></div>
                    <div class="flex justify-end pt-1">
                        <button type="button" onclick="closeSlaoPopup()" id="slao-global-popup-btn" class="px-6 py-2.5 bg-slao-maroon hover:bg-slao-maroonDark text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow">
                            OK
                        </button>
                    </div>
                </div>
            </div>
        `;
        popupEl.addEventListener('click', (e) => {
            if (e.target === popupEl) closeSlaoPopup();
        });
        document.body.appendChild(popupEl);
    }

    // 2. Center Logo Zoom Lightbox Modal
    if (!document.getElementById('slao-logo-zoom-modal')) {
        const prefix = typeof getBasePathPrefix === 'function' ? getBasePathPrefix() : '';
        const zoomEl = document.createElement('div');
        zoomEl.id = 'slao-logo-zoom-modal';
        zoomEl.className = 'hidden fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4';
        zoomEl.innerHTML = `
            <div class="relative bg-slao-charcoal border-2 border-slao-gold rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full flex flex-col items-center text-center space-y-4">
                <button type="button" onclick="closeSlaoLogoZoom()" class="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition" title="Close">
                    <i class="fa-solid fa-xmark text-lg"></i>
                </button>
                <img id="slao-logo-zoom-img" src="${prefix}images/slao-logo.png" alt="SLAO Collections Logo" class="w-64 h-64 sm:w-80 sm:h-80 rounded-full object-cover border-4 border-slao-gold shadow-2xl">
                <div>
                    <p class="font-serif text-xl sm:text-2xl font-extrabold tracking-widest text-white">SLAO COLLECTIONS</p>
                    <p class="text-xs text-slao-gold uppercase tracking-widest mt-1">100% Authentic Quality &bull; Premium Fabric &amp; Original Designer Prints</p>
                </div>
            </div>
        `;
        zoomEl.addEventListener('click', (e) => {
            if (e.target === zoomEl) closeSlaoLogoZoom();
        });
        document.body.appendChild(zoomEl);
    }
}

function showSlaoPopup(message, type = 'auto') {
    ensureGlobalPopups();
    const popup = document.getElementById('slao-global-popup');
    const card = document.getElementById('slao-global-popup-card');
    const header = document.getElementById('slao-global-popup-header');
    const icon = document.getElementById('slao-global-popup-icon');
    const title = document.getElementById('slao-global-popup-title');
    const body = document.getElementById('slao-global-popup-body');
    const btn = document.getElementById('slao-global-popup-btn');

    const msgStr = String(message || '');
    const lower = msgStr.toLowerCase();
    let detected = type;
    if (detected === 'auto') {
        if (lower.includes('error') || lower.includes('invalid') || lower.includes('incorrect') || lower.includes('not found') || lower.includes('empty') || lower.includes('please ') || lower.includes('must be')) {
            detected = 'error';
        } else if (lower.includes('success') || lower.includes('added') || lower.includes('confirmed') || lower.includes('thank you') || lower.includes('submitted') || lower.includes('recorded')) {
            detected = 'success';
        } else {
            detected = 'info';
        }
    }

    if (detected === 'error') {
        card.className = 'bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-rose-600';
        header.className = 'bg-rose-600 text-white px-6 py-4 flex items-center justify-between';
        icon.className = 'fa-solid fa-triangle-exclamation text-lg text-white';
        title.innerText = 'Alert / Error';
        btn.className = 'px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow';
    } else if (detected === 'success') {
        card.className = 'bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-emerald-600';
        header.className = 'bg-emerald-700 text-white px-6 py-4 flex items-center justify-between';
        icon.className = 'fa-solid fa-circle-check text-lg text-emerald-200';
        title.innerText = 'Notification';
        btn.className = 'px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow';
    } else {
        card.className = 'bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border-2 border-slao-maroon';
        header.className = 'bg-slao-maroon text-white px-6 py-4 flex items-center justify-between';
        icon.className = 'fa-solid fa-circle-info text-lg text-slao-gold';
        title.innerText = 'SLAO Notice';
        btn.className = 'px-6 py-2.5 bg-slao-maroon hover:bg-slao-maroonDark text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow';
    }

    body.innerText = msgStr;
    popup.classList.remove('hidden');
}

function closeSlaoPopup() {
    const popup = document.getElementById('slao-global-popup');
    if (popup) popup.classList.add('hidden');
}

function openSlaoLogoZoom(e, imgSrc) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    ensureGlobalPopups();
    const zoomEl = document.getElementById('slao-logo-zoom-modal');
    const zoomImg = document.getElementById('slao-logo-zoom-img');
    if (zoomImg && imgSrc) {
        zoomImg.src = imgSrc;
    }
    if (zoomEl) zoomEl.classList.remove('hidden');
}

function closeSlaoLogoZoom() {
    const zoomEl = document.getElementById('slao-logo-zoom-modal');
    if (zoomEl) zoomEl.classList.add('hidden');
}

// Override native window.alert so ALL alerts across every page open in the center popup
window.alert = function (msg) {
    showSlaoPopup(msg, 'auto');
};

document.addEventListener('DOMContentLoaded', () => {
    ensurePinnedWhatsAppButton();
    ensurePinnedLeftReviewButton();
    arrangeWhatsAppAndReviewsSideBySide();

    // Keep hand pointer cursor consistently over text, links, buttons, and clickable sections (except text inputs/textareas)
    const handSelector = '.copyable-text, .copyable-text *, a, a *, button, button *, [onclick], [onclick] *, .cursor-pointer, .cursor-pointer *, img[src*="slao-logo"], .slao-logo-clickable';
    document.querySelectorAll(handSelector).forEach((el) => {
        if (el.matches('input, textarea, select')) return;
        el.style.setProperty('cursor', 'pointer', 'important');
    });

    ensureGlobalPopups();
    // Make every SLAO logo image show hand pointer cursor and zoom large in center when clicked
    document.querySelectorAll('img[src*="slao-logo"], .slao-logo-clickable').forEach((img) => {
        img.style.setProperty('cursor', 'pointer', 'important');
        img.classList.add('cursor-pointer');
        img.title = 'Click to view SLAO Logo';
        img.addEventListener('click', (e) => openSlaoLogoZoom(e, img.src));
    });
});


// =========================================================================
// 100% AUTHENTIC QUALITY DETAILS POPUP MODAL
// =========================================================================
function openAuthenticQualityModal() {
    let modal = document.getElementById('slao-quality-details-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'slao-quality-details-modal';
        modal.className = 'hidden fixed inset-0 z-[9997] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border-2 border-slao-maroon my-auto">
                <div class="bg-slao-maroon text-white px-6 py-4 flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <i class="fa-solid fa-shield-halved text-xl text-slao-gold"></i>
                        <div>
                            <h3 class="font-serif text-lg font-bold">100% Authentic Quality</h3>
                            <p class="text-[11px] text-slao-gold">Premium fabric &amp; original designer prints</p>
                        </div>
                    </div>
                    <button type="button" onclick="closeAuthenticQualityModal()" class="text-white/80 hover:text-white text-lg">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="p-6 space-y-4 text-xs sm:text-sm text-gray-700">
                    <p class="font-semibold text-gray-900">
                        At SLAO Collections, every outfit goes through strict quality inspection before dispatch so you receive genuine luxury wear.
                    </p>
                    <div class="space-y-2.5">
                        <div class="p-3.5 rounded-2xl bg-slao-cream border border-slao-gold/40 flex items-start gap-3">
                            <i class="fa-solid fa-check-circle text-slao-maroon mt-0.5"></i>
                            <div>
                                <p class="font-bold text-slao-maroon">Premium Export-Grade Fabrics</p>
                                <p class="text-xs text-gray-600 mt-0.5">Pure breathable lawn, soft cotton, fine chiffon, jacquard, and silk blends woven for comfort and long-lasting wear.</p>
                            </div>
                        </div>
                        <div class="p-3.5 rounded-2xl bg-slao-cream border border-slao-gold/40 flex items-start gap-3">
                            <i class="fa-solid fa-palette text-slao-maroon mt-0.5"></i>
                            <div>
                                <p class="font-bold text-slao-maroon">Original Designer Prints &amp; Intricate Embroidery</p>
                                <p class="text-xs text-gray-600 mt-0.5">Exclusive in-house artwork, color-fast dyes that resist fading, and neat zari/thread detailing.</p>
                            </div>
                        </div>
                        <div class="p-3.5 rounded-2xl bg-slao-cream border border-slao-gold/40 flex items-start gap-3">
                            <i class="fa-solid fa-award text-slao-maroon mt-0.5"></i>
                            <div>
                                <p class="font-bold text-slao-maroon">Multi-Step Quality Check &amp; Safe Packaging</p>
                                <p class="text-xs text-gray-600 mt-0.5">Each suit is checked for stitching precision, fabric measurement, and defect-free finishing before sealing.</p>
                            </div>
                        </div>
                    </div>
                    <div class="flex justify-end pt-1">
                        <button type="button" onclick="closeAuthenticQualityModal()" class="px-6 py-2.5 bg-slao-maroon hover:bg-slao-maroonDark text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeAuthenticQualityModal();
        });
        document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');
}

function closeAuthenticQualityModal() {
    const modal = document.getElementById('slao-quality-details-modal');
    if (modal) modal.classList.add('hidden');
}



const SLAO_OUTFIT_SPECS_BY_ID = {
    1: {
        overview: "A timeless black luxury unstitched 3-piece lawn ensemble crafted with intricate neckline and daman embroidery, paired with an organza-bordered trouser and a lightweight printed chiffon dupatta.",
        shirtFabric: "100% Pure Swiss Lawn (Embroidered Front, Printed Back & Sleeves)",
        trouserFabric: "Dyed Cambric Cotton with Embroidered Organza Border",
        dupattaFabric: "Crinkle Printed Pure Chiffon (2.5 Yards)",
        workTechnique: "Resham & Tilla Thread Embroidery with Organza Patti",
        piecesIncluded: "3-Piece (Shirt, Trouser & Dupatta)",
        season: "Spring / Summer & Festive Daytime",
        careInstructions: "Gentle hand wash separately in cold water; dry in shade."
    },
    2: {
        overview: "An effortless everyday ready-to-wear cotton pret kurti tailored in a flattering straight-cut silhouette with delicate neckline threadwork and breathable comfort.",
        shirtFabric: "Soft Combed Pure Cotton",
        trouserFabric: "Optional / Shirt Only (Straight Cut Pret Kurti)",
        dupattaFabric: "Not Included (Single Pret Kurti)",
        workTechnique: "Delicate Neckline Embroidery & Fine Pintucks",
        piecesIncluded: "1-Piece Stitched Pret Kurti",
        season: "All-Season / Daily & Office Wear",
        careInstructions: "Mild machine or hand wash; iron on medium heat."
    },
    3: {
        overview: "A statement festive unstitched 3-piece chiffon suit enriched with shimmering zari threadwork, ideal for weddings, Eid gatherings, and formal celebrations.",
        shirtFabric: "Heavy Embroidered Pure Bamber Chiffon with Raw Silk Inner",
        trouserFabric: "Dyed Grip / Raw Silk Trouser",
        dupattaFabric: "Embroidered Net / Chiffon Dupatta with Four-Sided Border",
        workTechnique: "Zari, Sequins & Fine Resham Embroidery",
        piecesIncluded: "3-Piece (Shirt, Inner/Trouser & Embroidered Dupatta)",
        season: "Festive / Wedding & Evening Occasions",
        careInstructions: "Dry clean recommended to preserve zari and chiffon sheen."
    },
    4: {
        overview: "A regal stitched formal kurti suit tailored for evening occasions, combining rich embroidery with a structured, graceful drape.",
        shirtFabric: "Premium Blended Silk / Dobby Lawn",
        trouserFabric: "Tailored Straight Cigarette Pants",
        dupattaFabric: "Gold-Foil Bordered Organza Dupatta",
        workTechnique: "Hand-Finished Zari & Thread Motif Work",
        piecesIncluded: "3-Piece Stitched Suit (Shirt, Trouser & Dupatta)",
        season: "Evening & Formal Gatherings",
        careInstructions: "Dry clean only; store hanging in a garment bag."
    },
    5: {
        overview: "A vibrant floral ready-to-wear cotton pret outfit designed for breezy daytime comfort with clean tailoring and color-fast botanical prints.",
        shirtFabric: "Breathable Digital Printed Cotton Lawn",
        trouserFabric: "Matching Printed / Solid Cotton Cambric Trouser",
        dupattaFabric: "Lightweight Printed Mulmul / Voile",
        workTechnique: "High-Definition Digital Floral Print with Lace Trim",
        piecesIncluded: "2-Piece / 3-Piece Ready-to-Wear Set",
        season: "Summer & Casual Daytime Wear",
        careInstructions: "Cold water wash; avoid direct harsh sunlight while drying."
    },
    6: {
        overview: "A contemporary minimal silk-blend tunic featuring clean modern lines, fluid drape, and understated luxury suitable for smart-casual or semi-formal styling.",
        shirtFabric: "Premium Satin Silk Blend",
        trouserFabric: "Coordinated Relaxed Fit Trouser (Optional Styling)",
        dupattaFabric: "Not Included (Contemporary Western Tunic)",
        workTechnique: "Tailored Pleat Detailing & French Seam Finish",
        piecesIncluded: "1-Piece Stitched Tunic",
        season: "Year-Round / Smart Casual & Evening",
        careInstructions: "Gentle cold hand wash or dry clean; steam iron on low."
    },
    7: {
        overview: "A rich unstitched 2-piece self-woven jacquard suit accented with an ornate neckline motif, offering structured elegance and lasting comfort.",
        shirtFabric: "Self-Woven Yarn-Dyed Cotton Jacquard",
        trouserFabric: "Dyed Cambric Trouser",
        dupattaFabric: "Not Included (2-Piece Shirt & Trouser)",
        workTechnique: "Woven Jacquard Pattern with Embroidered Neckline Patch",
        piecesIncluded: "2-Piece Unstitched (Shirt & Trouser)",
        season: "Mid-Season & Festive Casual",
        careInstructions: "Gentle hand wash in cold water; do not bleach."
    },
    8: {
        overview: "A crisp, minimalist ivory linen co-ord set featuring a relaxed button-down top and matching tailored trousers for effortless daytime sophistication.",
        shirtFabric: "Pure Breathable Woven Linen",
        trouserFabric: "Matching Straight-Leg Linen Trousers with Elasticated Back Waist",
        dupattaFabric: "Not Included (2-Piece Co-Ord Set)",
        workTechnique: "Clean Tailored Stitching with Mother-of-Pearl Style Buttons",
        piecesIncluded: "2-Piece Co-Ord Set (Top & Trousers)",
        season: "Spring / Summer Daytime",
        careInstructions: "Machine wash gentle cold; steam or press while slightly damp."
    }
};

function getProductOutfitSpecs(prod) {
    if (!prod) return SLAO_OUTFIT_SPECS_BY_ID[1];
    return prod.specifications || SLAO_OUTFIT_SPECS_BY_ID[prod.id] || {
        overview: prod.description || "Crafted with premium export-grade fabric, intricate detailing, and tailored comfort for effortless elegance.",
        shirtFabric: "Premium Export-Grade Fabric",
        trouserFabric: "Matching Dyed Cambric / Blended Fabric",
        dupattaFabric: "Lightweight Printed / Embroidered Dupatta",
        workTechnique: "Fine Designer Print & Thread Embroidery",
        piecesIncluded: prod.category === "western" ? "Co-Ord / Tunic Outfit" : "3-Piece Ensemble",
        season: "All-Season Collection",
        careInstructions: "Gentle cold wash or dry clean recommended."
    };
}

function openSizeGuideModal() {
    ensureGlobalPopups();
    let modal = document.getElementById('slao-size-guide-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'slao-size-guide-modal';
        modal.className = 'hidden fixed inset-0 z-[9997] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border-2 border-slao-maroon my-auto">
                <div class="bg-slao-maroon text-white px-6 py-4 flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <i class="fa-solid fa-ruler-combined text-lg text-slao-gold"></i>
                        <h3 class="font-serif text-lg sm:text-xl font-bold">Outfit Size Guide (Inches)</h3>
                    </div>
                    <button type="button" onclick="closeSizeGuideModal()" class="text-white/80 hover:text-white text-xl">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div class="p-6 space-y-4 text-xs sm:text-sm">
                    <div class="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 font-semibold flex items-center gap-2">
                        <i class="fa-solid fa-triangle-exclamation text-amber-600"></i>
                        <span>Please check the Size Guide carefully before placing your order to ensure the best fit.</span>
                    </div>
                    <p class="text-gray-600 copyable-text">
                        All measurements below are garment measurements in <b>inches</b> for SLAO Collections Pret, Kurti, and Western outfits.
                    </p>
                    <div class="overflow-x-auto rounded-2xl border border-gray-200">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slao-maroon text-white text-[11px] uppercase tracking-wider">
                                    <th class="py-3 px-4">Size</th>
                                    <th class="py-3 px-4">Chest</th>
                                    <th class="py-3 px-4">Waist</th>
                                    <th class="py-3 px-4">Hip</th>
                                    <th class="py-3 px-4">Shoulder</th>
                                    <th class="py-3 px-4">Shirt Length</th>
                                    <th class="py-3 px-4">Trouser Length</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200 text-gray-800 font-medium">
                                <tr class="hover:bg-slao-cream/70">
                                    <td class="py-2.5 px-4 font-extrabold text-slao-maroon">Small (S)</td>
                                    <td class="py-2.5 px-4">19"</td>
                                    <td class="py-2.5 px-4">18"</td>
                                    <td class="py-2.5 px-4">20.5"</td>
                                    <td class="py-2.5 px-4">14"</td>
                                    <td class="py-2.5 px-4">38"</td>
                                    <td class="py-2.5 px-4">37"</td>
                                </tr>
                                <tr class="hover:bg-slao-cream/70 bg-slao-cream/40">
                                    <td class="py-2.5 px-4 font-extrabold text-slao-maroon">Medium (M)</td>
                                    <td class="py-2.5 px-4">20.5"</td>
                                    <td class="py-2.5 px-4">19.5"</td>
                                    <td class="py-2.5 px-4">22"</td>
                                    <td class="py-2.5 px-4">14.5"</td>
                                    <td class="py-2.5 px-4">39"</td>
                                    <td class="py-2.5 px-4">38"</td>
                                </tr>
                                <tr class="hover:bg-slao-cream/70">
                                    <td class="py-2.5 px-4 font-extrabold text-slao-maroon">Large (L)</td>
                                    <td class="py-2.5 px-4">22.5"</td>
                                    <td class="py-2.5 px-4">21.5"</td>
                                    <td class="py-2.5 px-4">24"</td>
                                    <td class="py-2.5 px-4">15.5"</td>
                                    <td class="py-2.5 px-4">40"</td>
                                    <td class="py-2.5 px-4">39"</td>
                                </tr>
                                <tr class="hover:bg-slao-cream/70 bg-slao-cream/40">
                                    <td class="py-2.5 px-4 font-extrabold text-slao-maroon">Extra Large (XL)</td>
                                    <td class="py-2.5 px-4">24.5"</td>
                                    <td class="py-2.5 px-4">23.5"</td>
                                    <td class="py-2.5 px-4">26"</td>
                                    <td class="py-2.5 px-4">16.5"</td>
                                    <td class="py-2.5 px-4">41"</td>
                                    <td class="py-2.5 px-4">40"</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="flex justify-end">
                        <button type="button" onclick="closeSizeGuideModal()" class="px-6 py-2.5 bg-slao-maroon hover:bg-slao-maroonDark text-white font-bold rounded-xl text-xs uppercase tracking-wider shadow">Close Size Guide</button>
                    </div>
                </div>
            </div>
        `;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeSizeGuideModal();
        });
        document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');
}

function closeSizeGuideModal() {
    const modal = document.getElementById('slao-size-guide-modal');
    if (modal) modal.classList.add('hidden');
}

// =========================================================================
// PINNED WHATSAPP CHAT BUTTON (ABOVE BOTTOM) + PRE-FILLED CHAT TEXT
// =========================================================================
const SLAO_WHATSAPP_NUMBER = '923329975035';
const SLAO_WHATSAPP_DEFAULT_TEXT = 'Hello SLAO Collections! I would like to inquire about your outfits, fabric quality, sizes, and placing an order.';

function getSlaoWhatsAppChatUrl(customText) {
    const prodTitleEl = document.getElementById('prod-title');
    const productName = prodTitleEl ? prodTitleEl.innerText.trim() : '';
    const text = customText || (
        productName
            ? `Hello SLAO Collections! I would like to get details and place an order for "${productName}".`
            : SLAO_WHATSAPP_DEFAULT_TEXT
    );
    return `https://wa.me/${SLAO_WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function openSlaoWhatsAppChat(customText) {
    const url = getSlaoWhatsAppChatUrl(customText);
    window.open(url, '_blank', 'noopener,noreferrer');
}

function ensurePinnedWhatsAppButton() {
    if (!document.body) return;
    if (document.getElementById('slao-pinned-whatsapp-wrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'slao-pinned-whatsapp-wrap';
    wrap.style.cssText = 'position: fixed; right: 20px; bottom: 28px; z-index: 9990; cursor: pointer;';
    wrap.innerHTML = `
        <button type="button" onclick="openSlaoWhatsAppChat()" aria-label="Chat on WhatsApp" title="Chat on WhatsApp with SLAO Collections" style="cursor: pointer !important;" class="group flex items-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-3 rounded-full shadow-2xl border-2 border-white/90 transition transform hover:scale-105">
            <i class="fa-brands fa-whatsapp text-2xl"></i>
            <span class="text-xs uppercase tracking-wider font-extrabold pr-1">WhatsApp Chat</span>
        </button>
    `;
    document.body.appendChild(wrap);
}

function arrangeWhatsAppAndReviewsSideBySide() {
    // On checkout page, pair the post-order review box with a WhatsApp Chat card side-by-side
    const reviewBox = document.getElementById('post-order-review-box');
    if (reviewBox && !document.getElementById('slao-checkout-whatsapp-side-card')) {
        const wrapper = document.createElement('div');
        wrapper.id = 'slao-checkout-whatsapp-side-row';
        wrapper.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 items-start';

        const waCard = document.createElement('div');
        waCard.id = 'slao-checkout-whatsapp-side-card';
        waCard.className = 'p-5 bg-emerald-50 border border-emerald-400 rounded-2xl space-y-3 h-full flex flex-col justify-between';
        waCard.innerHTML = `
            <div class="space-y-2">
                <div class="flex items-center gap-2 text-emerald-800">
                    <i class="fa-brands fa-whatsapp text-xl text-emerald-600"></i>
                    <h3 class="text-sm font-bold uppercase copyable-text">WhatsApp Chat Support</h3>
                </div>
                <p class="text-xs text-gray-700 leading-relaxed copyable-text">
                    Hello SLAO Collections! Chat directly with our team on WhatsApp regarding your order, delivery, or outfit size and fabric details.
                </p>
            </div>
            <button type="button" onclick="openSlaoWhatsAppChat()" class="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl uppercase tracking-wider shadow transition flex items-center justify-center gap-2">
                <i class="fa-brands fa-whatsapp text-base"></i>
                <span>Open WhatsApp Chat</span>
            </button>
        `;

        reviewBox.parentNode.insertBefore(wrapper, reviewBox);
        wrapper.appendChild(waCard);
        wrapper.appendChild(reviewBox);
    }
}


async function openLeftCustomerReviewButton() {
    ensureGlobalPopups();
    let modal = document.getElementById('slao-customer-reviews-section-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'slao-customer-reviews-section-modal';
        modal.className = 'hidden fixed inset-0 z-[9996] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border-2 border-slao-maroon my-auto">
                <div class="bg-slao-maroon text-white px-6 py-4 flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                        <i class="fa-solid fa-star text-lg text-slao-gold"></i>
                        <h3 class="font-serif text-lg sm:text-xl font-bold">Customer Reviews</h3>
                    </div>
                    <button type="button" onclick="closeCustomerReviewsSectionModal()" class="text-white/80 hover:text-white text-xl">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
                <div id="slao-customer-reviews-section-body" class="p-6 space-y-3 max-h-[70vh] overflow-y-auto text-xs sm:text-sm"></div>
            </div>
        `;
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeCustomerReviewsSectionModal();
        });
        document.body.appendChild(modal);
    }

    const bodyEl = document.getElementById('slao-customer-reviews-section-body');
    let reviews = [];
    try {
        const localRev = JSON.parse(localStorage.getItem('slao_reviews') || '[]');
        if (Array.isArray(localRev)) reviews = localRev;
    } catch (e) {}

    try {
        if (typeof SLAO_API_BASE !== 'undefined') {
            const res = await fetch(`${SLAO_API_BASE}/reviews`);
            if (res.ok) {
                const remoteRev = await res.json();
                if (Array.isArray(remoteRev) && remoteRev.length) {
                    const seen = new Set(reviews.map(r => r.id || (r.customerName + '|' + r.comment + '|' + r.date)));
                    remoteRev.forEach(r => {
                        const k = r.id || (r.customerName + '|' + r.comment + '|' + r.date);
                        if (!seen.has(k)) {
                            seen.add(k);
                            reviews.push(r);
                        }
                    });
                }
            }
        }
    } catch (e) {}

    if (bodyEl) {
        if (!reviews || reviews.length === 0) {
            // Keep empty when no customer reviews exist
            bodyEl.innerHTML = `<div id="slao-empty-reviews-container" class="min-h-[140px]"></div>`;
        } else {
            bodyEl.innerHTML = reviews.map(r => {
                const stars = '★'.repeat(Number(r.rating || 5)) + '☆'.repeat(Math.max(0, 5 - Number(r.rating || 5)));
                return `
                    <div class="p-4 rounded-2xl bg-slao-cream border border-slao-gold/40 space-y-1.5">
                        <div class="flex items-center justify-between gap-2">
                            <span class="font-bold text-slao-maroon">${r.customerName || 'Customer'}</span>
                            <span class="text-amber-500 font-bold tracking-wider">${stars}</span>
                        </div>
                        ${r.productName ? `<p class="text-[11px] font-semibold text-gray-500">${r.productName}</p>` : ''}
                        <p class="text-gray-800">${r.comment || ''}</p>
                        ${r.date ? `<p class="text-[11px] text-gray-400">${r.date}</p>` : ''}
                    </div>
                `;
            }).join('');
        }
    }

    modal.classList.remove('hidden');
}

function closeCustomerReviewsSectionModal() {
    const modal = document.getElementById('slao-customer-reviews-section-modal');
    if (modal) modal.classList.add('hidden');
}


function ensurePinnedLeftReviewButton() {
    if (!document.body) return;
    if (document.getElementById('slao-pinned-review-left-wrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'slao-pinned-review-left-wrap';
    wrap.style.cssText = 'position: fixed; left: 20px; bottom: 72px; z-index: 9990; cursor: pointer;';
    wrap.innerHTML = `
        <button type="button" onclick="openLeftCustomerReviewButton()" aria-label="Customer Review" title="Customer Review" style="cursor: pointer !important;" class="group flex items-center gap-2 bg-slao-maroon hover:bg-slao-maroonDark text-white font-bold px-4 py-3 rounded-full shadow-2xl border-2 border-slao-gold transition transform hover:scale-105">
            <i class="fa-solid fa-star text-slao-gold text-base"></i>
            <span class="text-xs uppercase tracking-wider font-extrabold pr-1">Reviews</span>
        </button>
    `;
    document.body.appendChild(wrap);
}
