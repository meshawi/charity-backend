const express = require('express');
const router = express.Router();
const { getPrograms, createProgram, updateProgram, deleteProgram, getProgramBeneficiaries } = require('../controllers/programController');
const { authenticate } = require('../middleware/auth');
const { hasPermission } = require('../middleware/permission');

router.get('/', authenticate, hasPermission('manage_programs'), getPrograms);
router.get('/:id/beneficiaries', authenticate, hasPermission('view_profiles'), getProgramBeneficiaries);
router.post('/', authenticate, hasPermission('manage_programs'), createProgram);
router.put('/:id', authenticate, hasPermission('manage_programs'), updateProgram);
router.delete('/:id', authenticate, hasPermission('manage_programs'), deleteProgram);

module.exports = router;
