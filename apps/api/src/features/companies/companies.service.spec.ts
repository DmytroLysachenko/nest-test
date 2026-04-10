import { PgDialect } from 'drizzle-orm/pg-core';

import { CompaniesService } from './companies.service';

describe('CompaniesService', () => {
  it('filters the list by search and location and returns normalized counters', async () => {
    let listWhere: unknown;
    let countWhere: unknown;

    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            leftJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockImplementation((whereClause: unknown) => {
                listWhere = whereClause;
                return {
                  groupBy: jest.fn().mockReturnValue({
                    orderBy: jest.fn().mockReturnValue({
                      limit: jest.fn().mockReturnValue({
                        offset: jest.fn().mockResolvedValue([
                          {
                            id: 'company-1',
                            canonicalName: 'Acme',
                            websiteUrl: 'https://acme.example',
                            sourceProfileUrl: 'https://pracuj.pl/acme',
                            logoUrl: null,
                            description: 'Product company',
                            hqLocation: 'Warsaw',
                            lastSeenAt: new Date('2026-04-10T10:00:00.000Z'),
                            activeOfferCount: '2',
                            totalOfferCount: '5',
                          },
                        ]),
                      }),
                    }),
                  }),
                };
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockImplementation((whereClause: unknown) => {
              countWhere = whereClause;
              return Promise.resolve([{ value: 1 }]);
            }),
          }),
        }),
    } as any;

    const service = new CompaniesService(db);
    const result = await service.list({
      search: 'Acme',
      location: 'Warsaw',
      limit: 10,
      offset: 0,
    });

    expect(result).toEqual({
      items: [
        {
          id: 'company-1',
          canonicalName: 'Acme',
          websiteUrl: 'https://acme.example',
          sourceProfileUrl: 'https://pracuj.pl/acme',
          logoUrl: null,
          description: 'Product company',
          hqLocation: 'Warsaw',
          lastSeenAt: '2026-04-10T10:00:00.000Z',
          activeOfferCount: 2,
          totalOfferCount: 5,
        },
      ],
      total: 1,
    });

    const dialect = new PgDialect();
    const listWhereQuery = dialect.sqlToQuery(listWhere as any);
    const countWhereQuery = dialect.sqlToQuery(countWhere as any);
    expect(listWhereQuery.sql).toContain('"companies"."canonical_name" ilike');
    expect(listWhereQuery.sql).toContain('"companies"."hq_location" ilike');
    expect(listWhereQuery.sql).toContain('exists (');
    expect(countWhereQuery.sql).toContain('"companies"."canonical_name" ilike');
  });

  it('returns company detail with linked offers ordered by freshness and mapped expiry fields', async () => {
    const db = {
      select: jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                then: (callback: (rows: unknown[]) => unknown) =>
                  Promise.resolve(
                    callback([
                      {
                        id: 'company-1',
                        canonicalName: 'Acme',
                        websiteUrl: 'https://acme.example',
                        sourceProfileUrl: 'https://pracuj.pl/acme',
                        logoUrl: null,
                        description: 'Product company',
                        hqLocation: 'Warsaw',
                        lastSeenAt: new Date('2026-04-10T12:00:00.000Z'),
                      },
                    ]),
                  ),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              then: (callback: (rows: unknown[]) => unknown) =>
                Promise.resolve(
                  callback([
                    {
                      activeOfferCount: '1',
                      totalOfferCount: '2',
                    },
                  ]),
                ),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  {
                    id: 'offer-active',
                    title: 'Frontend Engineer',
                    location: 'Remote',
                    salary: '20 000 PLN',
                    url: 'https://pracuj.pl/oferta/1',
                    isExpired: false,
                    expiresAt: new Date('2026-05-01T00:00:00.000Z'),
                    lastSeenAt: new Date('2026-04-10T11:00:00.000Z'),
                  },
                  {
                    id: 'offer-expired',
                    title: 'Backend Engineer',
                    location: 'Warsaw',
                    salary: null,
                    url: 'https://pracuj.pl/oferta/2',
                    isExpired: true,
                    expiresAt: null,
                    lastSeenAt: new Date('2026-04-08T11:00:00.000Z'),
                  },
                ]),
              }),
            }),
          }),
        }),
    } as any;

    const service = new CompaniesService(db);
    const result = await service.getById('company-1');

    expect(result).toEqual({
      id: 'company-1',
      canonicalName: 'Acme',
      websiteUrl: 'https://acme.example',
      sourceProfileUrl: 'https://pracuj.pl/acme',
      logoUrl: null,
      description: 'Product company',
      hqLocation: 'Warsaw',
      totalOfferCount: 2,
      activeOfferCount: 1,
      lastSeenAt: '2026-04-10T12:00:00.000Z',
      recentOffers: [
        {
          id: 'offer-active',
          title: 'Frontend Engineer',
          location: 'Remote',
          salary: '20 000 PLN',
          url: 'https://pracuj.pl/oferta/1',
          isExpired: false,
          expiresAt: '2026-05-01T00:00:00.000Z',
          lastSeenAt: '2026-04-10T11:00:00.000Z',
        },
        {
          id: 'offer-expired',
          title: 'Backend Engineer',
          location: 'Warsaw',
          salary: null,
          url: 'https://pracuj.pl/oferta/2',
          isExpired: true,
          expiresAt: null,
          lastSeenAt: '2026-04-08T11:00:00.000Z',
        },
      ],
    });
  });
});
