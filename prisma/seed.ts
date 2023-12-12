import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  function hashPassword(password: string) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(10));
  }
  const passwordAdmin = hashPassword('qwerty');
  const passwordBob = hashPassword('qwerty');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@admin.ru' },
    update: {
      email: 'admin@admin.ru',
      password: passwordAdmin,
      roles: ['USER', 'ADMIN'],
    },
    create: {
      email: 'admin@admin.ru',
      password: passwordAdmin,
      roles: ['USER', 'ADMIN'],
    },
  });
  const bob = await prisma.user.upsert({
    where: { email: 'bob@test.ru' },
    update: {
      email: 'bob@test.ru',
      password: passwordBob,
      roles: ['USER'],
    },
    create: {
      email: 'bob@test.ru',
      password: passwordBob,
      roles: ['USER'],
    },
  });
  console.log({ admin, bob });
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
