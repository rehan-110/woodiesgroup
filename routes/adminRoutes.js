// routes/adminRoutes.js
import express from 'express';
import { 
    createUser, 
    getAllGroups,
    getAllUsers,
    updateUser,
    deleteUser,
    getUserById
} from '../controllers/adminController.js';
import { 
    validateCreateUser,
    validateUpdateUser,
    validateUserParams,
    handleValidationErrors 
} from '../middleware/validation.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All admin routes are protected
router.use(protect);

// User management routes
router.post('/users', 
    validateCreateUser,
    handleValidationErrors,
    createUser
);

router.get('/users', getAllUsers);

router.get('/users/:userId', 
    validateUserParams,
    handleValidationErrors,
    getUserById
);

router.put('/users/:userId',
    validateUpdateUser,
    handleValidationErrors,
    updateUser
);

router.delete('/users/:userId', 
    validateUserParams,
    handleValidationErrors,
    deleteUser
);

// Group management routes
router.get('/groups', getAllGroups);

export default router;