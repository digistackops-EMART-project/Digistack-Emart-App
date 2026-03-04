'use strict';

const { Router } = require('express');
const health = require('../controllers/healthController');

const router = Router();

// ── Health endpoints (unauthenticated — used by load balancers and k8s probes) ──
router.get('/',       health.health);
router.get('/live',   health.healthLive);
router.get('/ready',  health.healthReady);

module.exports = router;
