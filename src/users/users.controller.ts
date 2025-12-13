import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/role.enum';
import { SafeUser, UsagePolicy } from './user.entity';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@CurrentUser() user: SafeUser) {
    return { user };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Guest, Role.User, Role.UserPremium, Role.Admin)
  @Get('me/policy')
  getUsagePolicy(@CurrentUser() user: SafeUser): UsagePolicy {
    return this.usersService.getUsagePolicyForRole(user.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.UserPremium, Role.Admin)
  @Get('premium/insights')
  getPremiumInsights(@CurrentUser() user: SafeUser) {
    return {
      message: `Premium insights unlocked for ${user.displayName}`,
      features: ['market-trends', 'salary-benchmarks', 'saved-search-automation'],
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get('admin/audit')
  getAdminAuditDashboard(@CurrentUser() user: SafeUser) {
    return {
      message: `Administrative access granted for ${user.displayName}`,
      managedRoles: [Role.Guest, Role.User, Role.UserPremium, Role.Admin],
      notes:
        'Use this endpoint as a placeholder for admin dashboards, user management, and policy adjustments.',
    };
  }
}
