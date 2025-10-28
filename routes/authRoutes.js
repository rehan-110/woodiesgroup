// routes/authRoutes.js
import express from 'express';
import { 
    signup, 
    login,
    getProfile,
    changePassword 
} from '../controllers/authController.js';
import { 
    validateSignup, 
    validateLogin,
    validateChangePassword,
    handleValidationErrors 
} from '../middleware/validation.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/signup', 
    validateSignup, 
    handleValidationErrors, 
    signup
);

router.post('/login', 
    validateLogin, 
    handleValidationErrors, 
    login
);

// Protected routes
router.get('/profile', protect, getProfile);

router.put('/change-password', 
    protect,
    validateChangePassword,
    handleValidationErrors, 
    changePassword
);

export default router;