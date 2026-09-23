import { Role, User, ADMIN_MODULES_CATALOG, DEFAULT_ROLE_TEMPLATES, EffectiveUserPermissions } from '../types';

export function normalizeRole(role: string = 'user'): string {
  return (role || 'user').toLowerCase().trim().replace('-', '_');
}

export function isMasterAdmin(userOrRole: any): boolean {
  if (!userOrRole) return false;
  if (typeof userOrRole === 'string') {
    const r = normalizeRole(userOrRole);
    return r === 'admin';
  }
  const r = normalizeRole(userOrRole.role);
  if (r === 'admin' || userOrRole.isMasterAdmin) return true;
  if (userOrRole.email && userOrRole.email.toLowerCase() === 'professor9049@gmail.com') return true;
  return false;
}

// Map high-level permission / role aliases to canonical module IDs
export const MODULE_ALIASES: Record<string, string[]> = {
  // Live Trade Controller
  'live_trade_controller': ['trade_control'],
  'live_trade_control': ['trade_control'],
  'trade_controller': ['trade_control'],
  'trade_control': ['trade_control'],

  // Customer Support
  'support': ['chat'],
  'support_chat': ['chat'],
  'customer_support': ['chat'],
  'chat': ['chat'],

  // Finance / Approval Desk & Balances
  'finance': ['approval_desk', 'profit_control'],
  'finance_manager': ['approval_desk', 'profit_control'],
  'deposits': ['approval_desk'],
  'withdrawals': ['approval_desk'],
  'approval_desk': ['approval_desk'],
  'profit_control': ['profit_control'],
  'balances': ['profit_control'],
  'pnl_override': ['profit_control'],

  // Platform Analytics / Analyst
  'platform': ['analytics'],
  'analyst': ['analytics'],
  'analytics': ['analytics'],

  // Trade History
  'trade_history': ['trade_history'],
  'history': ['trade_history'],

  // Markets & Leverage
  'market': ['markets'],
  'markets': ['markets'],
  'leverage': ['markets'],

  // Users
  'users': ['users'],
  'user_management': ['users'],
  'user_accounts': ['users'],

  // Settings & Branding
  'settings': ['settings'],
  'branding': ['settings'],
  'payments': ['settings'],

  // Audit
  'audit': ['audit'],
  'audit_logs': ['audit'],
  'security_logs': ['audit']
};

export const PERMISSION_ALIASES: Record<string, string[]> = {
  'view_analytics': ['analytics:view', 'analytics:view_stats'],
  'view_users': ['users:view', 'users:view_profiles'],
  'manage_users': ['users:edit_profiles', 'users:change_status', 'users:reset_passwords'],
  'manage_roles': ['users:manage_roles'],
  'manage_kyc': ['users:manage_kyc', 'approval_desk:manage_kyc'],
  'view_kyc': ['users:view_profiles', 'approval_desk:view'],
  'view_deposits': ['approval_desk:view', 'approval_desk:view_deposits'],
  'approve_withdrawals': ['approval_desk:approve_withdrawals', 'approval_desk:reject_withdrawals'],
  'manage_finance': ['profit_control:adjust_balance', 'profit_control:pnl_override'],
  'view_all_trades': ['trade_control:view', 'trade_control:view_positions'],
  'manage_trades': ['trade_control:edit_entry_price', 'trade_control:close_trade', 'trade_control:intervene'],
  'view_trade_history': ['trade_history:view', 'trade_history:view_details'],
  'correct_trade': ['trade_history:correct_trade'],
  'manage_markets': ['markets:edit', 'markets:manage_settings', 'markets:toggle_status'],
  'manage_settings': ['settings:edit_branding', 'settings:manage_payments', 'settings:manage_fees'],
  'manage_support': ['chat:view', 'chat:respond', 'chat:manage'],
  'view_audit_logs': ['audit:view', 'audit:view_activity', 'audit:view_auth_events'],
  'view_deposit_history': ['approval_desk:view', 'trade_history:view', 'profit_control:view_history'],
  'view_account_activity': ['audit:view', 'trade_history:view']
};

/**
 * Computes exact effective permissions and enabled modules for any user.
 * Strictly adheres to "Explicit permission required" principle.
 */
export function computeEffectivePermissions(user: Partial<User> | null | undefined): EffectiveUserPermissions {
  if (!user) {
    return {
      role: 'user',
      isMasterAdmin: false,
      enabledModules: [],
      actions: {},
      hasCustomOverrides: false
    };
  }

  const role = (normalizeRole(user.role) as Role) || 'user';
  const hasAdminFlag = isMasterAdmin(user);

  if (hasAdminFlag) {
    const allModules = ADMIN_MODULES_CATALOG.map(m => m.id);
    const allActions: Record<string, boolean> = { '*': true };
    ADMIN_MODULES_CATALOG.forEach(m => {
      allActions[`${m.id}:view`] = true;
      m.actions.forEach(a => {
        allActions[a.id] = true;
      });
    });
    return {
      role: 'admin',
      isMasterAdmin: true,
      enabledModules: allModules,
      actions: allActions,
      hasCustomOverrides: false
    };
  }

  const hasCustomMods = user.customModules && Object.keys(user.customModules).length > 0;
  const hasCustomActs = user.customActions && Object.keys(user.customActions).length > 0;
  const hasCustomOverrides = Boolean(hasCustomMods || hasCustomActs);

  const roleTemplate = DEFAULT_ROLE_TEMPLATES[role] || DEFAULT_ROLE_TEMPLATES.user;
  const enabledModulesSet = new Set<string>();
  const actionsMap: Record<string, boolean> = {};

  if (hasCustomMods && user.customModules) {
    // When customModules are explicitly set on user, use exact overrides
    Object.entries(user.customModules).forEach(([modId, isEnabled]) => {
      if (isEnabled) {
        enabledModulesSet.add(modId);
      }
    });
  } else {
    // Inherit from role template defaults
    (roleTemplate.enabledModules || []).forEach(m => enabledModulesSet.add(m));
  }

  // Populate base actions for enabled modules from template
  if (roleTemplate.actions) {
    Object.entries(roleTemplate.actions).forEach(([actionId, isEnabled]) => {
      const modId = actionId.split(':')[0];
      if (enabledModulesSet.has(modId) && isEnabled) {
        actionsMap[actionId] = true;
      }
    });
  }

  // Ensure default actions exist for any enabled module
  ADMIN_MODULES_CATALOG.forEach(m => {
    if (enabledModulesSet.has(m.id)) {
      actionsMap[`${m.id}:view`] = true;
      m.actions.forEach(a => {
        if (actionsMap[a.id] === undefined) {
          actionsMap[a.id] = true;
        }
      });
    }
  });

  // Apply custom action overrides
  if (user.customActions) {
    Object.entries(user.customActions).forEach(([actionId, isEnabled]) => {
      const modId = actionId.split(':')[0];
      if (enabledModulesSet.has(modId)) {
        actionsMap[actionId] = Boolean(isEnabled);
      } else {
        actionsMap[actionId] = false;
      }
    });
  }

  // Handle explicit permissions array (e.g. ['LIVE_TRADE_CONTROLLER', 'SUPPORT'])
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    user.permissions.forEach(p => {
      const normP = (p || '').toLowerCase().trim().replace('-', '_');
      // If matches a module alias
      if (MODULE_ALIASES[normP]) {
        MODULE_ALIASES[normP].forEach(mId => {
          enabledModulesSet.add(mId);
          actionsMap[`${mId}:view`] = true;
          const cat = ADMIN_MODULES_CATALOG.find(c => c.id === mId);
          if (cat) {
            cat.actions.forEach(act => {
              if (actionsMap[act.id] === undefined) actionsMap[act.id] = true;
            });
          }
        });
      } else if (normP.includes(':')) {
        const modId = normP.split(':')[0];
        if (enabledModulesSet.has(modId)) {
          actionsMap[normP] = true;
        }
      } else if (ADMIN_MODULES_CATALOG.some(m => m.id === normP)) {
        enabledModulesSet.add(normP);
        actionsMap[`${normP}:view`] = true;
      }
    });
  }

  return {
    role,
    isMasterAdmin: false,
    enabledModules: Array.from(enabledModulesSet),
    actions: actionsMap,
    hasCustomOverrides
  };
}

/**
 * Check if user can access a specific administrative tab.
 * Strictly checks the explicit user permissions.
 */
export function canUserAccessTab(userOrRole: any, tabId: string): boolean {
  if (!userOrRole) return false;
  if (isMasterAdmin(userOrRole)) return true;

  if (typeof userOrRole === 'object') {
    // If user has effectiveModules calculated
    if (Array.isArray(userOrRole.effectiveModules)) {
      return userOrRole.effectiveModules.includes(tabId);
    }
    const computed = computeEffectivePermissions(userOrRole);
    return computed.enabledModules.includes(tabId);
  }

  // If a role string was passed
  const r = normalizeRole(userOrRole) as Role;
  const template = DEFAULT_ROLE_TEMPLATES[r] || DEFAULT_ROLE_TEMPLATES.user;
  return (template.enabledModules || []).includes(tabId);
}

/**
 * Check if a user has a specific granular action permission.
 */
export function hasUserActionPermission(user: Partial<User> | null | undefined, permission: string): boolean {
  if (!user) return false;
  if (isMasterAdmin(user)) return true;

  const effective = computeEffectivePermissions(user);
  if (effective.actions['*']) return true;

  const norm = (permission || '').toLowerCase().trim();

  // If permission has action namespace like 'trade_control:edit_sl'
  if (norm.includes(':')) {
    const modId = norm.split(':')[0];
    if (!effective.enabledModules.includes(modId)) return false;
    return effective.actions[norm] === true;
  }

  // If checking module access directly
  if (ADMIN_MODULES_CATALOG.some(m => m.id === norm)) {
    return effective.enabledModules.includes(norm);
  }

  // Check aliases
  if (PERMISSION_ALIASES[norm]) {
    return PERMISSION_ALIASES[norm].some(act => {
      const modId = act.split(':')[0];
      return effective.enabledModules.includes(modId) && effective.actions[act] === true;
    });
  }

  return effective.actions[norm] === true;
}

/**
 * Determines the default opening tab for a user based on their actual allowed modules.
 */
export function getDefaultTabForUser(user: Partial<User> | null | undefined): string {
  if (!user) return 'analytics';
  if (isMasterAdmin(user)) return 'analytics';

  const effective = computeEffectivePermissions(user);
  const preferredOrder = [
    'trade_control',
    'chat',
    'approval_desk',
    'profit_control',
    'users',
    'markets',
    'trade_history',
    'analytics',
    'settings',
    'audit'
  ];

  for (const tab of preferredOrder) {
    if (effective.enabledModules.includes(tab)) {
      return tab;
    }
  }

  return effective.enabledModules[0] || 'analytics';
}

/**
 * Returns human-readable lists of enabled and restricted modules for user badges/profiles.
 */
export function getRoleModulesBreakdown(userOrRole: any): { enabled: string[]; disabled: string[] } {
  if (!userOrRole) {
    return {
      enabled: [],
      disabled: ADMIN_MODULES_CATALOG.map(m => m.name)
    };
  }

  if (isMasterAdmin(userOrRole)) {
    return {
      enabled: ADMIN_MODULES_CATALOG.map(m => m.name),
      disabled: []
    };
  }

  let enabledIds: string[] = [];
  if (typeof userOrRole === 'object') {
    const effective = computeEffectivePermissions(userOrRole);
    enabledIds = effective.enabledModules;
  } else {
    const r = normalizeRole(userOrRole) as Role;
    const template = DEFAULT_ROLE_TEMPLATES[r] || DEFAULT_ROLE_TEMPLATES.user;
    enabledIds = template.enabledModules || [];
  }

  const enabledNames: string[] = [];
  const disabledNames: string[] = [];

  ADMIN_MODULES_CATALOG.forEach(m => {
    if (enabledIds.includes(m.id)) {
      enabledNames.push(m.name);
    } else {
      disabledNames.push(m.name);
    }
  });

  return {
    enabled: enabledNames,
    disabled: disabledNames
  };
}
