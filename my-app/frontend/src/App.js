import React, { useState, useEffect } from 'react';
import { Link, Routes, Route, useNavigate } from 'react-router-dom';
import './styles/App.css';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import PurchaseHistory from './pages/PurchaseHistory';
import ManageProducts from './pages/ManageProducts';
import AnalyticsView from './pages/Analytics';
import ChatWidget from './components/ChatWidget';
import RecommendationWidget from './components/RecommendationWidget';

// Cart utilities
const getCartFromStorage = () => {
  const saved = localStorage.getItem('cart');
  if (saved) {
    return JSON.parse(saved);
  }
  return [];
};

const saveCartToStorage = (cart) => {
  localStorage.setItem('cart', JSON.stringify(cart));
};

function Home({ token, isAdmin, handleLogout, cart, setCart }) {
  const [goods, setGoods] = useState([]);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recommendationRefreshTs, setRecommendationRefreshTs] = useState(() => localStorage.getItem('recommendationsRefreshTs') || '');
  const userId = React.useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id || user._id || null;
    } catch {
      return null;
    }
  }, [token]);

  useEffect(() => {
    const onRefresh = (event) => {
      let ts = localStorage.getItem('recommendationsRefreshTs') || Date.now().toString();
      if (event?.detail) {
        ts = String(event.detail);
      }
      setRecommendationRefreshTs(ts);
    };
    window.addEventListener('recommendations:refresh', onRefresh);
    return () => window.removeEventListener('recommendations:refresh', onRefresh);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:5000/api/goods/getallgoods')
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        let nextGoods = [];
        if (Array.isArray(data)) {
          nextGoods = data;
        }
        setGoods(nextGoods);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Fetch error');
        setLoading(false);
      });
  }, []);

  const brands = React.useMemo(() => {
    const s = new Set();
    goods.forEach(g => { if (g.brand) s.add(g.brand); });
    return ['', ...Array.from(s).sort()];
  }, [goods]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    const minP = parseFloat(minPrice);
    const maxP = parseFloat(maxPrice);
    const minR = parseFloat(minRating);

    const result = goods.filter((g) => {
      const name = (g.name || '').toString().toLowerCase();
      const brand = (g.brand || '').toString().toLowerCase();
      const category = (g.category || '').toString().toLowerCase();
      const itemid = (g.itemid || '').toString().toLowerCase();

      if (q) {
        const textMatch = name.includes(q) || brand.includes(q) || category.includes(q) || itemid.includes(q);
        if (!textMatch) return false;
      }

      if (brandFilter) {
        if ((g.brand || '') !== brandFilter) return false;
      }

      const price = Number(g.price || 0);
      if (!Number.isNaN(minP) && minPrice !== '' && price < minP) return false;
      if (!Number.isNaN(maxP) && maxPrice !== '' && price > maxP) return false;

      const rating = Number(g.rating || 0);
      if (!Number.isNaN(minR) && minRating !== '' && rating < minR) return false;

      return true;
    });

    setFiltered(result);
  }, [search, brandFilter, minPrice, maxPrice, minRating, goods]);

  const clearFilters = () => {
    setSearch('');
    setBrandFilter('');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item._id === product._id);
    let newCart;
    if (existing) {
      newCart = cart.map((item) => {
        if (item._id === product._id) {
          return { ...item, quantity: item.quantity + 1 };
        }
        return item;
      });
    } else {
      newCart = [...cart, { ...product, quantity: 1 }];
    }
    setCart(newCart);
    saveCartToStorage(newCart);
    alert(`${product.name} added to cart!`);
  };

  // add grouping by category
  const groupedByCategory = React.useMemo(() => {
    const map = new Map();
    // sort filtered items by category then by name
    const sorted = [...filtered].sort((a, b) => {
      const ca = (a.category || '').toString().toLowerCase();
      const cb = (b.category || '').toString().toLowerCase();
      if (ca < cb) return -1;
      if (ca > cb) return 1;
      const na = (a.name || '').toString().toLowerCase();
      const nb = (b.name || '').toString().toLowerCase();
      return na.localeCompare(nb);
    });
    for (const item of sorted) {
      const key = item.category || 'Uncategorized';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return Array.from(map.entries()); // [ [category, items[]], ... ]
  }, [filtered]);

  return (
    <div className="amazon-container">
      <nav className="navbar">
        <Link to="/" className="logo">MyShop</Link>

        <div className="search-wrap">
          <input
            type="text"
            className="search-box"
            placeholder="Search by name, brand, category or id..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="nav-actions">
          <Link to="/cart" className="cart-link">
            🛒 Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
          </Link>
          {token ? (
            <>
              <Link to="/purchase-history" className="nav-orders-link">My Orders</Link>
              {isAdmin && <Link to="/admin/products" className="nav-admin-link">Manage Products</Link>}
              {isAdmin && <Link to="/admin/analytics" className="nav-admin-link nav-analytics-link">Analytics</Link>}
              <button className="nav-logout" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-item">
                <div className="nav-line1">Hello,</div>
                <div className="nav-line2">Sign in</div>
              </Link>
              <Link to="/signup" className="nav-item nav-join">
                <div className="nav-line1">New here?</div>
                <div className="nav-line2">Create account</div>
              </Link>
            </>
          )}
        </div>
      </nav>

      <div className="filters">
        <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
          <option value="">All brands</option>
          {brands.slice(1).map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        <input type="number" placeholder="Min price" value={minPrice} onChange={e => setMinPrice(e.target.value)} min="0" step="0.01" />
        <input type="number" placeholder="Max price" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} min="0" step="0.01" />

        <select value={minRating} onChange={e => setMinRating(e.target.value)}>
          <option value="">Any rating</option>
          <option value="0">0+</option>
          <option value="1">1+</option>
          <option value="2">2+</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
          <option value="5">5</option>
        </select>

        <button className="clear-btn" onClick={clearFilters}>Clear</button>
      </div>

      {token && userId && (
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '12px 20px' }}>
          <RecommendationWidget
            userId={userId}
            maxItems={3}
            onAddToCart={addToCart}
            refreshSignal={recommendationRefreshTs}
          />
        </div>
      )}

      <main className="content">
        {loading ? (
          <div className="info">Loading goods...</div>
        ) : error ? (
          <div className="error">Error: {error}</div>
        ) : groupedByCategory.length === 0 ? (
          <div className="info">No goods found.</div>
        ) : (
          <>
            {groupedByCategory.map(([category, items]) => (
              <section key={category} style={{ marginBottom: 28 }}>
                <h2 style={{ margin: '8px 0 12px', color: '#222' }}>{category}</h2>
                <div className="goods-grid">
                  {items.map((good) => (
                    <div key={good._id || good.itemid} className="good-card">
                      <div className="good-image-wrap">
                        {good.imageUrl && good.imageUrl.length > 0 ? (
                          <img src={good.imageUrl[0]} alt={good.name} className="good-image" />
                        ) : (
                          <div className="image-placeholder">No image</div>
                        )}
                      </div>
                      <div className="good-info">
                        <Link to={`/product/${good._id}`} className="good-name">{good.name}</Link>
                        <div className="good-brand">{good.brand}</div>
                        <div className="good-category">{good.category}</div>
                        <div className="good-price">${Number(good.price || 0).toFixed(2)}</div>
                        <div className="good-rating">⭐ {good.rating ?? 'N/A'}</div>
                        <button className="add-to-cart-btn" onClick={() => addToCart(good)}>
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();
  const isAdmin = !!user.isAdmin;
  const [cart, setCart] = useState(getCartFromStorage());

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<Home token={token} isAdmin={isAdmin} handleLogout={handleLogout} cart={cart} setCart={setCart} />} />
        <Route path="/product/:id" element={<ProductDetail cart={cart} setCart={setCart} />} />
        <Route path="/cart" element={<Cart cart={cart} setCart={setCart} />} />
        <Route path="/checkout" element={<Checkout cart={cart} setCart={setCart} />} />
        <Route path="/order-success/:orderNumber" element={<OrderSuccess />} />
        <Route path="/purchase-history" element={<PurchaseHistory />} />
        <Route path="/admin/products" element={<ManageProducts />} />
        <Route path="/admin/analytics" element={<AnalyticsView />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
      </Routes>
      <ChatWidget />
    </>
  );
}
