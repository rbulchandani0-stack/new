export * from './rbac';
export type Role = 'user' | 'admin' | 'co_admin' | 'trade_controller' | 'finance_manager' | 'support' | 'manager' | 'moderator';
export type KYCStatus = 'unverified' | 'pending' | 'verified' | 'manually_verified';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions?: string[];
  customModules?: Record<string, boolean>;
  customActions?: Record<string, boolean>;
  effectivePermissions?: Record<string, boolean>;
  effectiveModules?: string[];
  is2FAEnabled: boolean;
  googleAuthEnabled?: boolean;
  kycStatus: KYCStatus;
  status: UserStatus;
  plainPassword?: string;
  suspendedUntil?: string;
  suspensionReason?: string;
  createdAt: string;
  profile?: UserProfile;
  profilePicture?: string;
  wallet?: Wallet;
}

export interface Wallet {
  userId: string;
  spotBalance: number;
  tradingBalance: number;
  fundingBalance: number;
  availableMargin: number;
  usedMargin: number;
}

export interface MarketPair {
  symbol: string;         // e.g. "BTC/USDT"
  baseCoin: string;       // e.g. "BTC"
  quoteCoin: string;      // e.g. "USDT"
  name: string;           // e.g. "Bitcoin"
  price: number;
  change24h: number;      // percentage e.g. +2.45
  high24h: number;
  low24h: number;
  volume24h: number;      // in USDT
  marketCap?: number;
  maxLeverage: number;    // e.g. 125
  minOrderSize: number;
  spread: number;         // e.g. 0.01%
  enabled: boolean;
  category?: 'Crypto' | 'Forex' | 'Commodities' | 'Indices' | 'Layer 1' | 'DeFi' | 'Meme' | 'AI' | 'Infrastructure' | (string & {});
  tvSymbol?: string;
  priceDirection?: 'up' | 'down';
  lastUpdated?: number;
}

export interface KlineCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookItem {
  price: number;
  amount: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookItem[];
  asks: OrderBookItem[];
  spread: number;
}

export interface TradeItem {
  id: string;
  symbol: string;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

export type OrderType = 'market' | 'limit' | 'stop';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'open' | 'filled' | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  amount: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
  status: OrderStatus;
  createdAt: string;
}

export type PositionSide = 'long' | 'short';

export interface Position {
  id: string;
  userId: string;
  symbol: string;
  side: PositionSide;
  entryPrice: number;
  markPrice: number;
  size: number;           // Quantity of base coin e.g. 0.5 BTC or 100,000 EUR
  lots?: number;          // Position Size in Lots (e.g. 1.00 Lot, 0.10 Lot)
  contractSize?: number;  // Standard lot contract units (e.g. 100,000 for Forex)
  leverage: number;       // e.g. 20
  margin: number;         // Initial margin invested in USDT
  liquidationPrice: number;
  takeProfit?: number;
  stopLoss?: number;
  handlingFee?: number;   // Handling / Trading fee in USDT
  feeRate?: number;       // e.g. 0.0005 (0.05% taker) or 0.0002 (0.02% maker)
  makerTaker?: 'maker' | 'taker';
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  customPnL?: number;
  customPnLOffset?: number;
  customMarkPrice?: number;
  targetMarkPrice?: number;
  transitionStartPrice?: number;
  transitionStartTime?: number;
  transitionDurationMs?: number;
  targetPnL?: number;
  transitionStartPnL?: number;
  transitionStartTimePnL?: number;
  transitionDurationMsPnL?: number;
  openedAt: string;
  createdAt?: string;
  marginUsed?: number;
}

export type TransactionType = 'deposit' | 'withdrawal' | 'trade' | 'commission';
export type TransactionStatus = 'completed' | 'pending' | 'failed' | 'rejected' | 'closed' | 'cancelled';
export type WalletType = 'spot' | 'trading' | 'funding';

export interface TradeCorrection {
  id: string;
  field: string;
  originalValue: any;
  newValue: any;
  reason: string;
  adminId: string;
  adminEmail: string;
  adminName?: string;
  timestamp: string;
}

export interface Transaction {
  id: string;
  depositRequestId?: string;
  withdrawalRequestId?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  symbol?: string;
  side?: 'long' | 'short' | 'buy' | 'sell';
  orderType?: OrderType;
  entryPrice?: number;
  exitPrice?: number;
  quantity?: number;
  lots?: number;
  contractSize?: number;
  leverage?: number;
  txHash?: string;
  referenceId?: string;
  fromWallet?: WalletType;
  toWallet?: WalletType;
  fee?: number;
  handlingFee?: number;
  feeRate?: number;
  makerTaker?: 'maker' | 'taker';
  swapFee?: number;
  pnl?: number;
  netPnL?: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt?: string;
  createdAt: string;
  closeReason?: string;
  margin?: number;
  isCorrected?: boolean;
  isVoided?: boolean;
  voidReason?: string;
  voidedAt?: string;
  voidedBy?: string;
  isManualAdminCreated?: boolean;
  createdByAdmin?: string;
  lastModifiedAt?: string;
  lastModifiedBy?: string;
  corrections?: TradeCorrection[];
}

export interface AdminTradeItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  symbol: string;
  side: 'long' | 'short' | 'buy' | 'sell';
  status: 'open' | 'closed' | 'completed' | 'cancelled';
  orderType?: 'market' | 'limit' | 'stop';
  openedAt: string;
  closedAt?: string;
  createdAt: string;
  entryPrice: number;
  exitPrice?: number;
  currentPrice: number;
  size: number;
  lots: number;
  contractSize?: number;
  leverage: number;
  margin: number;
  fee: number;
  handlingFee?: number;
  feeRate?: number;
  makerTaker?: 'maker' | 'taker';
  swapFee?: number;
  grossPnL: number;
  netPnL: number;
  unrealizedPnL?: number;
  stopLoss?: number;
  takeProfit?: number;
  referenceId: string;
  lastModifiedAt?: string;
  lastModifiedBy?: string;
  isCorrected?: boolean;
  isVoided?: boolean;
  voidReason?: string;
  voidedAt?: string;
  voidedBy?: string;
  isManualAdminCreated?: boolean;
  createdByAdmin?: string;
  corrections?: TradeCorrection[];
}

export interface BalanceLedgerEntry {
  id: string;
  timestamp: string;
  type: 'deposit' | 'withdrawal' | 'trade_pnl' | 'fee' | 'adjustment' | 'margin_hold' | 'margin_release';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  currency: string;
  referenceId: string;
  description: string;
  adminActor?: string;
}

export interface AccountActivityData {
  user: User;
  wallet: Wallet;
  trades: AdminTradeItem[];
  deposits: any[];
  withdrawals: any[];
  balanceLedger: BalanceLedgerEntry[];
  securityEvents: AuditLog[];
  loginHistory: any[];
  sessions: any[];
}

export interface PortfolioStats {
  totalBalance: number;
  availableBalance: number;
  usedMargin: number;
  todayPnL: number;
  todayPnLPercent: number;
  totalPnL: number;
  totalPnLPercent: number;
  dailyPnL: number;
  weeklyPnL?: number;
  monthlyPnL: number;
  yearlyPnL: number;
  totalProfit?: number;
  totalLoss?: number;
  totalFees?: number;
  winRate: number;
  winCount: number;
  lossCount: number;
  roi: number;
  bestPerformingAsset?: string;
  assetAllocation: { name: string; value: number; amount: number; color: string }[];
  growthHistory: { date: string; balance: number; pnl: number }[];
}

export interface AdminAnalytics {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  todayTradesCount: number;
  todayVolume: number;
  todayDeposits: number;
  todayWithdrawals: number;
  platformRevenue: number;
  topAssets: { symbol: string; volume: number; change: number }[];
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'trade' | 'deposit' | 'withdrawal' | 'margin' | 'alert' | 'system';
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  eventType: string;
  category: 'role' | 'finance' | 'withdrawal' | 'deposit' | 'trade' | 'kyc' | 'user' | 'security' | 'system';
  
  // Legacy / Direct access fields
  adminEmail: string;
  targetUser?: string;
  details: string;
  timestamp: string; // ISO 8601 string

  // Actor identification
  actorUserId?: string;
  actorName?: string;
  actorEmail?: string;
  actorRole?: string;
  ipAddress?: string;

  // Affected Target Account identification
  targetUserId?: string;
  targetUserName?: string;
  targetUserEmail?: string;

  // Object / Entity affected
  objectType?: string;
  objectId?: string;

  // State transitions
  previousState?: string;
  newState?: string;

  // Financial & Ledger details
  amount?: number;
  currency?: string;
  walletType?: string;
  previousBalance?: number;
  newBalance?: number;

  // Trade & Position details
  symbol?: string;
  side?: string;
  entryPrice?: number;
  currentPrice?: number;
  previousPnL?: number;
  targetPnL?: number;
  transitionDuration?: string;
  leverage?: number;

  // Context & Metadata
  reason?: string;
  metadata?: Record<string, any>;
}

export interface FooterSettings {
  brandName?: string;
  brandText?: string;
  brandLogoUrl?: string;
  logoSource?: 'upload' | 'url';
  descriptionText?: string;
  copyrightText?: string;
  showEmojiLogo?: boolean;
  emojiIcon?: string;
  customDisclaimer?: string;
}

export interface SystemSettings {
  siteName: string;
  browserTabTitle?: string;
  socialShareTitle?: string;
  socialShareDescription?: string;
  socialShareImageUrl?: string;
  logoUrl: string;
  faviconUrl?: string;
  logoText: string;
  tradeSharingEnabled?: boolean;
  customTradeLogoUrl?: string;
  initialUserBalance: number;
  cryptoWallets: {
    network: string;
    address: string;
    qrCode?: string;
  }[];
  bankDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    ifscIban: string;
    upiId: string;
    swiftCode?: string;
    upiQrCode?: string;
  };
  withdrawalNotice: string;
  contactInfo?: {
    address?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    officeHours?: string;
  };
  tradingFees?: {
    makerFeeRate: number; // e.g. 0.0002 for 0.02%
    takerFeeRate: number; // e.g. 0.0005 for 0.05%
  };
  footerSettings?: FooterSettings;
}

export interface UserProfile {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  address?: string;
  country?: string;
  profilePicture?: string;
}

export type DocumentUploadState = 
  | 'IDLE'
  | 'SELECTED'
  | 'VALIDATING'
  | 'UPLOADING'
  | 'UPLOADED'
  | 'FAILED'
  | 'RETRYING';

export interface UploadedDocumentRecord {
  documentId: string;
  target: 'id_front' | 'id_back' | 'selfie' | 'address_proof';
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageReference: string;
  url: string;
  status: DocumentUploadState;
  progress?: number;
  error?: string;
  uploadedAt: string;
  previewUrl?: string;
}

export interface KYCSubmission {
  id: string;
  userId: string;
  userEmail: string;
  fullName: string;
  documentType: 'passport' | 'id_card' | 'driver_license' | 'aadhaar' | 'pan_card';
  documentNumber: string;
  idFront?: string;
  idBack?: string;
  idFrontImage?: string;
  idBackImage?: string;
  idFrontDocId?: string;
  idBackDocId?: string;
  documents?: UploadedDocumentRecord[];
  selfie?: string;
  selfieImage?: string;
  addressProof?: string;
  proofAddressImage?: string;
  country?: string;
  status: 'pending' | 'verified' | 'rejected' | 'approved' | 'manually_verified';
  rejectionReason?: string;
  adminNote?: string;
  submittedAt: string;
}

export interface ChatAttachment {
  id?: string;
  name: string;
  type: string;
  url: string;
  size?: number;
  status?: 'pending' | 'uploading' | 'uploaded' | 'failed';
  progress?: number;
  error?: string;
  localFile?: File;
  rawBase64?: string;
}

export type SupportAckType = 'SUPPORT_HOURS_ACK' | 'OUT_OF_HOURS_ACK';

export interface SupportAckRecord {
  id: string;
  userId: string;
  istDate: string;
  ackType: SupportAckType;
  periodId: string;
  ackKey: string;
  sentAt: string;
  messageId: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  sender: 'user' | 'admin';
  senderType?: 'CUSTOMER' | 'AGENT' | 'SYSTEM' | 'user' | 'admin';
  userName: string;
  message: string;
  attachments?: ChatAttachment[];
  timestamp: string;
  read: boolean;
  readAt?: string;
  deliveredAt?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  clientMsgId?: string;
  error?: string;
  isAutomated?: boolean;
  messageType?: 'STANDARD' | 'AUTOMATED' | 'AUTOMATED_SUPPORT' | 'CUSTOMER' | 'AGENT' | 'SYSTEM';
  automatedReason?: 'OUT_OF_HOURS' | 'SUPPORT_HOURS' | 'SUPPORT_HOURS_ACK' | 'OUT_OF_HOURS_ACK';
  ackType?: SupportAckType;
  istDate?: string;
  periodId?: string;
  ackKey?: string;
}

export interface ChatTypingEvent {
  userId: string;
  sender: 'user' | 'admin';
  userName?: string;
  isTyping: boolean;
  timestamp?: number;
}

export type SupportConversationStatus = 'open' | 'waiting_customer' | 'waiting_admin' | 'resolved';

export interface AdminChatConversation {
  userId: string;
  userName: string;
  userEmail: string;
  phone?: string;
  accountStatus?: string;
  userCreatedAt?: string;
  firstTimestamp?: string;
  kycStatus: string;
  balance: number;
  availableMargin?: number;
  totalDeposits?: number;
  totalWithdrawals?: number;
  activePositionsCount?: number;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
  lastSender?: 'user' | 'admin';
  status: SupportConversationStatus | string;
}

export interface LoginHistoryItem {
  id: string;
  ip: string;
  device: string;
  location: string;
  timestamp: string;
}

export interface UserSession {
  id: string;
  device: string;
  ip: string;
  location: string;
  isCurrent: boolean;
  lastActive: string;
}

export interface DepositRequest {
  id: string;
  idempotencyKey?: string;
  depositRequestId?: string;
  userId: string;
  userEmail: string;
  amount: number;
  currency: string;
  method: string;
  utrNumber?: string;
  proofImage?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  walletTransactionId?: string;
  notes?: string;
}

export interface WithdrawalDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  size?: number;
  uploadedAt: string;
  category?: 'bank_proof' | 'passbook' | 'cancelled_cheque' | 'account_statement' | 'other';
}

export interface WithdrawalDestinationDetails {
  method: 'bank_transfer' | 'upi' | 'crypto' | string;
  // Bank Transfer Fields
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  swiftCode?: string;
  accountType?: 'savings' | 'current' | string;
  branchName?: string;
  // UPI Fields
  upiId?: string;
  upiHolderName?: string;
  // Cryptocurrency Fields
  cryptoCurrency?: string;
  cryptoNetwork?: string;
  destinationAddress?: string;
  tag?: string;
  memo?: string;
  // Payout & Conversion Details
  payoutAmountInr?: string;
  exchangeRate?: number;
}

export interface WithdrawalRequest {
  id: string;
  idempotencyKey?: string;
  walletTransactionId?: string;
  userId: string;
  userEmail: string;
  userName?: string;
  amount: number;
  currency: string;
  network?: string;
  method?: 'bank_transfer' | 'upi' | 'crypto' | string;

  // Indian / International Bank Details
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  swiftCode?: string;
  accountType?: 'savings' | 'current' | string;
  branchName?: string;
  payoutAmountInr?: string;
  exchangeRate?: number;

  // UPI Details
  upiId?: string;
  upiHolderName?: string;

  // Crypto Destination Details
  destinationAddress?: string;
  cryptoNetwork?: string;
  tag?: string;
  memo?: string;

  // Structured snapshot & summary for compatibility
  destinationDetails?: WithdrawalDestinationDetails;
  destination: string;

  // Uploaded Documents & Bank Proofs
  proofImage?: string;
  documents?: WithdrawalDocument[];

  // Processing & Audit details
  notes?: string;
  adminNotes?: string;
  rejectionReason?: string;
  status: 'pending' | 'under_review' | 'processing' | 'approved' | 'completed' | 'rejected';
  processedBy?: string;
  processedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  txHash?: string;
  createdAt: string;
  updatedAt?: string;
}

export const formatVolume = (vol: number): string => {
  if (isNaN(vol) || vol === undefined || vol === null || vol <= 0) return '$0.00M';
  if (vol >= 1_000_000_000) {
    return `$${(vol / 1_000_000_000).toFixed(2)}B`;
  }
  if (vol >= 1_000_000) {
    return `$${(vol / 1_000_000).toFixed(2)}M`;
  }
  if (vol >= 1_000) {
    return `$${(vol / 1_000).toFixed(1)}K`;
  }
  return `$${vol.toFixed(2)}`;
};

export type RealtimeEventType =
  | 'DEPOSIT_SUBMITTED'
  | 'WITHDRAWAL_SUBMITTED'
  | 'DEPOSIT_APPROVED'
  | 'DEPOSIT_REJECTED'
  | 'WITHDRAWAL_APPROVED'
  | 'WITHDRAWAL_REJECTED'
  | 'SUPPORT_MESSAGE_RECEIVED'
  | 'TRANSACTION_EVENT';

export interface RealtimeEventPayload {
  eventId: string;
  type: RealtimeEventType | string;
  transactionId?: string;
  depositRequestId?: string;
  withdrawalRequestId?: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  amount?: number;
  currency?: string;
  status?: string;
  title: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}



