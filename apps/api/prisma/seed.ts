import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.appConfig.createMany({
    data: [
      { key: 'llm_model', value: 'google/gemini-flash-1.5' },
      { key: 'embedding_model', value: 'openai/text-embedding-3-small' },
    ],
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
