import { Router } from 'express';
import { accessOrCreateChat, getUserChats, updateChatSettings, getOrCreateSavedMessages } from '@/controllers/chatController.js';
import { protect, requireCompleteProfile } from '@/middlewares/authMiddleware.js';

const chatRouter = Router();
chatRouter.use(protect, requireCompleteProfile);
chatRouter.post('/', accessOrCreateChat);
chatRouter.get('/', getUserChats);
chatRouter.get('/saved/me', getOrCreateSavedMessages);
chatRouter.patch('/:chatId/settings', updateChatSettings);
export default chatRouter;