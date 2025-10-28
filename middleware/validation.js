// middleware/validation.js
import { body, param, query, validationResult } from 'express-validator';

/**
 * Common validation rules
 */
const commonRules = {
    name: body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Name can only contain letters and spaces'),

    email: body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('Email cannot exceed 100 characters'),

    password: body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
        .isLength({ max: 128 })
        .withMessage('Password cannot exceed 128 characters'),

    objectId: param('id')
        .isMongoId()
        .withMessage('Invalid ID format'),

    page: query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),

    limit: query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
};

/**
 * Validation rules for user authentication
 */
export const validateSignup = [
    commonRules.name,
    commonRules.email,
    commonRules.password,
    
    body('role')
        .optional()
        .isIn(['super_admin', 'admin', 'user'])
        .withMessage('Role must be super_admin, admin, or user'),
        
    body('assignedGroup')
        .optional()
        .isMongoId()
        .withMessage('Invalid group ID format')
];

export const validateLogin = [
    commonRules.email,
    
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ max: 128 })
        .withMessage('Password cannot exceed 128 characters')
];

export const validateChangePassword = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required')
        .isLength({ max: 128 })
        .withMessage('Current password cannot exceed 128 characters'),
    
    commonRules.password.custom((value, { req }) => {
        if (value === req.body.currentPassword) {
            throw new Error('New password cannot be the same as current password');
        }
        return true;
    })
];

/**
 * Validation rules for admin operations
 */
export const validateCreateUser = [
    commonRules.name,
    commonRules.email,
    commonRules.password,
    
    body('role')
        .isIn(['super_admin', 'admin', 'user'])
        .withMessage('Role must be super_admin, admin, or user'),
        
    body('assignedGroup')
        .optional()
        .isMongoId()
        .withMessage('Invalid group ID format')
];

export const validateUpdateUser = [
    param('userId')
        .isMongoId()
        .withMessage('Invalid user ID format'),
        
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Name can only contain letters and spaces'),
    
    body('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
        .isLength({ max: 100 })
        .withMessage('Email cannot exceed 100 characters'),
    
    body('password')
        .optional()
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    
    body('role')
        .optional()
        .isIn(['super_admin', 'admin', 'user'])
        .withMessage('Role must be super_admin, admin, or user'),
        
    body('assignedGroup')
        .optional()
        .isMongoId()
        .withMessage('Invalid group ID format')
];

export const validateUserParams = [
    param('userId')
        .isMongoId()
        .withMessage('Invalid user ID format')
];

/**
 * Validation rules for group operations
 */
export const validateCreateGroup = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Group name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Group name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z0-9\s\-_]+$/)
        .withMessage('Group name can only contain letters, numbers, spaces, hyphens, and underscores'),
    
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    
    body('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic must be a boolean value'),
    
    body('maxMembers')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Max members must be between 1 and 1000')
];

export const validateUpdateGroup = [
    param('groupId')
        .isMongoId()
        .withMessage('Invalid group ID format'),
        
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Group name must be between 2 and 100 characters')
        .matches(/^[a-zA-Z0-9\s\-_]+$/)
        .withMessage('Group name can only contain letters, numbers, spaces, hyphens, and underscores'),
    
    body('description')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    
    body('isPublic')
        .optional()
        .isBoolean()
        .withMessage('isPublic must be a boolean value'),
    
    body('maxMembers')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Max members must be between 1 and 1000')
];

export const validateGroupParams = [
    param('groupId')
        .isMongoId()
        .withMessage('Invalid group ID format')
];

/**
 * Validation rules for message operations
 */
export const validateSendMessage = [
    param('groupId')
        .isMongoId()
        .withMessage('Invalid group ID format'),
    
    body('content')
        .trim()
        .notEmpty()
        .withMessage('Message content is required')
        .isLength({ min: 1, max: 1000 })
        .withMessage('Message must be between 1 and 1000 characters'),
    
    body('messageType')
        .optional()
        .isIn(['text', 'image', 'file', 'system'])
        .withMessage('Message type must be text, image, file, or system')
];

export const validateGetMessages = [
    param('groupId')
        .isMongoId()
        .withMessage('Invalid group ID format'),
    
    commonRules.page,
    commonRules.limit
];

export const validateMessageParams = [
    param('messageId')
        .isMongoId()
        .withMessage('Invalid message ID format')
];

export const validateEditMessage = [
    param('messageId')
        .isMongoId()
        .withMessage('Invalid message ID format'),
    
    body('content')
        .trim()
        .notEmpty()
        .withMessage('Message content is required')
        .isLength({ min: 1, max: 1000 })
        .withMessage('Message must be between 1 and 1000 characters')
];

export const validateMarkMessagesRead = [
    param('groupId')
        .isMongoId()
        .withMessage('Invalid group ID format'),
    
    body('messageIds')
        .isArray({ min: 1 })
        .withMessage('Message IDs must be a non-empty array')
        .custom((value) => {
            if (!value.every(id => typeof id === 'string' && id.length === 24)) {
                throw new Error('All message IDs must be valid MongoDB ObjectIds');
            }
            return true;
        })
];

/**
 * Validation rules for group member operations
 */
export const validateInviteToGroup = [
    param('groupId')
        .isMongoId()
        .withMessage('Invalid group ID format'),
    
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail()
];

export const validateGroupMemberParams = [
    param('groupId')
        .isMongoId()
        .withMessage('Invalid group ID format'),
    
    param('userId')
        .isMongoId()
        .withMessage('Invalid user ID format')
];

/**
 * Validation rules for activity tracking
 */
export const validateActivityParams = [
    param('userId')
        .isMongoId()
        .withMessage('Invalid user ID format')
];

/**
 * Custom validation for query parameters
 */
export const validateQueryParams = [
    query('sort')
        .optional()
        .isIn(['name', 'createdAt', 'updatedAt', 'lastActive'])
        .withMessage('Sort must be one of: name, createdAt, updatedAt, lastActive'),
    
    query('order')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Order must be asc or desc'),
    
    query('search')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Search query cannot exceed 100 characters')
];

/**
 * Sanitization middleware for all requests
 */
export const sanitizeInput = [
    // Sanitize all string fields to prevent XSS
    body('*').trim().escape().optional(),
    query('*').trim().escape().optional(),
    
    // Specific sanitization for different fields
    body('name').blacklist('<>').optional(),
    body('email').normalizeEmail().optional(),
    body('content').blacklist('<>').optional(),
    body('description').blacklist('<>').optional()
];

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value,
            location: error.location
        }));

        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errorCount: errors.array().length,
            errors: formattedErrors
        });
    }
    
    next();
};

/**
 * Optional validation - doesn't fail if fields are missing
 */
export const validateOptional = {
    email: body('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),

    name: body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),

    password: body('password')
        .optional()
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
};

/**
 * Export common rules for reuse in other files
 */
export { commonRules };