'use strict';

const { validationResult } = require('express-validator');
const BookModel = require('../models/book');
const logger    = require('../utils/logger');

async function getAllBooks(req, res, next) {
  try {
    const { category, search, limit = 100, offset = 0 } = req.query;
    const result = await BookModel.findAll({
      category, search,
      limit:  parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
    return res.status(200).json({
      success: true,
      data: {
        books: result.books,
        total: result.total,
      },
    });
  } catch (err) { next(err); }
}

async function getBookById(req, res, next) {
  try {
    const book = await BookModel.findById(req.params.id);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    return res.status(200).json({ success: true, data: book });
  } catch (err) { next(err); }
}

async function createBook(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  try {
    const { name, author, cost, description, category, stock } = req.body;
    const book = await BookModel.create({ name, author, cost, description, category, stock });
    logger.info({ msg: 'Book created', id: book.id, name: book.name, by: req.user?.sub });
    return res.status(201).json({ success: true, data: book });
  } catch (err) {
    // Unique constraint violation
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'A book with this name and author already exists' });
    }
    next(err);
  }
}

async function updateBook(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  try {
    const book = await BookModel.update(req.params.id, req.body);
    if (!book) return res.status(404).json({ success: false, message: 'Book not found' });
    logger.info({ msg: 'Book updated', id: book.id, by: req.user?.sub });
    return res.status(200).json({ success: true, data: book });
  } catch (err) { next(err); }
}

async function deleteBook(req, res, next) {
  try {
    const deleted = await BookModel.delete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Book not found' });
    logger.info({ msg: 'Book deleted', id: deleted.id, name: deleted.name, by: req.user?.sub });
    return res.status(200).json({ success: true, message: 'Book deleted', data: deleted });
  } catch (err) { next(err); }
}

module.exports = { getAllBooks, getBookById, createBook, updateBook, deleteBook };
