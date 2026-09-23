export type SystemRole =
  | 'admin'
  | 'co_admin'
  | 'trade_controller'
  | 'finance_manager'
  | 'support'
  | 'manager'
  | 'moderator'
  | 'user';

export interface RoleDefinition {
  id: SystemRole;
  name: string;
  description: string;
  isSystem?: boolean;
  defaultPermissions: string[];
}

export interface PermissionModule {
  id: string;
  name: string;
  description: string;
  actions: {
    id: string;
    name: string;
    description: string;
  }[];
}
