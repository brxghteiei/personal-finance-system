import { PrismaClient, TransactionType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const defaults = [
    { name: "เงินเดือน", type: TransactionType.INCOME },
    { name: "อาหาร", type: TransactionType.EXPENSE },
    { name: "เดินทาง", type: TransactionType.EXPENSE },
  ];
  for (const category of defaults) {
    const existing = await prisma.category.findFirst({
      where: { ownerId: null, ...category },
      select: { id: true },
    });
    if (!existing) await prisma.category.create({ data: category });
  }

}

main()
  .catch((error) => { console.error(error); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
