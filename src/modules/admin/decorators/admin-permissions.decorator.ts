import { SetMetadata } from '@nestjs/common';
import { AdminPermission } from '../guards/admin-permission.guard';
import { ADMIN_PERMISSIONS_KEY } from '../guards/admin-permission.guard';

export const AdminPermissions = (...permissions: AdminPermission[]) =>
  SetMetadata(ADMIN_PERMISSIONS_KEY, permissions);
