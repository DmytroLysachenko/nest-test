import { HealthService } from './health.service';

describe('HealthService', () => {
  it('includes required table readiness in health checks', async () => {
    const healthCheckService = {
      check: jest.fn(async (checks: Array<() => Promise<unknown>>) => Promise.all(checks.map((check) => check()))),
    };
    const service = new HealthService(
      healthCheckService as any,
      { checkStorage: jest.fn().mockResolvedValue({ disk: { status: 'up' } }) } as any,
      { checkRSS: jest.fn().mockResolvedValue({ memory_rss: { status: 'up' } }) } as any,
      { get: jest.fn().mockReturnValue(0.98) } as any,
      { isHealthy: jest.fn().mockResolvedValue({ drizzle: { status: 'up' } }) } as any,
      {
        isHealthy: jest.fn().mockResolvedValue({
          required_tables: { status: 'up', requiredTables: ['api_request_events', 'scrape_schedule_events'] },
        }),
      } as any,
    );

    await service.check();

    expect(healthCheckService.check).toHaveBeenCalledTimes(1);
    expect((service as any).requiredTablesHealth.isHealthy).toHaveBeenCalledWith('required_tables');
  });
});
