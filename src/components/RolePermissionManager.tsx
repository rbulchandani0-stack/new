import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Check, 
  X, 
  RotateCcw, 
  Save, 
  Search, 
  Sliders, 
  ChevronDown, 
  ChevronUp, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Lock,
  Unlock,
  Layers,
  Sparkles,
  Info,
  User as UserIcon,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  History,
  Eye,
  Edit3,
  FileText,
  HelpCircle,
  ArrowRight
} from 'lucide-react';
import { 
  Role, 
  ADMIN_MODULES_CATALOG, 
  DEFAULT_ROLE_TEMPLATES, 
  RolePermissionTemplate, 
  AdminModuleDef,
  User 
} from '../types';
import { api, apiService } from '../services/api';

interface RolePermissionManagerProps {
  // Target user if editing a specific user's permissions
  targetUser?: User | null;
  // If editing global template without a specific user
  initialRole?: Role;
  isOpen?: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onPermissionsUpdated?: () => void;
}

// Human-friendly role metadata
interface RoleInfo {
  id: Role;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  allowedSummary: string[];
  restrictedSummary: string[];
}

const ROLES_INFO: RoleInfo[] = [
  {
    id: 'admin',
    name: 'Master Admin',
    shortName: 'Admin',
    tagline: 'Full Root Authority',
    description: 'Permanent unrestricted access across all platform modules, trade controls, financial ledgers, and system settings.',
    icon: Sparkles,
    accentColor: '#EAB308',
    allowedSummary: [
      'Full Master Platform Access',
      'User Accounts, Roles & Security',
      'Deposit & Withdrawal Authorizations',
      'Live Trade Controller & Interventions',
      'Financial Ledger & Balance Overrides',
      'Branding, Gateway & System Settings',
      'Security Audit Logs & Activity Trails'
    ],
    restrictedSummary: []
  },
  {
    id: 'co_admin',
    name: 'Co-Admin',
    shortName: 'Co-Admin',
    tagline: 'Operations & User Desk',
    description: 'Operational administration managing user profiles, account verification, password resets, and platform analytics.',
    icon: ShieldCheck,
    accentColor: '#3B82F6',
    allowedSummary: [
      'User Accounts Management',
      'Profile Verification & KYC Approvals',
      'Password Resets & Security Toggles',
      'Platform Analytics & Metrics Charts',
      'Account Status Controls (Activate / Suspend)'
    ],
    restrictedSummary: [
      'Live Trade Intervention & Price Overrides',
      'Financial Approvals & Deposit/Withdrawal Desk',
      'Wallet Ledger Adjustments & PnL Target Overrides',
      'Platform Branding & Payment Gateways',
      'Security Audit Logs'
    ]
  },
  {
    id: 'trade_controller',
    name: 'Trade Controller',
    shortName: 'Trade Controller',
    tagline: 'Trading Desk & Active Controls',
    description: 'Active market operations, live position monitoring, entry price adjustments, leverage modifications, and trade history.',
    icon: TrendingUp,
    accentColor: '#00C853',
    allowedSummary: [
      'Live Trade Controller Desk',
      'View All Live Active Positions',
      'Edit Entry Price, Stop-Loss & Take-Profit',
      'Modify Position Leverage Multipliers',
      'Force-Close Active Trading Positions',
      'Emergency Trade Intervention Overrides'
    ],
    restrictedSummary: [
      'User Accounts & Profile Management',
      'Deposit & Withdrawal Approval Desk',
      'Direct Wallet Balance Credits / Debits',
      'Platform Branding & System Settings',
      'Customer Support Chat Desk'
    ]
  },
  {
    id: 'finance_manager',
    name: 'Finance Manager',
    shortName: 'Finance Manager',
    tagline: 'Ledgers & Financial Desk',
    description: 'Financial operations supervisor managing deposit approvals, withdrawal authorizations, wallet balance credits, and PnL overrides.',
    icon: DollarSign,
    accentColor: '#10B981',
    allowedSummary: [
      'Approval Desk (Deposits & Withdrawals)',
      'Authorize & Credit User Deposits',
      'Authorize & Settle User Withdrawals',
      'Direct Wallet Balance Adjustments (Credit / Debit)',
      'PnL Target Overrides & Mark Price Controls',
      'Financial Ledger History'
    ],
    restrictedSummary: [
      'Live Trade Controller & Active Positions',
      'Market Instrument Catalog Configuration',
      'Customer Support Live Chat',
      'Platform Branding Settings',
      'Role & Permissions Configuration'
    ]
  },
  {
    id: 'support',
    name: 'Customer Support',
    shortName: 'Support',
    tagline: 'Customer Care & Live Chat',
    description: 'Customer assistance agent managing live chat conversations, support inquiries, and customer communication.',
    icon: MessageSquare,
    accentColor: '#8B5CF6',
    allowedSummary: [
      'Live Support Chat Desk',
      'View Customer Conversations',
      'Send Real-Time Support Chat Replies',
      'Manage & Close Support Inquiries'
    ],
    restrictedSummary: [
      'User Accounts & Credential Resets',
      'Deposit & Withdrawal Authorizations',
      'Live Trade Controller & Trading Positions',
      'Wallet Balances & Financial Ledgers',
      'System Settings & Payment Gateways'
    ]
  },
  {
    id: 'manager',
    name: 'Operations Manager',
    shortName: 'Manager',
    tagline: 'Approval Desk & User Inspection',
    description: 'Supervisory oversight inspecting pending deposits/withdrawals and viewing user profile records.',
    icon: Users,
    accentColor: '#6366F1',
    allowedSummary: [
      'View Approval Desk Requests',
      'Inspect Pending Deposits & Withdrawals',
      'View Registered User Profiles'
    ],
    restrictedSummary: [
      'Direct Financial Ledger Overrides',
      'Live Trade Interventions',
      'Platform Branding & Settings',
      'Role Assignment & Security Policies'
    ]
  },
  {
    id: 'moderator',
    name: 'Chat Moderator',
    shortName: 'Moderator',
    tagline: 'Chat Support Desk',
    description: 'Customer service desk agent with live chat response rights.',
    icon: MessageSquare,
    accentColor: '#EC4899',
    allowedSummary: [
      'Live Support Chat Desk',
      'Respond to Customer Messages'
    ],
    restrictedSummary: [
      'User Management Desk',
      'Financial Operations & Approvals',
      'Trading Desk Controls',
      'System Configuration'
    ]
  },
  {
    id: 'user',
    name: 'Standard Trader',
    shortName: 'User',
    tagline: 'Retail Trading Terminal Access Only',
    description: 'Standard client trading account with terminal access only. No administration panel permissions.',
    icon: UserIcon,
    accentColor: '#6B7280',
    allowedSummary: [
      'Retail Web Trading Terminal',
      'Standard Client-Side Operations'
    ],
    restrictedSummary: [
      'All Administration Modules',
      'Trade Interventions & Controls',
      'Financial Desks & Ledgers',
      'System Configuration & Settings'
    ]
  }
];

// Helper to map module id to friendly category icon
const getModuleIcon = (modId: string) => {
  switch (modId) {
    case 'users': return Users;
    case 'approval_desk': return DollarSign;
    case 'trade_control': return TrendingUp;
    case 'trade_history': return History;
    case 'profit_control': return DollarSign;
    case 'markets': return BarChart3;
    case 'analytics': return BarChart3;
    case 'settings': return Settings;
    case 'chat': return MessageSquare;
    case 'audit': return Shield;
    default: return Layers;
  }
};

export const RolePermissionManager: React.FC<RolePermissionManagerProps> = ({
  targetUser,
  initialRole = 'co_admin',
  isOpen = true,
  onClose,
  onSaved,
  onPermissionsUpdated
}) => {
  const notifySaved = () => {
    if (onSaved) onSaved();
    if (onPermissionsUpdated) onPermissionsUpdated();
  };

  const [activeRole, setActiveRole] = useState<Role>(
    (targetUser?.role as Role) || initialRole || 'co_admin'
  );
  const [catalog, setCatalog] = useState<AdminModuleDef[]>(ADMIN_MODULES_CATALOG);
  const [roleTemplates, setRoleTemplates] = useState<Record<string, RolePermissionTemplate>>(DEFAULT_ROLE_TEMPLATES);
  
  // Enabled modules & actions
  const [enabledModules, setEnabledModules] = useState<Record<string, boolean>>({});
  const [enabledActions, setEnabledActions] = useState<Record<string, boolean>>({});
  
  // Snapshot of original loaded state to track unsaved changes
  const [originalModules, setOriginalModules] = useState<Record<string, boolean>>({});
  const [originalActions, setOriginalActions] = useState<Record<string, boolean>>({});
  const [originalRole, setOriginalRole] = useState<Role>(
    (targetUser?.role as Role) || initialRole || 'co_admin'
  );

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'enabled' | 'disabled'>('all');
  
  // Collapsible section state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [showAdvancedDetails, setShowAdvancedDetails] = useState<boolean>(false);
  const [showRoleSummaryModal, setShowRoleSummaryModal] = useState<boolean>(false);
  const [showConfirmResetModal, setShowConfirmResetModal] = useState<boolean>(false);
  const [showConfirmBulkModal, setShowConfirmBulkModal] = useState<'grant' | 'revoke' | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load data on open or targetUser change
  useEffect(() => {
    if (!isOpen) return;
    
    const roleToLoad = targetUser ? (targetUser.role as Role || 'user') : activeRole;
    setActiveRole(roleToLoad);
    setOriginalRole(roleToLoad);
    fetchPermissionsData(roleToLoad);
  }, [isOpen, targetUser]);

  const fetchPermissionsData = async (role: Role) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res: any = await api.getRolePermissions();
      const payload = res?.data || res;
      if (payload) {
        if (payload.catalog) setCatalog(payload.catalog);
        if (payload.templates) setRoleTemplates(payload.templates);
        
        applyRoleState(role, payload.templates || DEFAULT_ROLE_TEMPLATES, true);
      }
    } catch (err: any) {
      console.error('Failed to fetch role templates:', err);
      applyRoleState(role, DEFAULT_ROLE_TEMPLATES, true);
    } finally {
      setLoading(false);
    }
  };

  const applyRoleState = (role: Role, templates: Record<string, RolePermissionTemplate>, isInitialLoad = false) => {
    const normRole = (role || 'user').toLowerCase().trim().replace('-', '_');
    const template = templates[normRole] || DEFAULT_ROLE_TEMPLATES[normRole as Role] || DEFAULT_ROLE_TEMPLATES.user;

    const modMap: Record<string, boolean> = {};
    const actMap: Record<string, boolean> = {};

    // Initial setup from template
    ADMIN_MODULES_CATALOG.forEach(m => {
      modMap[m.id] = (template.enabledModules || []).includes(m.id);
      m.actions.forEach(a => {
        actMap[a.id] = template.actions ? Boolean(template.actions[a.id] || template.actions['*']) : false;
      });
    });

    // If targetUser has custom overrides and this is initial load, apply them
    if (targetUser && isInitialLoad) {
      if (targetUser.customModules) {
        Object.entries(targetUser.customModules).forEach(([modId, val]) => {
          modMap[modId] = Boolean(val);
        });
      }
      if (targetUser.customActions) {
        Object.entries(targetUser.customActions).forEach(([actId, val]) => {
          actMap[actId] = Boolean(val);
        });
      }
    }

    setEnabledModules(modMap);
    setEnabledActions(actMap);

    if (isInitialLoad) {
      setOriginalModules(JSON.parse(JSON.stringify(modMap)));
      setOriginalActions(JSON.parse(JSON.stringify(actMap)));
      
      // Expand modules that are enabled by default for cleaner scanning
      const initialExp: Record<string, boolean> = {};
      ADMIN_MODULES_CATALOG.forEach(m => {
        initialExp[m.id] = modMap[m.id];
      });
      setExpandedCategories(initialExp);
    }
  };

  const handleSelectRole = (newRole: Role) => {
    setActiveRole(newRole);
    applyRoleState(newRole, roleTemplates, false);
    setFeedback({
      type: 'success',
      message: `Loaded default permissions for ${newRole.toUpperCase().replace('_', ' ')}. Review and save changes below.`
    });
  };

  const toggleCategory = (modId: string) => {
    if (activeRole === 'admin') return;
    
    const nextState = !enabledModules[modId];
    setEnabledModules(prev => ({ ...prev, [modId]: nextState }));
    
    // Automatically enable or disable its child permissions
    const mod = catalog.find(m => m.id === modId);
    if (mod) {
      setEnabledActions(prev => {
        const next = { ...prev };
        mod.actions.forEach(a => {
          next[a.id] = nextState;
        });
        return next;
      });
    }

    // Auto expand if enabled
    if (nextState) {
      setExpandedCategories(prev => ({ ...prev, [modId]: true }));
    }
  };

  const toggleAction = (actionId: string, modId: string) => {
    if (activeRole === 'admin') return;
    
    const nextState = !enabledActions[actionId];
    setEnabledActions(prev => ({ ...prev, [actionId]: nextState }));
    
    // If turning on an action, ensure parent category is enabled
    if (nextState && !enabledModules[modId]) {
      setEnabledModules(prev => ({ ...prev, [modId]: true }));
    }
  };

  const toggleCategoryAccordion = (modId: string) => {
    setExpandedCategories(prev => ({ ...prev, [modId]: !prev[modId] }));
  };

  const handleToggleAllInCategory = (modId: string, enableAll: boolean) => {
    if (activeRole === 'admin') return;
    const mod = catalog.find(m => m.id === modId);
    if (!mod) return;

    setEnabledModules(prev => ({ ...prev, [modId]: enableAll }));
    setEnabledActions(prev => {
      const next = { ...prev };
      mod.actions.forEach(a => {
        next[a.id] = enableAll;
      });
      return next;
    });
    if (enableAll) {
      setExpandedCategories(prev => ({ ...prev, [modId]: true }));
    }
  };

  const handleGrantAll = () => {
    if (activeRole === 'admin') return;
    const allMods: Record<string, boolean> = {};
    const allActs: Record<string, boolean> = {};
    catalog.forEach(m => {
      allMods[m.id] = true;
      m.actions.forEach(a => {
        allActs[a.id] = true;
      });
    });
    setEnabledModules(allMods);
    setEnabledActions(allActs);
    setShowConfirmBulkModal(null);
  };

  const handleRevokeAll = () => {
    if (activeRole === 'admin') return;
    const allMods: Record<string, boolean> = {};
    const allActs: Record<string, boolean> = {};
    catalog.forEach(m => {
      allMods[m.id] = false;
      m.actions.forEach(a => {
        allActs[a.id] = false;
      });
    });
    setEnabledModules(allMods);
    setEnabledActions(allActs);
    setShowConfirmBulkModal(null);
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (activeRole !== originalRole) return true;
    for (const key of Object.keys(enabledModules)) {
      if (Boolean(enabledModules[key]) !== Boolean(originalModules[key])) return true;
    }
    for (const key of Object.keys(enabledActions)) {
      if (Boolean(enabledActions[key]) !== Boolean(originalActions[key])) return true;
    }
    return false;
  }, [activeRole, originalRole, enabledModules, originalModules, enabledActions, originalActions]);

  // Compute number of custom overrides vs role template
  const customOverridesCount = useMemo(() => {
    const template = roleTemplates[activeRole] || DEFAULT_ROLE_TEMPLATES[activeRole] || DEFAULT_ROLE_TEMPLATES.user;
    let diffs = 0;
    
    catalog.forEach(m => {
      const isModInTemplate = (template.enabledModules || []).includes(m.id);
      if (Boolean(enabledModules[m.id]) !== isModInTemplate) {
        diffs++;
      }
      m.actions.forEach(a => {
        const isActInTemplate = template.actions ? Boolean(template.actions[a.id] || template.actions['*']) : false;
        if (Boolean(enabledActions[a.id]) !== isActInTemplate) {
          diffs++;
        }
      });
    });
    return diffs;
  }, [catalog, activeRole, roleTemplates, enabledModules, enabledActions]);

  // Save Role & Permissions
  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      if (targetUser) {
        // 1. If role was changed on target user, update user role
        if (activeRole !== targetUser.role) {
          await apiService.updateAdminUserRole(targetUser.id, activeRole, false);
        }

        // 2. Save user permission overrides
        const customMods: Record<string, boolean> = {};
        const customActs: Record<string, boolean> = {};

        catalog.forEach(m => {
          customMods[m.id] = Boolean(enabledModules[m.id]);
          m.actions.forEach(a => {
            customActs[a.id] = Boolean(enabledActions[a.id]);
          });
        });

        await api.updateUserPermissions(targetUser.id, {
          customModules: customMods,
          customActions: customActs
        });

        setFeedback({
          type: 'success',
          message: `Role and permissions saved successfully for ${targetUser.name || targetUser.email}!`
        });
      } else {
        // Global Role Template Policy Mode
        const enabledModList = catalog
          .filter(m => enabledModules[m.id])
          .map(m => m.id);

        const actionsMap: Record<string, boolean> = {};
        catalog.forEach(m => {
          m.actions.forEach(a => {
            actionsMap[a.id] = Boolean(enabledActions[a.id]);
          });
        });

        const res: any = await api.updateRolePermissions({
          role: activeRole,
          enabledModules: enabledModList,
          actions: actionsMap
        });

        const updatedTemplate = res?.template || res?.data?.template;
        if (updatedTemplate) {
          setRoleTemplates(prev => ({
            ...prev,
            [activeRole]: updatedTemplate
          }));
        }

        setFeedback({
          type: 'success',
          message: `Global policy for role '${activeRole.toUpperCase().replace('_', ' ')}' updated successfully!`
        });
      }

      // Update baseline state
      setOriginalModules(JSON.parse(JSON.stringify(enabledModules)));
      setOriginalActions(JSON.parse(JSON.stringify(enabledActions)));
      setOriginalRole(activeRole);
      notifySaved();
    } catch (err: any) {
      console.error('Failed to save permissions:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to save role and permissions.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Reset to Role Defaults
  const handleResetToRoleDefaults = async () => {
    setShowConfirmResetModal(false);
    setSaving(true);
    setFeedback(null);
    try {
      if (targetUser) {
        await api.updateUserPermissions(targetUser.id, {
          resetToRoleDefault: true
        });
      }
      applyRoleState(activeRole, roleTemplates, false);
      setFeedback({
        type: 'success',
        message: `Permissions reset to default ${activeRole.toUpperCase().replace('_', ' ')} template.`
      });
      notifySaved();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to reset permissions.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Restore factory system defaults
  const handleRestoreFactoryDefaults = async () => {
    setShowConfirmResetModal(false);
    setSaving(true);
    setFeedback(null);
    try {
      const res: any = await api.resetRolePermissions(activeRole);
      const resetTemplate = res?.template || res?.data?.template;
      if (resetTemplate) {
        setRoleTemplates(prev => ({
          ...prev,
          [activeRole]: resetTemplate
        }));
      }
      applyRoleState(activeRole, {
        ...roleTemplates,
        [activeRole]: DEFAULT_ROLE_TEMPLATES[activeRole] || DEFAULT_ROLE_TEMPLATES.user
      }, false);
      setFeedback({
        type: 'success',
        message: `Role ${activeRole.toUpperCase()} restored to factory system defaults.`
      });
      notifySaved();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Failed to restore factory defaults.'
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Selected active role metadata
  const currentRoleInfo = ROLES_INFO.find(r => r.id === activeRole) || ROLES_INFO[0];
  const ActiveRoleIcon = currentRoleInfo.icon;

  // Filtered permission categories based on search and mode
  const filteredCategories = catalog.filter(cat => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      cat.name.toLowerCase().includes(q) ||
      cat.description.toLowerCase().includes(q) ||
      cat.id.toLowerCase().includes(q) ||
      cat.actions.some(a =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
      );

    if (!matchesSearch) return false;

    const isEnabled = activeRole === 'admin' || Boolean(enabledModules[cat.id]);
    if (filterMode === 'enabled') return isEnabled;
    if (filterMode === 'disabled') return !isEnabled;
    return true;
  });

  const totalActionsCount = catalog.reduce((acc, m) => acc + m.actions.length, 0);
  const activeActionsCount = activeRole === 'admin'
    ? totalActionsCount
    : Object.values(enabledActions).filter(Boolean).length;
  const activeModulesCount = activeRole === 'admin'
    ? catalog.length
    : Object.values(enabledModules).filter(Boolean).length;

  return (
    <div id="role-permission-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div id="role-permission-modal-container" className="bg-[#121212] border border-[#262626] rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* 1. COMPACT HEADER */}
        <div className="px-5 py-4 border-b border-[#262626] flex items-center justify-between bg-[#161616]/95">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#00C853]/15 border border-[#00C853]/30 text-[#00C853]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  {targetUser ? 'User Role & Permissions Policy' : 'Global Role Policy & Permissions Manager'}
                </h3>
                {targetUser && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#222222] text-[#A0A0A0] border border-[#333333]">
                    {targetUser.id}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8A8A8A]">
                {targetUser 
                  ? `Assign role and configure module permissions for ${targetUser.name || targetUser.email}`
                  : 'Configure default permission templates and operational capabilities across roles'
                }
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            id="close-role-permission-modal-button"
            className="p-2 rounded-xl text-[#8A8A8A] hover:text-white hover:bg-[#262626] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FEEDBACK BANNER */}
        {feedback && (
          <div className={`mx-5 mt-3 p-3 rounded-xl border flex items-center justify-between text-xs ${
            feedback.type === 'success' 
              ? 'bg-[#00C853]/10 border-[#00C853]/30 text-[#00C853]' 
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <div className="flex items-center space-x-2">
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* MODAL MAIN CONTENT */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          
          {/* STEP 1: SIMPLE ROLE SELECTION CARDS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <span className="w-5 h-5 rounded-full bg-[#00C853]/20 text-[#00C853] flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Select Assigned Role:</span>
              </span>

              {customOverridesCount > 0 && targetUser && (
                <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{customOverridesCount} custom permission override{customOverridesCount > 1 ? 's' : ''} active</span>
                </span>
              )}
            </div>

            {/* Role Grid Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ROLES_INFO.map(r => {
                const isSelected = activeRole === r.id;
                const IconComp = r.icon;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectRole(r.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-[#1C1C1C] border-[#00C853] shadow-md shadow-[#00C853]/10 ring-1 ring-[#00C853]'
                        : 'bg-[#141414] border-[#242424] hover:border-[#383838] hover:bg-[#181818]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-[#00C853]/20 text-[#00C853]' : 'bg-[#202020] text-[#8A8A8A]'}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-[#00C853] animate-pulse"></span>
                        )}
                      </div>
                      <h4 className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-[#CCCCCC]'}`}>
                        {r.shortName}
                      </h4>
                      <p className="text-[10px] text-[#7A7A7A] line-clamp-1 mt-0.5">
                        {r.tagline}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: ROLE ACCESS SUMMARY (Clear & Beginner Friendly) */}
          <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#262626] pb-2.5">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 rounded-lg bg-[#00C853]/15 text-[#00C853]">
                  <ActiveRoleIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-white">{currentRoleInfo.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#222222] text-[#00C853] border border-[#00C853]/30">
                      {activeModulesCount} of {catalog.length} modules enabled
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8A8A8A] mt-0.5">
                    {currentRoleInfo.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRoleSummaryModal(!showRoleSummaryModal)}
                  className="text-[11px] font-semibold text-[#00C853] hover:underline cursor-pointer flex items-center space-x-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showRoleSummaryModal ? 'Hide Access Details' : 'View Access Breakdown'}</span>
                </button>
              </div>
            </div>

            {/* Allowed vs Restricted Visual Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Allowed column */}
              <div className="p-3 rounded-lg bg-[#0D0D0D] border border-emerald-900/30 space-y-1.5">
                <div className="text-[11px] font-bold text-[#00C853] flex items-center space-x-1.5 uppercase font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Allowed Capabilities:</span>
                </div>
                <ul className="space-y-1">
                  {currentRoleInfo.allowedSummary.map((item, i) => (
                    <li key={i} className="text-xs text-[#CCCCCC] flex items-start space-x-1.5">
                      <span className="text-[#00C853] font-bold mt-0.5">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Restricted column */}
              <div className="p-3 rounded-lg bg-[#0D0D0D] border border-red-900/30 space-y-1.5">
                <div className="text-[11px] font-bold text-[#FF3B30] flex items-center space-x-1.5 uppercase font-mono">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Restricted Access:</span>
                </div>
                {currentRoleInfo.restrictedSummary.length === 0 ? (
                  <p className="text-xs text-[#8A8A8A] italic">No restricted modules (Full root privileges).</p>
                ) : (
                  <ul className="space-y-1">
                    {currentRoleInfo.restrictedSummary.map((item, i) => (
                      <li key={i} className="text-xs text-[#888888] flex items-start space-x-1.5">
                        <span className="text-[#FF3B30] font-bold mt-0.5">✕</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* STEP 3: CUSTOMIZE PERMISSIONS BY BUSINESS AREA */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <span className="w-5 h-5 rounded-full bg-[#00C853]/20 text-[#00C853] flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Customize Permissions by Business Area:</span>
              </span>

              {/* Master Admin Notice or Bulk Actions */}
              {activeRole === 'admin' ? (
                <span className="text-[11px] text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                  Master Admin permanently possesses all permissions
                </span>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmBulkModal('grant')}
                    className="text-[11px] font-semibold text-[#00C853] hover:text-[#00E676] bg-[#00C853]/10 hover:bg-[#00C853]/20 border border-[#00C853]/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Enable All
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmBulkModal('revoke')}
                    className="text-[11px] font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    Disable All
                  </button>
                </div>
              )}
            </div>

            {/* Search & Filter Bar */}
            {activeRole !== 'admin' && (
              <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#161616] p-2 rounded-xl border border-[#262626]">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 text-[#707070] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search permissions by name, function, or keyword..."
                    className="w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#707070] focus:border-[#00C853] outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#707070] hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-1 bg-[#0D0D0D] p-1 rounded-lg border border-[#262626] text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                      filterMode === 'all' ? 'bg-[#262626] text-white font-bold' : 'text-[#808080] hover:text-white'
                    }`}
                  >
                    All ({catalog.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('enabled')}
                    className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                      filterMode === 'enabled' ? 'bg-[#00C853]/20 text-[#00C853] font-bold' : 'text-[#808080] hover:text-white'
                    }`}
                  >
                    Allowed ({activeModulesCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('disabled')}
                    className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                      filterMode === 'disabled' ? 'bg-red-500/20 text-red-400 font-bold' : 'text-[#808080] hover:text-white'
                    }`}
                  >
                    Restricted ({catalog.length - activeModulesCount})
                  </button>
                </div>
              </div>
            )}

            {/* Permission Categories List */}
            <div className="space-y-3">
              {filteredCategories.length === 0 ? (
                <div className="p-8 text-center text-[#707070] text-xs font-mono bg-[#141414] rounded-xl border border-[#222222]">
                  No permissions match '{searchQuery}'. Try searching for 'deposit', 'trade', 'user', or 'password'.
                </div>
              ) : (
                filteredCategories.map(cat => {
                  const isCatEnabled = activeRole === 'admin' || Boolean(enabledModules[cat.id]);
                  const isExpanded = Boolean(expandedCategories[cat.id]);
                  const enabledCatActionsCount = cat.actions.filter(a => activeRole === 'admin' || enabledActions[a.id]).length;
                  const CatIcon = getModuleIcon(cat.id);

                  return (
                    <div
                      key={cat.id}
                      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                        isCatEnabled
                          ? 'bg-[#161616] border-[#2A2A2A]'
                          : 'bg-[#121212]/80 border-[#202020] opacity-80'
                      }`}
                    >
                      {/* Category Header */}
                      <div className="p-3.5 flex items-center justify-between bg-[#1A1A1A]/80 hover:bg-[#1E1E1E] transition-colors">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleCategoryAccordion(cat.id)}
                            className="p-1 text-[#8A8A8A] hover:text-white transition-colors cursor-pointer flex-shrink-0"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>

                          <div className={`p-1.5 rounded-lg flex-shrink-0 ${isCatEnabled ? 'bg-[#00C853]/15 text-[#00C853]' : 'bg-[#222222] text-[#707070]'}`}>
                            <CatIcon className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-white truncate">
                                {cat.name}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                                isCatEnabled 
                                  ? 'bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/25' 
                                  : 'bg-red-500/10 text-red-400 border border-red-500/25'
                              }`}>
                                {isCatEnabled ? `ALLOWED (${enabledCatActionsCount}/${cat.actions.length})` : 'RESTRICTED'}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#7A7A7A] mt-0.5 line-clamp-1">
                              {cat.description}
                            </p>
                          </div>
                        </div>

                        {/* Category Controls */}
                        <div className="flex items-center space-x-3 ml-3 flex-shrink-0">
                          {activeRole !== 'admin' && (
                            <>
                              <div className="hidden sm:flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleToggleAllInCategory(cat.id, true)}
                                  className="text-[10px] font-semibold text-[#8A8A8A] hover:text-white px-2 py-0.5 rounded bg-[#111111] border border-[#282828] cursor-pointer"
                                >
                                  All
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleAllInCategory(cat.id, false)}
                                  className="text-[10px] font-semibold text-[#8A8A8A] hover:text-white px-2 py-0.5 rounded bg-[#111111] border border-[#282828] cursor-pointer"
                                >
                                  None
                                </button>
                              </div>

                              {/* Master Category Switch */}
                              <button
                                type="button"
                                onClick={() => toggleCategory(cat.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                                  isCatEnabled
                                    ? 'bg-[#00C853]/20 border-[#00C853] text-[#00C853]'
                                    : 'bg-[#111111] border-[#333333] text-[#707070] hover:text-white'
                                }`}
                              >
                                {isCatEnabled ? '✓ Active' : '✕ Off'}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Child Permissions List (When Expanded) */}
                      {isExpanded && (
                        <div className="p-3.5 pt-2 border-t border-[#242424] space-y-2 bg-[#121212]/95">
                          <div className="text-[10px] font-mono font-bold text-[#8A8A8A] uppercase tracking-wider mb-1 flex items-center justify-between">
                            <span>Individual Permissions in {cat.name}</span>
                            <span>{enabledCatActionsCount} of {cat.actions.length} allowed</span>
                          </div>

                          {!isCatEnabled && (
                            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] flex items-center space-x-2">
                              <Info className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>This category is currently restricted. Turn it ON above to enable individual permissions.</span>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {cat.actions.map(act => {
                              const isActEnabled = activeRole === 'admin' || (isCatEnabled && Boolean(enabledActions[act.id]));

                              return (
                                <div
                                  key={act.id}
                                  className={`p-2.5 rounded-lg border transition-colors flex items-start justify-between gap-2.5 ${
                                    isActEnabled
                                      ? 'bg-[#181818] border-[#2A2A2A]'
                                      : 'bg-[#0E0E0E] border-[#1E1E1E] opacity-60'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-1.5">
                                      <span className="text-xs font-semibold text-white">
                                        {act.name}
                                      </span>
                                      {act.isDangerous && (
                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono">
                                          SENSITIVE
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-[#7A7A7A] mt-0.5 leading-snug">
                                      {act.description}
                                    </p>

                                    {/* Advanced Technical Details if enabled */}
                                    {showAdvancedDetails && (
                                      <div className="mt-1 pt-1 border-t border-[#222222] text-[9px] font-mono text-[#666666] flex items-center space-x-2">
                                        <span>Key: {act.id}</span>
                                        <span>Type: {act.type}</span>
                                      </div>
                                    )}
                                  </div>

                                  {activeRole !== 'admin' && (
                                    <button
                                      type="button"
                                      disabled={!isCatEnabled}
                                      onClick={() => toggleAction(act.id, cat.id)}
                                      className={`px-2 py-1 rounded text-[10px] font-bold border shrink-0 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                                        isActEnabled
                                          ? 'bg-[#00C853]/20 border-[#00C853] text-[#00C853]'
                                          : 'bg-[#111111] border-[#2A2A2A] text-[#707070] hover:text-white'
                                      }`}
                                    >
                                      {isActEnabled ? '✓ Allowed' : '✕ Denied'}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ADVANCED DETAILS ACCORDION TOGGLE */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowAdvancedDetails(!showAdvancedDetails)}
              className="text-[11px] font-mono text-[#707070] hover:text-white transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{showAdvancedDetails ? 'Hide Advanced Technical IDs' : 'Show Advanced Technical IDs & Schema'}</span>
              {showAdvancedDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* FOOTER ACTIONS BAR */}
        <div className="p-4 border-t border-[#262626] bg-[#161616] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            {targetUser && (
              <button
                type="button"
                onClick={() => setShowConfirmResetModal(true)}
                disabled={saving}
                className="px-3 py-2 rounded-xl bg-[#202020] hover:bg-[#282828] text-[#CCCCCC] hover:text-white text-xs font-semibold border border-[#303030] transition-colors inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                title="Reset this user to clean role defaults"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#8A8A8A]" />
                <span>Reset to Role Defaults</span>
              </button>
            )}

            {!targetUser && (
              <button
                type="button"
                onClick={() => setShowConfirmResetModal(true)}
                disabled={saving}
                className="px-3 py-2 rounded-xl bg-[#202020] hover:bg-[#282828] text-[#8A8A8A] hover:text-white text-xs font-medium border border-[#303030] transition-colors inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                title="Reset global role template to factory system defaults"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore System Defaults</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            {hasUnsavedChanges && (
              <span className="text-[11px] text-amber-400 font-semibold flex items-center space-x-1 mr-1 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Unsaved Changes</span>
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#202020] text-[#A0A0A0] hover:text-white hover:bg-[#2A2A2A] text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {activeRole !== 'admin' && (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                id="save-role-permissions-button"
                className="px-5 py-2.5 rounded-xl bg-[#00C853] hover:bg-[#00B048] text-black font-bold text-xs shadow-lg shadow-[#00C853]/20 transition-all inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{targetUser ? 'Save Role & Permissions' : 'Save Role Policy'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* CONFIRM RESET DIALOG */}
        {showConfirmResetModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-[#181818] border border-[#333333] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center space-x-3 text-amber-400">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <h4 className="text-sm font-bold text-white">
                  {targetUser ? 'Reset User Permissions?' : 'Restore Factory Defaults?'}
                </h4>
              </div>

              <p className="text-xs text-[#CCCCCC] leading-relaxed">
                {targetUser 
                  ? `Are you sure you want to reset permissions for ${targetUser.name || targetUser.email} back to the standard defaults for the ${activeRole.toUpperCase().replace('_', ' ')} role? Any custom overrides will be removed.`
                  : `Are you sure you want to reset the global ${activeRole.toUpperCase().replace('_', ' ')} role template back to original system factory defaults?`
                }
              </p>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowConfirmResetModal(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#222222] text-[#A0A0A0] hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={targetUser ? handleResetToRoleDefaults : handleRestoreFactoryDefaults}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-colors cursor-pointer"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRM BULK GRANT/REVOKE DIALOG */}
        {showConfirmBulkModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-[#181818] border border-[#333333] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center space-x-3 text-amber-400">
                <AlertTriangle className="w-6 h-6 flex-shrink-0" />
                <h4 className="text-sm font-bold text-white">
                  {showConfirmBulkModal === 'grant' ? 'Enable All Permissions?' : 'Disable All Permissions?'}
                </h4>
              </div>

              <p className="text-xs text-[#CCCCCC] leading-relaxed">
                {showConfirmBulkModal === 'grant'
                  ? `Are you sure you want to enable ALL ${totalActionsCount} permissions across all ${catalog.length} administration modules for this configuration?`
                  : `Are you sure you want to remove all operational permissions? The user will have no backend access until specific permissions are enabled.`
                }
              </p>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={() => setShowConfirmBulkModal(null)}
                  className="px-3.5 py-2 rounded-xl bg-[#222222] text-[#A0A0A0] hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={showConfirmBulkModal === 'grant' ? handleGrantAll : handleRevokeAll}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    showConfirmBulkModal === 'grant'
                      ? 'bg-[#00C853] hover:bg-[#00B048] text-black'
                      : 'bg-red-500 hover:bg-red-400 text-white'
                  }`}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
