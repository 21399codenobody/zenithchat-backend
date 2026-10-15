import { Router } from "express";
import { protect, requireCompleteProfile } from "@/middlewares/authMiddleware.js";
import {
    createGroup,
    getGroupDetails,
    updateGroupSettings,
    manageMembers,
    leaveGroup,
    deleteGroup,
    manageAdmins
} from "@/controllers/groupController.js";

const groupRouter = Router();

groupRouter.use(protect, requireCompleteProfile);

groupRouter.post('/', createGroup);
groupRouter.get('/:groupId', getGroupDetails);
groupRouter.patch('/:groupId/settings', updateGroupSettings);
groupRouter.post('/:groupId/members', manageMembers);
groupRouter.post('/:groupId/admins', manageAdmins);
groupRouter.post('/:groupId/leave', leaveGroup);
groupRouter.delete('/:groupId', deleteGroup);

export default groupRouter;