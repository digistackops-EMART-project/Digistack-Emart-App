// ============================================================
// src/services/booksApi.js
// Books Service HTTP client.
// Nginx proxies /books-api/* → localhost:8082 (books-service)
// URL rewrite strips /books-api prefix before forwarding.
// ============================================================
import axios from 'axios';

const BOOKS_BASE_URL = process.env.REACT_APP_BOOKS_API_URL || '/books-api/api/v1';

const booksAxios = axios.create({
  baseURL: BOOKS_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Attach JWT token from Login Service on every request
booksAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('emart_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
booksAxios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('emart_token');
      localStorage.removeItem('emart_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const booksApi = {
  // GET /api/v1/books?category=&search=&limit=&offset=
  getAllBooks: (params = {}) => booksAxios.get('/books', { params }),

  // GET /api/v1/books/:id
  getBookById: (id) => booksAxios.get(`/books/${id}`),

  // POST /api/v1/books  { name, author, cost, description, category, stock }
  createBook: (book) => booksAxios.post('/books', book),

  // PUT /api/v1/books/:id
  updateBook: (id, data) => booksAxios.put(`/books/${id}`, data),

  // DELETE /api/v1/books/:id
  deleteBook: (id) => booksAxios.delete(`/books/${id}`),
};

export default booksApi;
