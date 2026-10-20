import { getDatabaseClient } from '../../libs/prisma.js';
import type { SessionRecord } from '../../domain/types/auth.js';
import type { SessionsRepository } from '../sessions-repository.js';
export class PrismaSessionsRepository implements SessionsRepository {
  constructor(private prisma = getDatabaseClient()) {}
  async create(data: SessionRecord) {
    await this.prisma.session.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    await this.prisma.session.create({ data });
  }
  async find(tokenHash: string) {
    return this.prisma.session.findUnique({ where: { tokenHash } });
  }
  async delete(tokenHash: string) {
    await this.prisma.session.deleteMany({ where: { tokenHash } });
  }
}
