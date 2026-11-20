const express = require('express');
const controller = require('../controllers/appointmentController');
const validateIdParam = require('../middleware/validateIdParam');

const router = express.Router();
router.param('id', validateIdParam);

router.route('/').get(controller.list).post(controller.book);
router.get('/:id', controller.getOne);
router.patch('/:id/cancel', controller.cancel);

module.exports = router;
