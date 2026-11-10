import { PrismaClient, TransactionType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.category.upsert({
    where: { name_type: { name: "เงินเดือน", type: TransactionType.INCOME } },
    update: {},
    create: { name: "เงินเดือน", type: TransactionType.INCOME },
  });
  await prisma.category.upsert({
    where: { name_type: { name: "อาหาร", type: TransactionType.EXPENSE } },
    update: {},
    create: { name: "อาหาร", type: TransactionType.EXPENSE },
  });
  await prisma.category.upsert({
    where: { name_type: { name: "เดินทาง", type: TransactionType.EXPENSE } },
    update: {},
    create: { name: "เดินทาง", type: TransactionType.EXPENSE },
  });

}

main()
  .catch((error) => { console.error(error); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
