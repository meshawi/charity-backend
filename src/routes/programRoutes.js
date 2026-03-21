const express = require('express');
const router = express.Router();
const { getPrograms, getProgramById, createProgram, updateProgram, deleteProgram } = require('../controllers/programController');
const { authenticate } = require('../middleware/auth');
const { hasPermission } = require('../middleware/permission');

router.get('/', authenticate, getPrograms);
router.get('/:id', authenticate, getProgramById);
router.post('/', authenticate, hasPermission('manage_programs'), createProgram);
router.put('/:id', authenticate, hasPermission('manage_programs'), updateProgram);
router.delete('/:id', authenticate, hasPermission('manage_programs'), deleteProgram);

module.exports = router;
