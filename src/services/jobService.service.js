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

exports.getFilteredJobs = async (filters) => {
    const { department, type, level, closingDate } = filters;

    const where = {};

    if (department) where.Department = department;
    if (type) where.Type = type;
    if (level) where.Level = level;
    if (closingDate) {
        const date = new Date(closingDate);
        if (!isNaN(date)) {
            where.ExpiryDate = { lte: date };
        }
    }

    const jobs = await prisma.jobvacancy.findMany({
        where,
        orderBy: { PostedDate: 'desc' },
    });

    return jobs;
};

exports.getJobById = async (jobId) => {
    const job = await prisma.jobvacancy.findUnique({
        where: { JobID: parseInt(jobId) },
    });

    return job;
};
