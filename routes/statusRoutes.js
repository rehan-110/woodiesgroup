// routes/statusRoutes.js
import express from 'express';
import { 
    getStatus, 
    getDatabaseStatus,
    getAllStatusMessages 
} from '../controllers/statusController.js';

const router = express.Router();

router.get('/status', getStatus);
router.get('/db-status', getDatabaseStatus);
router.get('/messages', getAllStatusMessages);

export default router;  