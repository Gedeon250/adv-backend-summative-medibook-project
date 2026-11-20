const express = require('express');
const controller = require('../controllers/doctorController');
const validateIdParam = require('../middleware/validateIdParam');

const router = express.Router();
router.param('id', validateIdParam);

router.route('/').get(controller.list).post(controller.create);
router.get('/:id/statistics', controller.statistics);
router.route('/:id')
  .get(controller.getOne)
  .put(controller.replace)
  .patch(controller.modify)
  .delete(controller.remove);

module.exports = router;
