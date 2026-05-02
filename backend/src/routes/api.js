import express from 'express';
import * as baseController from '../controllers/baseController.js';

const router = express.Router();

router.get('/:collection', baseController.getAll);
router.post('/:collection', baseController.create);
router.put('/:collection/:id', baseController.update);
router.delete('/:collection/:id', baseController.remove);
router.post('/:collection/batch', baseController.batchUpdate);

export default router;
