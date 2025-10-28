// routes/groupRoutes.js
import express from 'express';
import {
    createGroup,
    getUserGroups,
    getMainChat,
    getGroupDetails,
    getAllPublicGroups,
    getAllGroups,
    createGroupPublic,
    getPublicGroupsForDemo,
    updateGroup,
    updateGroupPublic,
    deleteGroup,
    deleteGroupPublic
} from '../controllers/groupController.js';
import { 
    validateCreateGroup,
    validateUpdateGroup,
    validateGroupParams,
    handleValidationErrors 
} from '../middleware/validation.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no authentication required)
router.get('/public', getAllPublicGroups);
router.get('/all', getAllGroups);
router.get('/demo', getPublicGroupsForDemo);

router.post('/create-public', 
    validateCreateGroup,
    handleValidationErrors,
    createGroupPublic
);

router.put('/:groupId/update-public',
    validateUpdateGroup,
    handleValidationErrors,
    updateGroupPublic
);

router.delete('/:groupId/delete-public',
    validateGroupParams,
    handleValidationErrors,
    deleteGroupPublic
);

// Protected routes (require authentication)
router.use(protect);

router.post('/', 
    validateCreateGroup,
    handleValidationErrors,
    createGroup
);

router.get('/my-groups', getUserGroups);
router.get('/main-chat', getMainChat);

router.get('/:groupId',
    validateGroupParams,
    handleValidationErrors,
    getGroupDetails
);

router.put('/:groupId',
    validateUpdateGroup,
    handleValidationErrors,
    updateGroup
);

router.delete('/:groupId',
    validateGroupParams,
    handleValidationErrors,
    deleteGroup
);

export default router;