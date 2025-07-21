const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getAllUsers = async () => {
  return await prisma.user.findMany();
};

exports.createUser = async (data) => {
  return await prisma.user.create({ data });
};