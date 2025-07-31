const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Logs an admin action to the auditlog table.
 * 
 * @param {number} actorID - ID of the admin or actor performing the action
 * @param {string} actorRole - Role of the actor (e.g., 'Admin', 'SuperAdmin')
 * @param {string} action - Short description of the action (e.g., 'Uploaded Application Template')
 * @param {string} details - Detailed information about the action
 */
const logAdminAction = async (actorID, actorRole, action, details) => {
    try {
        await prisma.auditlog.create({
            data: {
                ActorID: actorID,
                ActorRole: actorRole,
                Action: action,
                Details: details
            }
        });
        console.log(`Audit log created for ${actorRole} ID ${actorID}: ${action}`);
    } catch (error) {
        console.error('Error logging admin action:', error.message);
    }
};

module.exports = {
    logAdminAction,
};
