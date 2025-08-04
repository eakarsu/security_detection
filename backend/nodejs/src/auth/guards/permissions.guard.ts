import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Super admins have all permissions
    if (user.role === 'super_admin') {
      return true;
    }

    // Check required permissions
    const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler()) ||
                               this.reflector.get<string[]>('permissions', context.getClass());

    if (requiredPermissions) {
      const hasPermission = requiredPermissions.every(permission => {
        const [resource, action] = permission.split(':');
        return user.hasPermission(resource, action);
      });

      if (!hasPermission) {
        throw new ForbiddenException('Insufficient permissions');
      }
    }

    // Check required roles
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler()) ||
                         this.reflector.get<string[]>('roles', context.getClass());

    if (requiredRoles && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role level');
    }

    // Check required features
    const requiredFeatures = this.reflector.get<string[]>('features', context.getHandler()) ||
                            this.reflector.get<string[]>('features', context.getClass());

    if (requiredFeatures && request.tenant) {
      const hasFeatures = requiredFeatures.every(feature => 
        request.tenant.features[feature] === true
      );

      if (!hasFeatures) {
        throw new ForbiddenException('Required features not available in current plan');
      }
    }

    return true;
  }
}