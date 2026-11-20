const express = require('express');
const controller = require('../controllers/waitlistController');

const router = express.Router();

router.route('/').get(controller.list).post(controller.join);
router.get('/failed', controller.listFailed);

module.exports = router;
