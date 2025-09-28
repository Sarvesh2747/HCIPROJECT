const express = require('express');
const router = express.Router();

const { isAuthenticated } = require('../middleware/authMiddleware');
const billingController = require('../controllers/billingController');

// Authenticated routes
router.post('/payments/online/create-order', isAuthenticated, billingController.createRazorpayOrder);
router.post('/payments/online/verify', isAuthenticated, billingController.verifyPayment);

// Public webhook route
router.post('/webhooks/razorpay', express.raw({type: 'application/json'}), billingController.verifyWebhook);


module.exports = router;