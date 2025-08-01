const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

cron.schedule('0 0 * * *', async () => {
    console.log('⏰ Running job to close expired vacancies...');

    const now = new Date();

    try {
        const result = await prisma.jobvacancy.updateMany({
            where: {
                ExpiryDate: {
                    lt: now,
                },
                Status: 'Open',
            },
            data: {
                Status: 'Closed',
            },
        });

        console.log(`✅ ${result.count} job vacancies marked as Closed.`);
    } catch (err) {
        console.error('❌ Error updating job statuses:', err.message);
    }
});
