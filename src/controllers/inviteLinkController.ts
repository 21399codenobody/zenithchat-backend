import type { Response } from "express";
import mongoose from "mongoose";
import InviteLink from "@/models/InviteLink.js";
import Group from "@/models/Group.js";
import Channel from "@/models/Channel.js";
import type { AuthenticatedRequest } from "@/middlewares/authMiddleware.js";
import { isEntityAdmin, generate10CharLinkCode, calculateLinkExpiry } from "@/utils/index.js";


export const createInviteLink = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { entityType, entityId, linkName, expireDuration, customExpiresAt, usageLimit, needApproval } = req.body || {};
        const currentUserId = req.user!._id;

        if (!['Group', 'Channel'].includes(entityType) || !entityId || typeof entityId !== 'string' || !mongoose.Types.ObjectId.isValid(entityId)) {
            res.status(400).json({ success: false, message: "Valid entityType ('Group' or 'Channel') and entityId required." });
            return;
        }


        const targetEntry = entityType === 'Group'
            ? await Group.findById(entityId)
            : await Channel.findById(entityId);

        if (!targetEntry) {
            res.status(404).json({ success: false, message: `${entityType} not found.` });
            return;
        }

        if (!isEntityAdmin(targetEntry, currentUserId)) {
            res.status(403).json({ success: false, message: "Forbidden! You lack permission to generate invite links." });
            return;
        }

        let linkCode = generate10CharLinkCode();
        while (await InviteLink.findOne({ linkCode })) {
            linkCode = generate10CharLinkCode();
        }

        const expiresAt = calculateLinkExpiry(expireDuration, customExpiresAt);

        const inviteLink = await InviteLink.create({
            linkCode,
            linkName: linkName && typeof linkName === 'string' ? linkName.trim() : "Custom Invite Link",
            entityType,
            entityId: new mongoose.Types.ObjectId(entityId),
            createdBy: currentUserId,
            isPrimary: false,
            isRevoked: false,
            expiresAt,
            usageLimit: typeof usageLimit === 'number' && usageLimit > 0 ? usageLimit : 0,
            usedCount: 0,
            joinedUsers: [],
            needApproval: Boolean(needApproval),
            pendingRequests: []
        });

        res.status(201).json({
            success: true,
            message: "10-character invite link created successfully!",
            inviteLink
        });
    } catch (error) {
        console.error("createInviteLink Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


export const consumeInviteLink = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { linkCode } = req.params;
        const currentUserId = req.user!._id;

        if (!linkCode || typeof linkCode !== 'string') {
            res.status(400).json({ success: false, message: "Invite link code is required." });
            return;
        }

        const link = await InviteLink.findOne({ linkCode });
        if (!link) {
            res.status(404).json({ success: false, message: "Invalid invite link." });
            return;
        }

        if (link.isRevoked) {
            res.status(410).json({ success: false, message: "This invite link has been revoked." });
            return;
        }

        if (link.expiresAt && link.expiresAt < new Date()) {
            res.status(410).json({ success: false, message: "This invite link has expired." });
            return;
        }

        if (link.usageLimit > 0 && link.usedCount >= link.usageLimit) {
            res.status(410).json({ success: false, message: "This invite link has reached its maximum limit." });
            return;
        }


        const targetEntity: any = link.entityType === 'Group'
            ? await Group.findById(link.entityId)
            : await Channel.findById(link.entityId);

        if (!targetEntity) {
            res.status(404).json({ success: false, message: `Associated ${link.entityType} not found.` });
            return;
        }

        if (link.entityType === 'Group' && targetEntity.bannedUsers?.some((id: any) => id.toString() === currentUserId.toString())) {
            res.status(403).json({ success: false, message: "You are banned from this group." });
            return;
        }

        const memberList = link.entityType === 'Group' ? targetEntity.members : targetEntity.subscribers;
        if (memberList.some((id: any) => id.toString() === currentUserId.toString())) {
            res.status(400).json({ success: false, message: `You are already a member/subscriber of this ${link.entityType}.` });
            return;
        }

        if (link.needApproval) {
            const alreadyPending = link.pendingRequests.some(r => r.user.toString() === currentUserId.toString());
            if (alreadyPending) {
                res.status(400).json({ success: false, message: "Your join request is already pending admin approval." });
                return;
            }

            link.pendingRequests.push({
                user: currentUserId,
                requestedAt: new Date()
            });
            await link.save();

            res.status(200).json({
                success: true,
                message: "Join request submitted successfully. Awaiting admin approval.",
                needApproval: true
            });
            return;
        }

        const updatedLink = await InviteLink.findOneAndUpdate(
            {
                _id: link._id,
                $or: [
                    { usageLimit: 0 },
                    { $expr: { $lt: ['$usedCount', '$usageLimit'] } }
                ]
            },
            {
                $inc: { usedCount: 1 },
                $addToSet: { joinedUsers: currentUserId }
            },
            { new: true }
        );

        if (!updatedLink) {
            res.status(410).json({ success: false, message: "This invite link has just reached its maximum capacity." });
            return;
        }

        if (link.entityType === 'Group') {
            await Group.findByIdAndUpdate(link.entityId, {
                $addToSet: { members: currentUserId }
            });
        } else {
            await Channel.findByIdAndUpdate(link.entityId, {
                $addToSet: { subscribers: currentUserId }
            });
        }

        res.status(200).json({
            success: true,
            message: `Successfully joined ${link.entityType}!`,
            needApproval: false,
            entityId: link.entityId
        });
    } catch (error) {
        console.error("consumeInviteLink Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


export const handleJoinRequest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { linkId } = req.params;
        const { targetUserId, action } = req.body || {};
        const currentUserId = req.user!._id;

        if (!linkId || typeof linkId !== 'string' || !mongoose.Types.ObjectId.isValid(linkId)) {
            res.status(400).json({ success: false, message: "Valid link ID is required." });
            return;
        }

        if (!['approve', 'reject'].includes(action) || !targetUserId || typeof targetUserId !== 'string' || !mongoose.Types.ObjectId.isValid(targetUserId)) {
            res.status(400).json({ success: false, message: "Valid action ('approve' or 'reject') and targetUserId required." });
            return;
        }

        const link = await InviteLink.findById(linkId);
        if (!link) {
            res.status(404).json({ success: false, message: "Invite link not found." });
            return;
        }


        const targetEntity = link.entityType === 'Group'
            ? await Group.findById(link.entityId)
            : await Channel.findById(link.entityId);

        if (!targetEntity || !isEntityAdmin(targetEntity, currentUserId)) {
            res.status(403).json({ success: false, message: "Forbidden! You lack permission to review join requests." });
            return;
        }

        link.pendingRequests = link.pendingRequests.filter(r => r.user.toString() !== targetUserId.toString());

        if (action === 'approve') {
            const targetObjectId = new mongoose.Types.ObjectId(targetUserId);

            if (link.entityType === 'Group') {
                await Group.findByIdAndUpdate(link.entityId, {
                    $addToSet: { members: targetObjectId }
                });
            } else {
                await Channel.findByIdAndUpdate(link.entityId, {
                    $addToSet: { subscribers: targetObjectId }
                });
            }
            link.usedCount += 1;

            link.joinedUsers.push(targetObjectId);
        }

        await link.save();

        res.status(200).json({
            success: true,
            message: `Request '${action}d' successfully.`
        });
    } catch (error) {
        console.error("handleJoinRequest Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};


export const revokeInviteLink = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { linkId } = req.params;
        const currentUserId = req.user!._id;

        if (!linkId || typeof linkId !== 'string' || !mongoose.Types.ObjectId.isValid(linkId)) {
            res.status(400).json({ success: false, message: "Valid link ID is required." });
            return;
        }

        const link = await InviteLink.findById(linkId);
        if (!link) {
            res.status(404).json({ success: false, message: "Invite link not found." });
            return;
        }


        const targetEntity = link.entityType === 'Group'
            ? await Group.findById(link.entityId)
            : await Channel.findById(link.entityId);

        if (!targetEntity || !isEntityAdmin(targetEntity, currentUserId)) {
            res.status(403).json({ success: false, message: "Forbidden! Only admins can revoke links." });
            return;
        }

        link.isRevoked = true;
        await link.save();

        res.status(200).json({
            success: true,
            message: "Invite link has been revoked."
        });
    } catch (error) {
        console.error("revokeInviteLink Error:", error);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};