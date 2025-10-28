// routes/groupMemberRoutes.js
import express from 'express';
import {
    inviteToGroup,
    acceptInvitation,
    getGroupMembers,
    removeMember
} from '../controllers/groupMemberController.js';
import { 
    validateInviteToGroup,
    validateGroupMemberParams,
    validateGroupParams,
    handleValidationErrors 
} from '../middleware/validation.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/:groupId/invite',
    validateInviteToGroup,
    handleValidationErrors,
    inviteToGroup
);

router.post('/:groupId/accept',
    validateGroupParams,
    handleValidationErrors,
    acceptInvitation
);

router.get('/:groupId/members',
    validateGroupParams,
    handleValidationErrors,
    getGroupMembers
);

router.delete('/:groupId/members/:userId',
    validateGroupMemberParams,
    handleValidationErrors,
    removeMember
);

export default router;