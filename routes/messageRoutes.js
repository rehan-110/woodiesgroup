// routes/messageRoutes.js
import express from 'express';
import {
    sendMessage,
    getGroupMessages,
    getUnreadMessageCount,
    markMessagesAsRead,
    deleteMessage,
    editMessage
} from '../controllers/messageController.js';
import { 
    validateSendMessage,
    validateGetMessages,
    validateMessageParams,
    validateEditMessage,
    validateMarkMessagesRead,
    handleValidationErrors, 
    validateGroupParams
} from '../middleware/validation.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected
router.use(protect);

router.post('/:groupId/send',
    validateSendMessage,
    handleValidationErrors,
    sendMessage
);

router.get('/:groupId/messages',
    validateGetMessages,
    handleValidationErrors,
    getGroupMessages
);

router.get('/:groupId/unread-count',
    validateGroupParams,
    handleValidationErrors,
    getUnreadMessageCount
);

router.post('/:groupId/mark-read',
    validateMarkMessagesRead,
    handleValidationErrors,
    markMessagesAsRead
);

router.put('/:messageId',
    validateEditMessage,
    handleValidationErrors,
    editMessage
);

router.delete('/:messageId',
    validateMessageParams,
    handleValidationErrors,
    deleteMessage
);

export default router;