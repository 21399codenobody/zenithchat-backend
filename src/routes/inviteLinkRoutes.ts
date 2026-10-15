import { Router } from 'express';
import { protect, requireCompleteProfile } from '@/middlewares/authMiddleware.js';
import {
    createInviteLink,
    consumeInviteLink,
    handleJoinRequest,
    revokeInviteLink
} from '@/controllers/inviteLinkController.js';

const inviteLinkRouter = Router();

inviteLinkRouter.use(protect, requireCompleteProfile);

inviteLinkRouter.post('/', createInviteLink);
inviteLinkRouter.post('/consume/:linkCode', consumeInviteLink);
inviteLinkRouter.post('/:linkId/requests', handleJoinRequest);
inviteLinkRouter.patch('/:linkId/revoke', revokeInviteLink);

export default inviteLinkRouter;