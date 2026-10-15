import { Router } from 'express';
import {
    syncContacts,
    getMyContacts,
    searchUsers,
    getUserProfile,
    updatePrivacySettings,
    blockUnblockUser
} from '@/controllers/userController.js';
import { protect, requireCompleteProfile } from '@/middlewares/authMiddleware.js';

const userRouter = Router();

userRouter.use(protect, requireCompleteProfile);

userRouter.post('/sync-contacts', syncContacts);
userRouter.get('/contacts', getMyContacts);
userRouter.get('/search', searchUsers);
userRouter.get('/profile/:userId', getUserProfile);
userRouter.patch('/privacy', updatePrivacySettings);
userRouter.post('/block', blockUnblockUser);

export default userRouter;