const express = require('express');
const controller = require('../controllers/feedbackController');

const router = express.Router();

router.get('/', controller.showPage);

module.exports = router;
