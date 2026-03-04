'use strict';

const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { authenticate }  = require('../middleware/authMiddleware');
const bookController    = require('../controllers/bookController');

const router = Router();

const VALID_CATEGORIES = ['general', 'programming', 'science', 'mathematics', 'business', 'fiction', 'other'];

const bookCreateRules = [
  body('name').trim().notEmpty().withMessage('Book name is required').isLength({ max: 255 }),
  body('author').trim().notEmpty().withMessage('Author is required').isLength({ max: 255 }),
  body('cost').notEmpty().withMessage('Cost is required').isFloat({ min: 0 }).withMessage('Cost must be ≥ 0'),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('category').optional().isIn(VALID_CATEGORIES).withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
];

const bookUpdateRules = [
  param('id').isInt({ min: 1 }).withMessage('Invalid book id'),
  body('name').optional().trim().notEmpty().isLength({ max: 255 }),
  body('author').optional().trim().notEmpty().isLength({ max: 255 }),
  body('cost').optional().isFloat({ min: 0 }),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('category').optional().isIn(VALID_CATEGORIES),
  body('stock').optional().isInt({ min: 0 }),
];

const idRule = [param('id').isInt({ min: 1 }).withMessage('Invalid book id')];

const listRules = [
  query('limit').optional().isInt({ min: 1, max: 200 }),
  query('offset').optional().isInt({ min: 0 }),
  query('category').optional().isIn(VALID_CATEGORIES),
];

router.use(authenticate);

router.get('/',            listRules,       bookController.getAllBooks);
router.get('/:id',         idRule,          bookController.getBookById);
router.post('/',           bookCreateRules, bookController.createBook);
router.put('/:id',         bookUpdateRules, bookController.updateBook);
router.delete('/:id',      idRule,          bookController.deleteBook);

module.exports = router;
