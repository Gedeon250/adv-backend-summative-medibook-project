const express = require('express');
const controller = require('../controllers/patientController');
const validateIdParam = require('../middleware/validateIdParam');

const router = express.Router();
router.param('id', validateIdParam);

router.route('/').get(controller.list).post(controller.create);
router.route('/:id')
  .get(controller.getOne)
  .put(controller.replace)
  .patch(controller.modify)
  .delete(controller.remove);

module.exports = router;
