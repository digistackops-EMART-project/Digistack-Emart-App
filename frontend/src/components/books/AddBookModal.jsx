// ============================================================
// src/components/books/AddBookModal.jsx
// Modal form: Add a new book to PostgreSQL booksdb.books table.
// Fields: Book Name, Author, Cost, Description (per spec)
//         + Category and Stock for completeness
// ============================================================
import React, { useState, useEffect, useRef } from 'react';

const CATEGORIES = [
  { value: 'general',      label: 'General' },
  { value: 'programming',  label: 'Programming' },
  { value: 'science',      label: 'Science' },
  { value: 'mathematics',  label: 'Mathematics' },
  { value: 'business',     label: 'Business' },
  { value: 'fiction',      label: 'Fiction' },
  { value: 'other',        label: 'Other' },
];

const EMPTY_FORM = {
  name:        '',
  author:      '',
  cost:        '',
  description: '',
  category:    'general',
  stock:       '0',
};

function AddBookModal({ onClose, onSuccess }) {
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const [apiError, setApiError] = useState('');
  const firstInputRef = useRef(null);

  // Focus first input on mount
  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // ── Field change ──────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear field error on change
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    setApiError('');
  };

  // ── Client-side validation ────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.name.trim())   errs.name   = 'Book name is required';
    if (!form.author.trim()) errs.author = 'Author name is required';
    if (!form.cost)          errs.cost   = 'Cost is required';
    else if (isNaN(form.cost) || parseFloat(form.cost) < 0)
                             errs.cost   = 'Cost must be a positive number';
    if (form.description && form.description.length > 2000)
                             errs.description = 'Description cannot exceed 2000 characters';
    if (form.stock !== '' && (isNaN(form.stock) || parseInt(form.stock, 10) < 0))
                             errs.stock = 'Stock must be a non-negative number';
    return errs;
  };

  // ── Submit ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    setApiError('');

    try {
      const payload = {
        name:        form.name.trim(),
        author:      form.author.trim(),
        cost:        parseFloat(form.cost),
        description: form.description.trim() || null,
        category:    form.category,
        stock:       parseInt(form.stock || '0', 10),
      };

      // Import here so modal stays decoupled; parent passes onSuccess callback
      const { booksApi } = await import('../../services/booksApi');
      const res = await booksApi.createBook(payload);

      if (res.data?.success) {
        onSuccess(res.data.data);
      } else {
        setApiError(res.data?.message || 'Failed to add book. Please try again.');
      }
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) {
        // Map server validation errors to form fields
        const mapped = {};
        Object.keys(serverErrors).forEach(k => { mapped[k] = serverErrors[k]; });
        setErrors(mapped);
      } else {
        setApiError(err.response?.data?.message || 'Network error. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-book-modal-title"
    >
      <div className="modal-box">
        {/* ── Header ───────────────────────────────────── */}
        <div className="modal-header">
          <h2 id="add-book-modal-title">
            <span>📚</span>
            Add New Book
          </h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* ── Form ─────────────────────────────────────── */}
        <form className="modal-form" onSubmit={handleSubmit} noValidate>

          {/* Book Name ← spec: field 1 */}
          <div className="form-group">
            <label htmlFor="book-name">
              Book Name <span className="required">*</span>
            </label>
            <input
              id="book-name"
              name="name"
              type="text"
              placeholder="e.g. Clean Code"
              value={form.name}
              onChange={handleChange}
              className={errors.name ? 'error' : ''}
              ref={firstInputRef}
              maxLength={255}
              data-testid="input-name"
            />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          {/* Author ← spec: field 2 */}
          <div className="form-group">
            <label htmlFor="book-author">
              Author Name <span className="required">*</span>
            </label>
            <input
              id="book-author"
              name="author"
              type="text"
              placeholder="e.g. Robert C. Martin"
              value={form.author}
              onChange={handleChange}
              className={errors.author ? 'error' : ''}
              maxLength={255}
              data-testid="input-author"
            />
            {errors.author && <p className="form-error">{errors.author}</p>}
          </div>

          {/* Cost + Category row ← spec: field 3 + bonus */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="book-cost">
                Cost (₹) <span className="required">*</span>
              </label>
              <input
                id="book-cost"
                name="cost"
                type="number"
                placeholder="e.g. 499"
                value={form.cost}
                onChange={handleChange}
                className={errors.cost ? 'error' : ''}
                min="0"
                step="0.01"
                data-testid="input-cost"
              />
              {errors.cost && <p className="form-error">{errors.cost}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="book-category">Category</label>
              <select
                id="book-category"
                name="category"
                value={form.category}
                onChange={handleChange}
                data-testid="select-category"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description ← spec: field 4 */}
          <div className="form-group">
            <label htmlFor="book-description">Description</label>
            <textarea
              id="book-description"
              name="description"
              placeholder="Brief description of the book (optional)"
              value={form.description}
              onChange={handleChange}
              className={errors.description ? 'error' : ''}
              maxLength={2000}
              rows={3}
              data-testid="input-description"
            />
            {errors.description && <p className="form-error">{errors.description}</p>}
            <small style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>
              {form.description.length}/2000 characters
            </small>
          </div>

          {/* Stock */}
          <div className="form-group">
            <label htmlFor="book-stock">Stock Quantity</label>
            <input
              id="book-stock"
              name="stock"
              type="number"
              placeholder="e.g. 100"
              value={form.stock}
              onChange={handleChange}
              className={errors.stock ? 'error' : ''}
              min="0"
              data-testid="input-stock"
            />
            {errors.stock && <p className="form-error">{errors.stock}</p>}
          </div>

          {/* API-level error */}
          {apiError && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 8, padding: '10px 14px',
              color: '#DC2626', fontSize: '0.875rem',
            }}>
              ⚠️ {apiError}
            </div>
          )}

          {/* Action buttons */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-save"
              disabled={saving}
              data-testid="btn-save"
            >
              {saving ? '⏳ Saving...' : '✅ Add Book'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default AddBookModal;
