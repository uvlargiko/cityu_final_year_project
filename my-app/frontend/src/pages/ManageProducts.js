import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/ManageProducts.css';

const EMPTY_FORM = {
  itemid: '',
  name: '',
  price: '',
  brand: '',
  category: '',
  countInStock: '',
  type: '',
  description: '',
  rating: '',
  numReviews: '',
  imageUrlText: ''
};

function parseImageUrls(value) {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export default function ManageProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState('');
  const [saving, setSaving] = useState(false);

  const isAdmin = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return !!user.isAdmin;
    } catch {
      return false;
    }
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/goods/getallgoods');
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId('');
  };

  const onEdit = (product) => {
    setEditingId(product._id || '');
    setForm({
      itemid: product.itemid || '',
      name: product.name || '',
      price: String(product.price ?? ''),
      brand: product.brand || '',
      category: product.category || '',
      countInStock: String(product.countInStock ?? ''),
      type: product.type || '',
      description: product.description || '',
      rating: String(product.rating ?? ''),
      numReviews: String(product.numReviews ?? ''),
      imageUrlText: Array.isArray(product.imageUrl) ? product.imageUrl.join(', ') : ''
    });
  };

  const buildPayload = () => ({
    itemid: form.itemid.trim(),
    name: form.name.trim(),
    price: Number(form.price),
    brand: form.brand.trim(),
    category: form.category.trim(),
    countInStock: Number(form.countInStock),
    type: form.type.trim(),
    description: form.description.trim(),
    rating: Number(form.rating),
    numReviews: Number(form.numReviews),
    imageUrl: parseImageUrls(form.imageUrlText)
  });

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = buildPayload();
      const url = editingId
        ? `http://localhost:5000/api/goods/${encodeURIComponent(editingId)}`
        : 'http://localhost:5000/api/goods';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      resetForm();
      await loadProducts();
    } catch (e2) {
      setError(e2.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    setError('');
    try {
      const res = await fetch(`http://localhost:5000/api/goods/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      await loadProducts();
    } catch (e) {
      setError(e.message || 'Delete failed');
    }
  };

  if (!isAdmin) {
    return (
      <div className="content">
        <div className="manage-products-blocked">
          <h1>Manage Products</h1>
          <p>Admin access is required.</p>
          <Link to="/" className="manage-products-back">Back to Shop</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="content manage-products-page">
      <div className="manage-products-head">
        <h1>Manage Products</h1>
        <Link to="/" className="manage-products-back">Back to Shop</Link>
      </div>

      {error && <div className="manage-products-error">{error}</div>}

      <form className="manage-products-form" onSubmit={onSubmit}>
        <input value={form.itemid} onChange={(e) => onChange('itemid', e.target.value)} placeholder="Item ID" required />
        <input value={form.name} onChange={(e) => onChange('name', e.target.value)} placeholder="Name" required />
        <input value={form.price} onChange={(e) => onChange('price', e.target.value)} placeholder="Price" type="number" step="0.01" required />
        <input value={form.brand} onChange={(e) => onChange('brand', e.target.value)} placeholder="Brand" required />
        <input value={form.category} onChange={(e) => onChange('category', e.target.value)} placeholder="Category" required />
        <input value={form.countInStock} onChange={(e) => onChange('countInStock', e.target.value)} placeholder="Stock" type="number" required />
        <input value={form.type} onChange={(e) => onChange('type', e.target.value)} placeholder="Type" required />
        <input value={form.rating} onChange={(e) => onChange('rating', e.target.value)} placeholder="Rating" type="number" step="0.1" required />
        <input value={form.numReviews} onChange={(e) => onChange('numReviews', e.target.value)} placeholder="Num Reviews" type="number" required />
        <textarea value={form.description} onChange={(e) => onChange('description', e.target.value)} placeholder="Description" rows={3} required />
        <input value={form.imageUrlText} onChange={(e) => onChange('imageUrlText', e.target.value)} placeholder="Image URLs (comma-separated)" />

        <div className="manage-products-actions">
          <button type="submit" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Update Product' : 'Create Product'}</button>
          {editingId && <button type="button" className="secondary" onClick={resetForm}>Cancel Edit</button>}
        </div>
      </form>

      <section className="manage-products-list">
        <h2>Current Products</h2>
        {loading ? (
          <div className="info">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="info">No products found.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Item ID</th>
                <th>Brand</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id || p.itemid}>
                  <td>{p.name}</td>
                  <td>{p.itemid}</td>
                  <td>{p.brand}</td>
                  <td>{p.category}</td>
                  <td>${Number(p.price || 0).toFixed(2)}</td>
                  <td>{p.countInStock}</td>
                  <td className="row-actions">
                    <button type="button" className="secondary" onClick={() => onEdit(p)}>Edit</button>
                    <button type="button" className="danger" onClick={() => onDelete(p._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
