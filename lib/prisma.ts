import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client') as {
  PrismaClient: new (args?: { adapter?: unknown }) => {
    note: {
      findMany: (args?: unknown) => Promise<Array<{ id: number; title: string; content: string; createdAt: Date }>>;
      create: (args: unknown) => Promise<{ id: number; title: string; content: string; createdAt: Date }>;
      update: (args: unknown) => Promise<{ id: number; title: string; content: string; createdAt: Date }>;
      delete: (args: unknown) => Promise<unknown>;
    };
  };
};

const globalForPrisma = globalThis as unknown as {
  prisma?: InstanceType<typeof PrismaClient>;
};

function createPrismaClient() {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db';
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}