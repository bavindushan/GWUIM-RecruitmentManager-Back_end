const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { logAdminAction } = require('./LogMionitoringService.service');

exports.uploadApplicationTemplate = async (templateData, adminID) => {
    const { Type, FilePath } = templateData;

    // Save to DB
    const newTemplate = await prisma.applicationtemplate.create({
        data: {
            Type,
            FilePath,
            UploadedBy: adminID
        }
    });

    // Log the upload action
    await logAdminAction(
        adminID,
        'Admin',
        'Uploaded Application Template',
        `Template type: ${Type}, file path: ${FilePath}`
    );

    return newTemplate;
};