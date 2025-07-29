const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllJobs = async () => {
    const jobs = await prisma.jobvacancy.findMany({
        where: {
            Status: 'Open',
        },
        select: {
            JobID: true,
            Title: true,
            Description: true,
            Type: true,
            Department: true,
            Level: true,
            PostedDate: true,
            ExpiryDate: true,
        },
        orderBy: {
            PostedDate: 'desc',
        },
    });

    return jobs;
};
