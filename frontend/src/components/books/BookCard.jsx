// ============================================================
// src/components/books/BookCard.jsx
//
// Card layout spec:
//   50% — Book Name      (from DB: books.name)
//   20% — Author Name    (from DB: books.author)
//   20% — Cost           (from DB: books.cost)
//   10% — Add to Cart    (action button)
// ============================================================
import React, { useState } from 'react';

function BookCard({ book, onAddToCart }) {
  const [adding, setAdding] = useState(false);
  const [added,  setAdded]  = useState(false);

  const handleAddToCart = async () => {
    if (book.stock === 0 || adding) return;
    setAdding(true);
    try {
      await onAddToCart(book);
      setAdded(true);
      setTimeout(() => setAdded(false), 2500);
    } finally {
      setAdding(false);
    }
  };

  // Stock label helper
  const stockLabel = () => {
    if (book.stock === 0)    return { text: 'Out of stock', cls: 'stock-out' };
    if (book.stock <= 5)     return { text: `Only ${book.stock} left`, cls: 'stock-low' };
    return { text: 'In stock', cls: 'stock-in' };
  };
  const stock = stockLabel();

  // Category accent class
  const accentClass = `book-card-accent cat-${book.category || 'general'}`;

  // Format cost in INR
  const formatCost = (cost) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })
      .format(cost);

  return (
    <article className="book-card" data-testid="book-card" data-book-id={book.id}>
      {/* Category colour accent bar */}
      <div className={accentClass} />

      <div className="book-card-body">

        {/* ── ROW 1: Book Name — 50% ────────────────────── */}
        <div className="book-name-row">
          <h3 className="book-name" title={book.name}>
            {book.name}
          </h3>
          {book.category && (
            <span className="book-category-tag">{book.category}</span>
          )}
        </div>

        {/* ── ROW 2: Author — 20% ───────────────────────── */}
        <div className="book-author-row">
          <span className="author-icon">✍️</span>
          <p className="book-author" title={book.author}>
            {book.author}
          </p>
        </div>

        {/* ── ROW 3: Cost — 20% ────────────────────────── */}
        <div className="book-cost-row">
          <span className="cost-label">Price</span>
          <p className="book-cost">{formatCost(book.cost)}</p>
          <span className={`stock-indicator ${stock.cls}`}>
            {stock.text}
          </span>
        </div>

        {/* ── ROW 4: Add to Cart — 10% ─────────────────── */}
        <div className="book-action-row">
          <button
            className={`add-to-cart-btn${adding ? ' adding' : ''}`}
            onClick={handleAddToCart}
            disabled={book.stock === 0 || adding}
            data-testid="add-to-cart-btn"
            aria-label={`Add ${book.name} to cart`}
          >
            {adding ? (
              <><span>⏳</span> Adding...</>
            ) : added ? (
              <><span>✅</span> Added!</>
            ) : book.stock === 0 ? (
              <><span>❌</span> Out of Stock</>
            ) : (
              <><span>🛒</span> Add to Cart</>
            )}
          </button>
        </div>

      </div>
    </article>
  );
}

export default BookCard;
