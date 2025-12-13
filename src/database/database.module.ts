import { Module } from '@nestjs/common';
import { DatabaseService, DRIZZLE_DB } from './database.service';

@Module({
  providers: [
    DatabaseService,
    {
      provide: DRIZZLE_DB,
      useFactory: (databaseService: DatabaseService) => databaseService.db,
      inject: [DatabaseService],
    },
  ],
  exports: [DatabaseService, DRIZZLE_DB],
})
export class DatabaseModule {}
