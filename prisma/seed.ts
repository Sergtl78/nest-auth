import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const alice = await prisma.user.upsert({
    where: { email: 'admin@admin.ru' },
    update: {},
    create: {
      email: 'admin@admin.ru',
      roles: ['USER', 'ADMIN'],
    },
  });
  const bob = await prisma.user.upsert({
    where: { email: 'bob@test.ru' },
    update: {},
    create: {
      email: 'bob@test.ru',
      roles: ['USER'],
    },
  });
  console.log({ alice, bob });
}
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
