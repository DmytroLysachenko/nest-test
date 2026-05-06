import { Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { companiesTable, jobOffersTable } from '@repo/db';

import { Drizzle } from '@/common/decorators';
import { reconcileExpiredJobOffers } from '@/features/job-offers/job-offers-expiry';

import type { ListCompaniesQuery } from './dto/list-companies.query';
import type { SQL } from 'drizzle-orm';

@Injectable()
export class CompaniesService {
  constructor(@Drizzle() private readonly db: NodePgDatabase) {}

  async list(query: ListCompaniesQuery) {
    await reconcileExpiredJobOffers(this.db);

    const limit = query.limit ? Number(query.limit) : 20;
    const offset = query.offset ? Number(query.offset) : 0;
    const conditions: SQL[] = [];

    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(
          ilike(companiesTable.canonicalName, term),
          ilike(companiesTable.description, term),
          ilike(companiesTable.hqLocation, term),
        ),
      );
    }

    if (query.location) {
      const term = `%${query.location}%`;
      conditions.push(
        or(
          ilike(companiesTable.hqLocation, term),
          sql<boolean>`exists (
            select 1
            from ${jobOffersTable}
            where ${jobOffersTable.companyId} = ${companiesTable.id}
              and ${jobOffersTable.location} ilike ${term}
          )`,
        ),
      );
    }

    const rows = await this.db
      .select({
        id: companiesTable.id,
        canonicalName: companiesTable.canonicalName,
        websiteUrl: companiesTable.websiteUrl,
        sourceProfileUrl: companiesTable.sourceProfileUrl,
        logoUrl: companiesTable.logoUrl,
        description: companiesTable.description,
        hqLocation: companiesTable.hqLocation,
        lastSeenAt: companiesTable.lastSeenAt,
        activeOfferCount: sql<number>`count(*) filter (where ${jobOffersTable.id} is not null and ${jobOffersTable.isExpired} = false)`,
        totalOfferCount: sql<number>`count(${jobOffersTable.id})`,
      })
      .from(companiesTable)
      .leftJoin(jobOffersTable, eq(jobOffersTable.companyId, companiesTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(companiesTable.id)
      .orderBy(desc(companiesTable.lastSeenAt), companiesTable.canonicalName)
      .limit(limit)
      .offset(offset);

    const [{ value }] = await this.db
      .select({ value: count() })
      .from(companiesTable)
      .where(conditions.length ? and(...conditions) : undefined);

    return {
      items: rows.map((row) => ({
        ...row,
        activeOfferCount: Number(row.activeOfferCount ?? 0),
        totalOfferCount: Number(row.totalOfferCount ?? 0),
        lastSeenAt: row.lastSeenAt.toISOString(),
      })),
      total: Number(value ?? 0),
    };
  }

  async getById(id: string) {
    await reconcileExpiredJobOffers(this.db);

    const company = await this.db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.id, id))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    const [counts, recentOffers] = await Promise.all([
      this.db
        .select({
          activeOfferCount: sql<number>`count(*) filter (where ${jobOffersTable.isExpired} = false and ${jobOffersTable.companyId} = ${id})`,
          totalOfferCount: sql<number>`count(*) filter (where ${jobOffersTable.companyId} = ${id})`,
        })
        .from(jobOffersTable)
        .where(eq(jobOffersTable.companyId, id))
        .then((rows) => rows[0] ?? { activeOfferCount: 0, totalOfferCount: 0 }),
      this.db
        .select({
          id: jobOffersTable.id,
          title: jobOffersTable.title,
          location: jobOffersTable.location,
          salary: jobOffersTable.salary,
          url: jobOffersTable.url,
          isExpired: jobOffersTable.isExpired,
          expiresAt: jobOffersTable.expiresAt,
          lastSeenAt: jobOffersTable.lastSeenAt,
        })
        .from(jobOffersTable)
        .where(eq(jobOffersTable.companyId, id))
        .orderBy(jobOffersTable.isExpired, desc(jobOffersTable.lastSeenAt))
        .limit(12),
    ]);

    return {
      id: company.id,
      canonicalName: company.canonicalName,
      websiteUrl: company.websiteUrl,
      sourceProfileUrl: company.sourceProfileUrl,
      logoUrl: company.logoUrl,
      description: company.description,
      hqLocation: company.hqLocation,
      totalOfferCount: Number(counts.totalOfferCount ?? 0),
      activeOfferCount: Number(counts.activeOfferCount ?? 0),
      lastSeenAt: company.lastSeenAt.toISOString(),
      recentOffers: recentOffers.map((offer) => ({
        ...offer,
        expiresAt: offer.expiresAt?.toISOString() ?? null,
        lastSeenAt: offer.lastSeenAt.toISOString(),
      })),
    };
  }
}
