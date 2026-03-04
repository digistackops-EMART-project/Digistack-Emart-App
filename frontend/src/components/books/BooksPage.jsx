// ============================================================
// src/components/books/BooksPage.jsx
//
// Main Books page — fetches from PostgreSQL booksdb via
// Books Service REST API. Renders one BookCard per row in DB.
//
// Features:
//   • Dynamic card count = rows in books table
//   • Search by name/author
//   • Filter by category
//   • Add Book button → AddBookModal → POST /api/v1/books
//   • Add to Cart → CartContext (shared with other services)
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import BookCard     from './BookCard';
import AddBookModal from './AddBookModal';
import { booksApi } from '../../services/booksApi';
import { useCart }   from '../../context/CartContext';
import './Books.css';

const CATEGORIES = [
  { value: '',             label: 'All Categories' },
  { value: 'programming',  label: 'Programming'  },
  { value: 'science',      label: 'Science'       },
  { value: 'mathematics',  label: 'Mathematics'   },
  { value: 'business',     label: 'Business'      },
  { value: 'fiction',      label: 'Fiction'       },
  { value: 'general',      label: 'General'       },
  { value: 'other',        label: 'Other'         },
];

function BooksPage() {
  const { addItem } = useCart();

  const [books,       setBooks]       = useState([]);
  const [totalBooks,  setTotalBooks]  = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [showModal,   setShowModal]   = useState(false);
  const [searchTerm,  setSearchTerm]  = useState('');
  const [category,    setCategory]    = useState('');
  const [searchInput, setSearchInput] = useState('');

  // ── Fetch books from Books Service → PostgreSQL ────────────
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (category)   params.category = category;
      if (searchTerm) params.search   = searchTerm;
      params.limit  = 100;
      params.offset = 0;

      const res = await booksApi.getAllBooks(params);

      if (res.data?.success) {
        setBooks(res.data.data.books);
        setTotalBooks(res.data.data.total);
      } else {
        setError('Failed to load books. Please try again.');
      }
    } catch (err) {
      console.error('Books fetch error:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Cannot reach Books Service. Check if the service is running.');
      } else {
        setError(err.response?.data?.message || 'Failed to load books. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [category, searchTerm]);

  // Fetch on mount and whenever filters change
  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // ── Debounced search ───────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Add to Cart ────────────────────────────────────────────
  const handleAddToCart = async (book) => {
    try {
      await addItem({
        item_id:    String(book.id),
        name:       book.name,
        price:      parseFloat(book.cost),
        quantity:   1,
        category:   'books',
        image_url:  book.image_url || null,
      });
      toast.success(`"${book.name}" added to cart!`, { autoClose: 2500 });
    } catch (err) {
      toast.error('Could not add to cart. Please try again.');
      throw err; // Let BookCard handle its own loading state
    }
  };

  // ── After adding book via modal ────────────────────────────
  const handleBookAdded = (newBook) => {
    setShowModal(false);
    setBooks(prev => [newBook, ...prev]);
    setTotalBooks(prev => prev + 1);
    toast.success(`"${newBook.name}" added to the catalogue!`, { autoClose: 3000 });
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="books-page" data-testid="books-page">

      {/* ── Page header ──────────────────────────────────── */}
      <div className="books-page-header">
        <div className="books-page-title">
          <span className="page-icon">📚</span>
          <h1>Books</h1>
          {!loading && (
            <span className="books-count-badge">
              {totalBooks} {totalBooks === 1 ? 'book' : 'books'}
            </span>
          )}
        </div>

        {/* ── Controls: search + category + add button ──── */}
        <div className="books-controls">

          {/* Search bar */}
          <div className="books-search">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search books or authors..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              data-testid="books-search"
              aria-label="Search books"
            />
          </div>

          {/* Category filter */}
          <select
            className="category-filter"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            data-testid="category-filter"
            aria-label="Filter by category"
          >
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

          {/* Add Book button — opens AddBookModal */}
          <button
            className="add-book-btn"
            onClick={() => setShowModal(true)}
            data-testid="add-book-btn"
          >
            <span>＋</span> Add Book
          </button>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────── */}

      {loading && (
        <div className="books-loading" data-testid="books-loading">
          <div className="spinner-book" />
          <p>Loading books from database...</p>
        </div>
      )}

      {!loading && error && (
        <div className="books-error" data-testid="books-error">
          <div className="error-icon">⚠️</div>
          <h3>Could not load books</h3>
          <p>{error}</p>
          <button className="retry-btn" onClick={fetchBooks}>
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && books.length === 0 && (
        <div className="books-empty" data-testid="books-empty">
          <div className="empty-icon">📖</div>
          <h3>
            {searchTerm || category
              ? 'No books match your filters'
              : 'No books in the catalogue yet'}
          </h3>
          <p>
            {searchTerm || category
              ? 'Try different search terms or clear the filter.'
              : 'Click "Add Book" to add the first book!'}
          </p>
          {(searchTerm || category) && (
            <button
              className="retry-btn"
              onClick={() => { setSearchInput(''); setCategory(''); }}
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* ── Book Cards Grid ──────────────────────────────── */}
      {/* One card per row in the PostgreSQL booksdb.books table */}
      {!loading && !error && books.length > 0 && (
        <div className="books-grid" data-testid="books-grid">
          {books.map(book => (
            <BookCard
              key={book.id}
              book={book}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      )}

      {/* ── Add Book Modal ────────────────────────────────── */}
      {showModal && (
        <AddBookModal
          onClose={() => setShowModal(false)}
          onSuccess={handleBookAdded}
        />
      )}
    </div>
  );
}

export default BooksPage;
