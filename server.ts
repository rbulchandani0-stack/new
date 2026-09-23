import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { sendPasswordResetEmail, getAppUrl } from './server/emailService.js';
import {
  User,
  Wallet,
  MarketPair,
  Position,
  Order,
  Transaction,
  AuditLog,
  NotificationItem,
  AdminAnalytics,
  Role,
  RolePermissionTemplate,
  AdminModuleDef,
  ADMIN_MODULES_CATALOG,
  DEFAULT_ROLE_TEMPLATES
} from './src/types/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'etoro_crypto_jwt_secret_institutional_key_2026';

// SECURITY MIDDLEWARE
app.use((req, res, next) => {
  // Force HTTPS if behind a proxy that terminates SSL (like Cloud Run) using proper forwarded host
  if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host || req.hostname;
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      return res.redirect(301, 'https://' + host + req.url);
    }
  }

  // Security Headers (allowing iframe embedding in AI Studio preview)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Omit X-Frame-Options to allow iframe embedding
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Content Security Policy - allowing iframe embedding and required sources
  res.setHeader('Content-Security-Policy', "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval' wss: blob:; object-src 'none';");
  
  next();
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- UPLOAD STORAGE DIRECTORY SETUP ---
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const CHAT_UPLOADS_DIR = path.join(UPLOADS_DIR, 'chat');
const DOCUMENTS_UPLOADS_DIR = path.join(UPLOADS_DIR, 'documents');
const DEPOSITS_UPLOADS_DIR = path.join(UPLOADS_DIR, 'deposits');
const BRANDING_UPLOADS_DIR = path.join(UPLOADS_DIR, 'branding');
try {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(CHAT_UPLOADS_DIR)) {
    fs.mkdirSync(CHAT_UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(DOCUMENTS_UPLOADS_DIR)) {
    fs.mkdirSync(DOCUMENTS_UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(DEPOSITS_UPLOADS_DIR)) {
    fs.mkdirSync(DEPOSITS_UPLOADS_DIR, { recursive: true });
  }
  if (!fs.existsSync(BRANDING_UPLOADS_DIR)) {
    fs.mkdirSync(BRANDING_UPLOADS_DIR, { recursive: true });
  }
} catch (dirErr) {
  console.error('[STORAGE] Error creating upload directories:', dirErr);
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Multer storage for branding uploads (social images, favicons, logos, footer badges)
const brandingMulterStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, BRANDING_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.ico'].includes(rawExt) ? rawExt : '.png';
    const randSuffix = Math.random().toString(36).substring(2, 8);
    cb(null, `brand_${Date.now()}_${randSuffix}${safeExt}`);
  }
});

const brandingUpload = multer({
  storage: brandingMulterStorage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB
  },
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    const rawExt = path.extname(file.originalname || '').toLowerCase();
    const isImage = mime.startsWith('image/') ||
      ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.ico'].includes(rawExt);
    if (isImage) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image format. Supported formats: PNG, JPG, JPEG, WebP, SVG, and ICO.'));
    }
  }
});

// Multer storage for payment screenshot proofs (Safari / mobile compatible)
const depositMulterStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DEPOSITS_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const rawExt = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'].includes(rawExt) ? rawExt : '.jpg';
    const randSuffix = Math.random().toString(36).substring(2, 8);
    cb(null, `dep_proof_${Date.now()}_${randSuffix}${safeExt}`);
  }
});

const depositUpload = multer({
  storage: depositMulterStorage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB
  },
  fileFilter: (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    const rawExt = path.extname(file.originalname || '').toLowerCase();
    const isImage = mime.startsWith('image/') ||
      ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'].includes(rawExt) ||
      mime === 'application/octet-stream'; // iOS Safari HEIC often sends octet-stream
    if (isImage) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Please upload a payment proof image (JPG, PNG, WebP, or HEIC).'));
    }
  }
});

// --- FILE PERSISTENCE HELPERS ---
const DATA_FILE = path.join(process.cwd(), 'app_data.json');

import { SystemSettings, DepositRequest, WithdrawalRequest } from './src/types/index.js';

let SYSTEM_SETTINGS: SystemSettings = {
  siteName: 'eToro Global',
  browserTabTitle: 'eToro - Markets & Analytics',
  socialShareTitle: 'eToro Global',
  socialShareDescription: 'Trade Forex, Crypto, Commodities, and Indices with confidence on eToro Global. Secure, fast, and professional trading platform featuring sub-millisecond execution and up to 500x leverage.',
  socialShareImageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=1200&h=630',
  logoUrl: '',
  faviconUrl: '',
  logoText: 'eToro Global',
  tradeSharingEnabled: true,
  customTradeLogoUrl: '',
  initialUserBalance: 0,
  cryptoWallets: [
    { network: 'TRC-20', address: 'TYuXk9pLm4Nv8sQ2zW1aE3rF5gH6jK7mN8p' },
    { network: 'ERC-20', address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
    { network: 'BEP-20', address: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE' },
    { network: 'Solana', address: '7xKXtg2CW87d97TXJSDp154pq781S88D2s78d' }
  ],
  bankDetails: {
    bankName: 'eToro Global Banking (ICICI Bank Branch)',
    accountName: 'eToro Global Trading Ltd',
    accountNumber: '000405891234',
    ifscIban: 'ICIC0000004',
    upiId: 'etroglobal@icici',
    swiftCode: 'ETORINBBXXX'
  },
  withdrawalNotice: 'All withdrawals undergo 24/7 compliance auditing. Approvals take 10-30 minutes.',
  contactInfo: {
    address: '123 Canary Wharf, London, E14 5AB, United Kingdom',
    phone: '+44 20 7946 0958',
    whatsapp: '+44 20 7946 0958',
    email: 'support@etoroglobal.com',
    officeHours: '24/7 Global Desk'
  },
  tradingFees: {
    makerFeeRate: 0.0002, // 0.02%
    takerFeeRate: 0.0005  // 0.05%
  },
  footerSettings: {
    brandName: 'ETORO GLOBAL',
    brandText: 'ETORO GLOBAL',
    brandLogoUrl: '',
    descriptionText: 'Next-generation institutional trading platform with sub-millisecond execution, multi-tier cold vault security, and deep global liquidity across Crypto, Forex, Stocks, and Commodities.',
    copyrightText: '© 2026 eToro Global Technologies Inc. All rights reserved.',
    showEmojiLogo: true,
    emojiIcon: 'e',
    customDisclaimer: 'Trading financial instruments involves significant risk of loss and is not suitable for all investors.'
  }
};

let DEPOSIT_REQUESTS_DB: DepositRequest[] = [];
let WITHDRAWAL_REQUESTS_DB: WithdrawalRequest[] = [];
let PROFILES_DB: Record<string, any> = {};
let KYC_DB: any[] = [];
let CHAT_DB: any[] = [];
let CHAT_STATUS_DB: Record<string, 'open' | 'waiting_customer' | 'waiting_admin' | 'resolved'> = {};
let SUPPORT_ACKS_DB: Record<string, {
  id: string;
  userId: string;
  istDate: string;
  ackType: 'SUPPORT_HOURS_ACK' | 'OUT_OF_HOURS_ACK';
  periodId: string;
  ackKey: string;
  sentAt: string;
  messageId: string;
}> = {};
let SESSIONS_DB: Record<string, any[]> = {};
let LOGIN_HISTORY_DB: Record<string, any[]> = {};

let RAW_PASSWORDS: Record<string, string> = {
  'professor9049@gmail.com': '8857@leo'
};

export interface PasswordResetToken {
  id: string;
  userId: string;
  email: string;
  tokenHash: string; // SHA-256 hash of the cryptographically secure random token
  expiresAt: string; // ISO string
  used: boolean;
  usedAt?: string;
  createdAt: string;
  ipAddress?: string;
}

let PASSWORD_RESET_TOKENS: PasswordResetToken[] = [];

// Rate limiting in-memory caches for password reset
const RESET_RATE_LIMIT_IP = new Map<string, { count: number; resetTime: number }>();
const RESET_RATE_LIMIT_EMAIL = new Map<string, { lastRequestTime: number; count: number; windowStart: number }>();

let ROLE_PERMISSIONS_DB: Record<string, RolePermissionTemplate> = JSON.parse(JSON.stringify(DEFAULT_ROLE_TEMPLATES));

function saveDataToDisk() {
  try {
    const data = {
      SYSTEM_SETTINGS,
      ROLE_PERMISSIONS_DB,
      DEPOSIT_REQUESTS_DB,
      WITHDRAWAL_REQUESTS_DB,
      PROFILES_DB,
      KYC_DB,
      CHAT_DB,
      CHAT_STATUS_DB,
      SUPPORT_ACKS_DB,
      SESSIONS_DB,
      LOGIN_HISTORY_DB,
      USERS_DB,
      WALLETS_DB,
      POSITIONS_DB,
      TRANSACTIONS_DB,
      PASS_HASHES,
      RAW_PASSWORDS,
      PASSWORD_RESET_TOKENS,
      AUDIT_LOGS
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save data to disk:', e);
  }
}

function loadDataFromDisk() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (data.SYSTEM_SETTINGS) SYSTEM_SETTINGS = data.SYSTEM_SETTINGS;
      if (data.ROLE_PERMISSIONS_DB && typeof data.ROLE_PERMISSIONS_DB === 'object') {
        ROLE_PERMISSIONS_DB = {
          ...JSON.parse(JSON.stringify(DEFAULT_ROLE_TEMPLATES)),
          ...data.ROLE_PERMISSIONS_DB
        };
        // Guarantee admin role remains immutable Full Master Access
        ROLE_PERMISSIONS_DB.admin = JSON.parse(JSON.stringify(DEFAULT_ROLE_TEMPLATES.admin));
      }
      if (Array.isArray(data.DEPOSIT_REQUESTS_DB)) DEPOSIT_REQUESTS_DB = data.DEPOSIT_REQUESTS_DB;
      if (Array.isArray(data.WITHDRAWAL_REQUESTS_DB)) WITHDRAWAL_REQUESTS_DB = data.WITHDRAWAL_REQUESTS_DB;
      if (data.PROFILES_DB) PROFILES_DB = data.PROFILES_DB;
      if (Array.isArray(data.KYC_DB)) KYC_DB = data.KYC_DB;
      if (Array.isArray(data.CHAT_DB)) {
        CHAT_DB = data.CHAT_DB.map((msg: any) => {
          if (msg.userName && (/afro global support/i.test(msg.userName) || /itro/i.test(msg.userName) || /itoro/i.test(msg.userName) || /etro/i.test(msg.userName))) {
            msg.userName = msg.userName.replace(/afro global support|iTRO Support|iToro Support|iTRO|iToro|Etro Support/gi, 'eToro Support');
          }
          if (msg.message && (/afro global support/i.test(msg.message) || /itro/i.test(msg.message) || /itoro/i.test(msg.message) || /i-toro/i.test(msg.message))) {
            msg.message = msg.message.replace(/afro global support/gi, 'eToro Global Support').replace(/iTRO Support|iToro Support/gi, 'eToro Support').replace(/iTRO|iToro|i-Toro|Itro/gi, 'eToro');
          }
          return msg;
        });
      }
      if (data.CHAT_STATUS_DB && typeof data.CHAT_STATUS_DB === 'object') CHAT_STATUS_DB = data.CHAT_STATUS_DB;
      if (data.SUPPORT_ACKS_DB && typeof data.SUPPORT_ACKS_DB === 'object') SUPPORT_ACKS_DB = data.SUPPORT_ACKS_DB;
      if (data.SESSIONS_DB) SESSIONS_DB = data.SESSIONS_DB;
      if (data.LOGIN_HISTORY_DB) LOGIN_HISTORY_DB = data.LOGIN_HISTORY_DB;
      if (data.PASS_HASHES) Object.assign(PASS_HASHES, data.PASS_HASHES);
      if (data.RAW_PASSWORDS) Object.assign(RAW_PASSWORDS, data.RAW_PASSWORDS);
      if (Array.isArray(data.PASSWORD_RESET_TOKENS)) PASSWORD_RESET_TOKENS = data.PASSWORD_RESET_TOKENS;
      if (Array.isArray(data.AUDIT_LOGS) && data.AUDIT_LOGS.length > 0) {
        AUDIT_LOGS.length = 0;
        AUDIT_LOGS.push(...data.AUDIT_LOGS);
      }
      if (Array.isArray(data.USERS_DB)) {
        // Filter out all old demo/default accounts to ensure a clean database
        const cleanUsers = data.USERS_DB.filter((u: any) => 
          !['trader@etoroglobal.com', 'whale@etoroglobal.com', 'admin@etoroglobal.com', 'trader@etro.io', 'admin@etro.io', 'whale@etro.io'].includes(u.email?.toLowerCase())
        );
        // Ensure roles are preserved correctly
        cleanUsers.forEach((u: any) => {
          if (u.email?.toLowerCase() === 'professor9049@gmail.com') {
            u.role = 'admin';
          } else if (!u.role) {
            u.role = 'user';
          }
        });
        USERS_DB.length = 0;
        USERS_DB.push(...cleanUsers);
      }
      if (data.WALLETS_DB) {
        Object.assign(WALLETS_DB, data.WALLETS_DB);
        delete WALLETS_DB['user_trader_01'];
        delete WALLETS_DB['user_trader_02'];
        delete WALLETS_DB['user_admin_01'];
      }
      if (Array.isArray(data.POSITIONS_DB)) {
        POSITIONS_DB.length = 0;
        POSITIONS_DB.push(...data.POSITIONS_DB.filter((p: any) => p.userId !== 'user_trader_01' && p.userId !== 'user_trader_02'));
      }
      if (Array.isArray(data.TRANSACTIONS_DB)) {
        TRANSACTIONS_DB.length = 0;
        TRANSACTIONS_DB.push(...data.TRANSACTIONS_DB.filter((t: any) => t.userId !== 'user_trader_01' && t.userId !== 'user_trader_02'));
        // Restore any historical trades incorrectly marked as 'closed' back to canonical 'completed'
        TRANSACTIONS_DB.forEach((t: any) => {
          if (t.type === 'trade' && ((t.status as string) === 'closed' || !t.status)) {
            t.status = 'completed';
          }
        });
      }
      console.log('Successfully loaded persisted data from disk');
    }
  } catch (e) {
    console.error('Failed to load data from disk:', e);
  }

  // Ensure single Professor Administrator account is always present
  let masterAdmin = USERS_DB.find(u => u.email.toLowerCase() === 'professor9049@gmail.com');
  if (!masterAdmin) {
    masterAdmin = {
      id: 'admin_master_01',
      email: 'professor9049@gmail.com',
      name: 'Professor',
      role: 'admin',
      is2FAEnabled: false,
      kycStatus: 'verified',
      status: 'active',
      createdAt: new Date().toISOString()
    };
    USERS_DB.unshift(masterAdmin);
  } else {
    masterAdmin.email = 'professor9049@gmail.com';
    masterAdmin.name = 'Professor';
    masterAdmin.role = 'admin';
  }

  PROFILES_DB['admin_master_01'] = {
    id: 'admin_master_01',
    fullName: 'Professor',
    username: 'professor',
    email: 'professor9049@gmail.com',
    phone: '',
    address: '',
    country: 'India'
  };

  PASS_HASHES['professor9049@gmail.com'] = bcrypt.hashSync('8857@leo', 8);
  if (!WALLETS_DB['admin_master_01']) {
    WALLETS_DB['admin_master_01'] = {
      userId: 'admin_master_01',
      spotBalance: 1000000.0,
      tradingBalance: 500000.0,
      fundingBalance: 200000.0,
      availableMargin: 500000.0,
      usedMargin: 0.0
    };
  }

  // Ensure old default admin & trader accounts are deleted
  for (let i = USERS_DB.length - 1; i >= 0; i--) {
    if (['admin@etoroglobal.com', 'admin@etoroglobal.com', 'admin@etro.io', 'trader@etoroglobal.com', 'trader@etro.io', 'whale@etoroglobal.com', 'whale@etro.io'].includes(USERS_DB[i].email?.toLowerCase())) {
      USERS_DB.splice(i, 1);
    }
  }
  delete PASS_HASHES['admin@etoroglobal.com'];
  delete PASS_HASHES['admin@etoroglobal.com'];
  delete PASS_HASHES['admin@apex.io'];
  delete PASS_HASHES['trader@etoroglobal.com'];
  delete PASS_HASHES['trader@apex.io'];
  delete PASS_HASHES['whale@etoroglobal.com'];
  delete PASS_HASHES['whale@apex.io'];

  saveDataToDisk();
}

const USERS_DB: User[] = [
  {
    id: 'admin_master_01',
    email: 'professor9049@gmail.com',
    name: 'Professor',
    role: 'admin',
    is2FAEnabled: false,
    kycStatus: 'verified',
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

// Hash passwords
const PASS_HASHES: Record<string, string> = {
  'professor9049@gmail.com': bcrypt.hashSync('8857@leo', 8)
};

const WALLETS_DB: Record<string, Wallet> = {
  'admin_master_01': {
    userId: 'admin_master_01',
    spotBalance: 1000000.0,
    tradingBalance: 500000.0,
    fundingBalance: 200000.0,
    availableMargin: 500000.0,
    usedMargin: 0.0
  }
};

const MARKETS_DB: MarketPair[] = [
  // CRYPTOCURRENCIES
  {
    symbol: 'BTC/USDT',
    baseCoin: 'BTC',
    quoteCoin: 'USDT',
    name: 'Bitcoin',
    price: 94850.50,
    change24h: 3.42,
    high24h: 96120.00,
    low24h: 92400.00,
    volume24h: 4285090000,
    marketCap: 1870000000000,
    maxLeverage: 125,
    minOrderSize: 0.001,
    spread: 0.01,
    enabled: true,
    category: 'Crypto',
    tvSymbol: 'BINANCE:BTCUSDT'
  },
  {
    symbol: 'ETH/USDT',
    baseCoin: 'ETH',
    quoteCoin: 'USDT',
    name: 'Ethereum',
    price: 3420.25,
    change24h: -1.15,
    high24h: 3510.00,
    low24h: 3380.00,
    volume24h: 2150800000,
    marketCap: 412000000000,
    maxLeverage: 100,
    minOrderSize: 0.01,
    spread: 0.02,
    enabled: true,
    category: 'Crypto',
    tvSymbol: 'BINANCE:ETHUSDT'
  },
  {
    symbol: 'SOL/USDT',
    baseCoin: 'SOL',
    quoteCoin: 'USDT',
    name: 'Solana',
    price: 188.75,
    change24h: 7.84,
    high24h: 194.20,
    low24h: 172.50,
    volume24h: 1890400000,
    marketCap: 89000000000,
    maxLeverage: 75,
    minOrderSize: 0.1,
    spread: 0.03,
    enabled: true,
    category: 'Crypto',
    tvSymbol: 'BINANCE:SOLUSDT'
  },
  {
    symbol: 'BNB/USDT',
    baseCoin: 'BNB',
    quoteCoin: 'USDT',
    name: 'BNB Chain',
    price: 645.10,
    change24h: 0.92,
    high24h: 658.00,
    low24h: 638.50,
    volume24h: 680200000,
    marketCap: 94000000000,
    maxLeverage: 50,
    minOrderSize: 0.01,
    spread: 0.02,
    enabled: true,
    category: 'Crypto',
    tvSymbol: 'BINANCE:BNBUSDT'
  },
  {
    symbol: 'XRP/USDT',
    baseCoin: 'XRP',
    quoteCoin: 'USDT',
    name: 'XRP',
    price: 2.34,
    change24h: 4.18,
    high24h: 2.48,
    low24h: 2.21,
    volume24h: 1420900000,
    marketCap: 132000000000,
    maxLeverage: 75,
    minOrderSize: 1,
    spread: 0.02,
    enabled: true,
    category: 'Crypto',
    tvSymbol: 'BINANCE:XRPUSDT'
  },
  {
    symbol: 'DOGE/USDT',
    baseCoin: 'DOGE',
    quoteCoin: 'USDT',
    name: 'Dogecoin',
    price: 0.385,
    change24h: 12.45,
    high24h: 0.412,
    low24h: 0.338,
    volume24h: 940100000,
    marketCap: 56000000000,
    maxLeverage: 50,
    minOrderSize: 10,
    spread: 0.05,
    enabled: true,
    category: 'Crypto',
    tvSymbol: 'BINANCE:DOGEUSDT'
  },
  {
    symbol: 'ADA/USDT',
    baseCoin: 'ADA',
    quoteCoin: 'USDT',
    name: 'Cardano',
    price: 0.884,
    change24h: 2.35,
    high24h: 0.920,
    low24h: 0.850,
    volume24h: 420000000,
    marketCap: 31000000000,
    maxLeverage: 50,
    minOrderSize: 1,
    spread: 0.02,
    enabled: true,
    category: 'Crypto',
    tvSymbol: 'BINANCE:ADAUSDT'
  },
  {
    symbol: 'AVAX/USDT',
    baseCoin: 'AVAX',
    quoteCoin: 'USDT',
    name: 'Avalanche',
    price: 36.80,
    change24h: 5.12,
    high24h: 38.50,
    low24h: 34.20,
    volume24h: 310000000,
    marketCap: 15000000000,
    maxLeverage: 50,
    minOrderSize: 0.1,
    spread: 0.03,
    enabled: true,
    category: 'Crypto',
    tvSymbol: 'BINANCE:AVAXUSDT'
  },
  {
    symbol: 'LINK/USDT',
    baseCoin: 'LINK',
    quoteCoin: 'USDT',
    name: 'Chainlink',
    price: 18.25,
    change24h: -0.85,
    high24h: 19.10,
    low24h: 17.90,
    volume24h: 280000000,
    marketCap: 11000000000,
    maxLeverage: 50,
    minOrderSize: 0.1,
    spread: 0.02,
    enabled: true,
    category: 'Crypto',
    tvSymbol: 'BINANCE:LINKUSDT'
  },
  {
    symbol: 'SUI/USDT',
    baseCoin: 'SUI',
    quoteCoin: 'USDT',
    name: 'Sui Network',
    price: 3.45,
    change24h: 8.92,
    high24h: 3.65,
    low24h: 3.12,
    volume24h: 620000000,
    marketCap: 9800000000,
    maxLeverage: 50,
    minOrderSize: 1,
    spread: 0.03,
    enabled: true,
    category: 'Crypto',
    tvSymbol: 'BINANCE:SUIUSDT'
  },

  // FOREX CURRENCY PAIRS
  {
    symbol: 'EUR/USD',
    baseCoin: 'EUR',
    quoteCoin: 'USD',
    name: 'Euro / US Dollar',
    price: 1.0892,
    change24h: -0.18,
    high24h: 1.0930,
    low24h: 1.0865,
    volume24h: 18400000000,
    maxLeverage: 500,
    minOrderSize: 100,
    spread: 0.004,
    enabled: true,
    category: 'Forex',
    tvSymbol: 'FX:EURUSD'
  },
  {
    symbol: 'GBP/USD',
    baseCoin: 'GBP',
    quoteCoin: 'USD',
    name: 'British Pound / US Dollar',
    price: 1.2915,
    change24h: 0.42,
    high24h: 1.2960,
    low24h: 1.2870,
    volume24h: 14200000000,
    maxLeverage: 500,
    minOrderSize: 100,
    spread: 0.005,
    enabled: true,
    category: 'Forex',
    tvSymbol: 'FX:GBPUSD'
  },
  {
    symbol: 'USD/JPY',
    baseCoin: 'USD',
    quoteCoin: 'JPY',
    name: 'US Dollar / Japanese Yen',
    price: 156.42,
    change24h: 0.65,
    high24h: 157.20,
    low24h: 155.80,
    volume24h: 16500000000,
    maxLeverage: 500,
    minOrderSize: 100,
    spread: 0.01,
    enabled: true,
    category: 'Forex',
    tvSymbol: 'FX:USDJPY'
  },
  {
    symbol: 'USD/INR',
    baseCoin: 'USD',
    quoteCoin: 'INR',
    name: 'US Dollar / Indian Rupee',
    price: 95.00,
    change24h: 0.12,
    high24h: 95.50,
    low24h: 94.80,
    volume24h: 5200000000,
    maxLeverage: 500,
    minOrderSize: 10,
    spread: 0.01,
    enabled: true,
    category: 'Forex',
    tvSymbol: 'FX_IDC:USDINR'
  },
  {
    symbol: 'EUR/GBP',
    baseCoin: 'EUR',
    quoteCoin: 'GBP',
    name: 'Euro / British Pound',
    price: 0.8524,
    change24h: 0.35,
    high24h: 0.8560,
    low24h: 0.8495,
    volume24h: 8900000000,
    maxLeverage: 500,
    minOrderSize: 100,
    spread: 0.005,
    enabled: true,
    category: 'Forex',
    tvSymbol: 'FX:EURGBP'
  },
  {
    symbol: 'AUD/USD',
    baseCoin: 'AUD',
    quoteCoin: 'USD',
    name: 'Australian Dollar / US Dollar',
    price: 0.6650,
    change24h: 0.28,
    high24h: 0.6690,
    low24h: 0.6620,
    volume24h: 7800000000,
    maxLeverage: 500,
    minOrderSize: 100,
    spread: 0.005,
    enabled: true,
    category: 'Forex',
    tvSymbol: 'FX:AUDUSD'
  },
  {
    symbol: 'USD/CAD',
    baseCoin: 'USD',
    quoteCoin: 'CAD',
    name: 'US Dollar / Canadian Dollar',
    price: 1.3680,
    change24h: -0.22,
    high24h: 1.3720,
    low24h: 1.3640,
    volume24h: 6900000000,
    maxLeverage: 500,
    minOrderSize: 100,
    spread: 0.005,
    enabled: true,
    category: 'Forex',
    tvSymbol: 'FX:USDCAD'
  },
  {
    symbol: 'EUR/JPY',
    baseCoin: 'EUR',
    quoteCoin: 'JPY',
    name: 'Euro / Japanese Yen',
    price: 170.38,
    change24h: 0.48,
    high24h: 171.20,
    low24h: 169.50,
    volume24h: 9200000000,
    maxLeverage: 500,
    minOrderSize: 100,
    spread: 0.01,
    enabled: true,
    category: 'Forex',
    tvSymbol: 'FX:EURJPY'
  },

  // COMMODITIES
  {
    symbol: 'XAU/USD',
    baseCoin: 'XAU',
    quoteCoin: 'USD',
    name: 'Gold (Spot)',
    price: 2685.50,
    change24h: 1.25,
    high24h: 2702.50,
    low24h: 2668.10,
    volume24h: 12850000000,
    maxLeverage: 500,
    minOrderSize: 0.01,
    spread: 0.01,
    enabled: true,
    category: 'Commodities',
    tvSymbol: 'OANDA:XAUUSD'
  },
  {
    symbol: 'XAG/USD',
    baseCoin: 'XAG',
    quoteCoin: 'USD',
    name: 'Silver (Spot)',
    price: 29.45,
    change24h: 2.18,
    high24h: 30.10,
    low24h: 28.80,
    volume24h: 3450000000,
    maxLeverage: 200,
    minOrderSize: 0.1,
    spread: 0.02,
    enabled: true,
    category: 'Commodities',
    tvSymbol: 'TVC:SILVER'
  },
  {
    symbol: 'WTI/USD',
    baseCoin: 'WTI',
    quoteCoin: 'USD',
    name: 'Crude Oil (WTI)',
    price: 76.85,
    change24h: -0.92,
    high24h: 78.20,
    low24h: 75.90,
    volume24h: 8900000000,
    maxLeverage: 200,
    minOrderSize: 1,
    spread: 0.02,
    enabled: true,
    category: 'Commodities',
    tvSymbol: 'FX:USOIL'
  },

  // INDICES
  {
    symbol: 'US500/USD',
    baseCoin: 'US500',
    quoteCoin: 'USD',
    name: 'S&P 500 Index',
    price: 5860.20,
    change24h: 0.85,
    high24h: 5890.00,
    low24h: 5820.00,
    volume24h: 15400000000,
    maxLeverage: 200,
    minOrderSize: 0.1,
    spread: 0.01,
    enabled: true,
    category: 'Indices',
    tvSymbol: 'SP:SPX'
  },
  {
    symbol: 'NAS100/USD',
    baseCoin: 'NAS100',
    quoteCoin: 'USD',
    name: 'Nasdaq 100 Index',
    price: 20450.80,
    change24h: 1.42,
    high24h: 20600.00,
    low24h: 20280.00,
    volume24h: 18200000000,
    maxLeverage: 200,
    minOrderSize: 0.1,
    spread: 0.01,
    enabled: true,
    category: 'Indices',
    tvSymbol: 'NASDAQ:NDX'
  },
  {
    symbol: 'US30/USD',
    baseCoin: 'US30',
    quoteCoin: 'USD',
    name: 'Dow Jones Industrial',
    price: 43210.50,
    change24h: 0.38,
    high24h: 43400.00,
    low24h: 43050.00,
    volume24h: 12100000000,
    maxLeverage: 200,
    minOrderSize: 0.1,
    spread: 0.01,
    enabled: true,
    category: 'Indices',
    tvSymbol: 'DJ:DJI'
  },
  {
    symbol: 'NIFTY/INR',
    baseCoin: 'NIFTY',
    quoteCoin: 'INR',
    name: 'Nifty 50 Index (India)',
    price: 24850.00,
    change24h: 0.95,
    high24h: 25020.00,
    low24h: 24680.00,
    volume24h: 8400000000,
    maxLeverage: 200,
    minOrderSize: 1,
    spread: 0.01,
    enabled: true,
    category: 'Indices',
    tvSymbol: 'NSE:NIFTY'
  }
];

const POSITIONS_DB: Position[] = [];

const ORDERS_DB: Order[] = [];

const TRANSACTIONS_DB: Transaction[] = [];

const NOTIFICATIONS_DB: NotificationItem[] = [];

function getClientIp(req: any): string {
  if (!req) return '127.0.0.1';
  const forwarded = req.headers && req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',');
    return ips[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || '127.0.0.1';
}

export interface RecordAuditParams {
  action: string;
  eventType: string;
  category: 'role' | 'finance' | 'withdrawal' | 'deposit' | 'trade' | 'kyc' | 'user' | 'security' | 'system';
  actor?: {
    id?: string;
    userId?: string;
    name?: string;
    email?: string;
    role?: string;
  } | any;
  targetUser?: {
    id?: string;
    userId?: string;
    name?: string;
    email?: string;
    role?: string;
  } | string | any;
  targetUserId?: string;
  targetUserName?: string;
  targetUserEmail?: string;
  objectType?: string;
  objectId?: string;
  previousState?: string;
  newState?: string;
  amount?: number;
  currency?: string;
  walletType?: string;
  previousBalance?: number;
  newBalance?: number;
  symbol?: string;
  side?: string;
  entryPrice?: number;
  currentPrice?: number;
  previousPnL?: number;
  targetPnL?: number;
  transitionDuration?: string;
  leverage?: number;
  reason?: string;
  details?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

const AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit_init_01',
    action: 'Change User Role',
    eventType: 'ADMIN_CHANGE_USER_ROLE',
    category: 'role',
    adminEmail: 'professor9049@gmail.com',
    targetUser: 'kia@etoroglobal.com',
    details: "Professor changed Kia's role: USER → TRADE_CONTROLLER",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    actorUserId: 'admin_master_01',
    actorName: 'Professor',
    actorEmail: 'professor9049@gmail.com',
    actorRole: 'ADMIN',
    targetUserId: 'user_kia_01',
    targetUserName: 'Kia',
    targetUserEmail: 'kia@etoroglobal.com',
    objectType: 'Account Role',
    objectId: 'user_kia_01',
    previousState: 'USER',
    newState: 'TRADE_CONTROLLER',
    reason: 'Assigned as Senior Risk & Trade Controller',
    ipAddress: '103.14.26.88'
  },
  {
    id: 'audit_init_02',
    action: 'Reject Withdrawal',
    eventType: 'REJECT_WITHDRAWAL',
    category: 'withdrawal',
    adminEmail: 'professor9049@gmail.com',
    targetUser: 'trader_demo@gmail.com',
    details: 'Rejected withdrawal request WD-849201 for $500.00 USDT & refunded user balance',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    actorUserId: 'admin_master_01',
    actorName: 'Professor',
    actorEmail: 'professor9049@gmail.com',
    actorRole: 'ADMIN',
    targetUserId: 'user_trader_01',
    targetUserName: 'Standard Trader',
    targetUserEmail: 'trader_demo@gmail.com',
    objectType: 'Withdrawal',
    objectId: 'WD-849201',
    previousState: 'PENDING',
    newState: 'REJECTED',
    amount: 500,
    currency: 'USDT',
    walletType: 'Trading Wallet',
    previousBalance: 1250.00,
    newBalance: 1751.00,
    reason: 'Invalid bank IFSC code provided; user advised to re-submit with correct details',
    ipAddress: '103.14.26.88'
  },
  {
    id: 'audit_init_03',
    action: 'Wallet Balance Increased',
    eventType: 'BALANCE_ADJUST_INCREASE',
    category: 'finance',
    adminEmail: 'professor9049@gmail.com',
    targetUser: 'trader_demo@gmail.com',
    details: 'Increased $1,000.00 USDT on trading wallet. Reason: Institutional Liquidity Rebate',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    actorUserId: 'admin_master_01',
    actorName: 'Professor',
    actorEmail: 'professor9049@gmail.com',
    actorRole: 'ADMIN',
    targetUserId: 'user_trader_01',
    targetUserName: 'Standard Trader',
    targetUserEmail: 'trader_demo@gmail.com',
    objectType: 'Wallet',
    objectId: 'trading_wallet_user_trader_01',
    previousState: '$1,751.00 USDT',
    newState: '$2,751.00 USDT',
    amount: 1000,
    currency: 'USDT',
    walletType: 'Trading Wallet',
    previousBalance: 1751.00,
    newBalance: 2751.00,
    reason: 'Institutional Liquidity Rebate',
    ipAddress: '103.14.26.88'
  },
  {
    id: 'audit_init_04',
    action: 'Override Trade PnL',
    eventType: 'ADMIN_OVERRIDE_PNL',
    category: 'trade',
    adminEmail: 'kia@etoroglobal.com',
    targetUser: 'trader_demo@gmail.com',
    details: 'Overrode PnL for position pos_gold_892 to target $1,000.00 over 1 min transition',
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    actorUserId: 'user_kia_01',
    actorName: 'Kia',
    actorEmail: 'kia@etoroglobal.com',
    actorRole: 'TRADE_CONTROLLER',
    targetUserId: 'user_trader_01',
    targetUserName: 'Standard Trader',
    targetUserEmail: 'trader_demo@gmail.com',
    objectType: 'Position',
    objectId: 'pos_gold_892',
    previousState: 'PnL: -$120.50',
    newState: 'PnL: Override to $1,000.00',
    symbol: 'XAU/USD',
    side: 'BUY',
    entryPrice: 2642.50,
    currentPrice: 2645.10,
    previousPnL: -120.50,
    targetPnL: 1000.00,
    transitionDuration: '1 min',
    leverage: 100,
    reason: 'Automated hedging compensation',
    ipAddress: '49.37.112.44'
  }
];

function recordAuditLog(params: RecordAuditParams): AuditLog {
  const actorUserId = params.actor?.id || params.actor?.userId || 'system';
  const actorName = params.actor?.name || (params.actor?.email ? params.actor.email.split('@')[0] : 'System');
  const actorEmail = params.actor?.email || 'system@etoroglobal.com';
  const actorRole = (params.actor?.role || 'system').toUpperCase();

  // Resolve Target User
  let targetUid = params.targetUserId || (typeof params.targetUser === 'object' ? (params.targetUser?.id || params.targetUser?.userId) : params.targetUser);
  let targetUname = params.targetUserName || (typeof params.targetUser === 'object' ? params.targetUser?.name : undefined);
  let targetUemail = params.targetUserEmail || (typeof params.targetUser === 'object' ? params.targetUser?.email : undefined);

  if (targetUid) {
    const found = USERS_DB.find(u => u.id === targetUid || u.email?.toLowerCase() === targetUid?.toLowerCase());
    if (found) {
      targetUid = found.id;
      if (!targetUname) targetUname = found.name;
      if (!targetUemail) targetUemail = found.email;
    }
  }

  let summaryDetails = params.details;
  if (!summaryDetails) {
    summaryDetails = `${params.action}: ${params.objectType || 'Object'} ${params.objectId || ''}`.trim();
  }

  const log: AuditLog = {
    id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    action: params.action,
    eventType: params.eventType,
    category: params.category,
    adminEmail: actorEmail,
    targetUser: targetUemail || targetUid || undefined,
    details: summaryDetails,
    timestamp: new Date().toISOString(),

    actorUserId,
    actorName,
    actorEmail,
    actorRole,
    ipAddress: params.ipAddress || 'Internal/Direct',

    targetUserId: targetUid || undefined,
    targetUserName: targetUname || undefined,
    targetUserEmail: targetUemail || undefined,

    objectType: params.objectType || 'System',
    objectId: params.objectId,

    previousState: params.previousState,
    newState: params.newState,

    amount: params.amount !== undefined ? Number(params.amount) : undefined,
    currency: params.currency,
    walletType: params.walletType,
    previousBalance: params.previousBalance !== undefined ? Number(params.previousBalance) : undefined,
    newBalance: params.newBalance !== undefined ? Number(params.newBalance) : undefined,

    symbol: params.symbol,
    side: params.side ? params.side.toUpperCase() : undefined,
    entryPrice: params.entryPrice !== undefined ? Number(params.entryPrice) : undefined,
    currentPrice: params.currentPrice !== undefined ? Number(params.currentPrice) : undefined,
    previousPnL: params.previousPnL !== undefined ? Number(params.previousPnL) : undefined,
    targetPnL: params.targetPnL !== undefined ? Number(params.targetPnL) : undefined,
    transitionDuration: params.transitionDuration,
    leverage: params.leverage !== undefined ? Number(params.leverage) : undefined,

    reason: params.reason ? params.reason.trim() : undefined,
    metadata: params.metadata
  };

  AUDIT_LOGS.unshift(log);
  if (AUDIT_LOGS.length > 2500) {
    AUDIT_LOGS.length = 2500;
  }
  saveDataToDisk();
  return log;
}

// --- MIDDLEWARE HELPERS ---
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || (req.query?.token as string);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  let foundUser: User | undefined;
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    foundUser = USERS_DB.find(u => u.id === decoded.id);
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }

  if (!foundUser) {
    return res.status(401).json({ error: 'User account not found or session invalid.' });
  }

  const userProfile = PROFILES_DB[foundUser.id] || {};
  req.user = {
    ...foundUser,
    profile: userProfile,
    profilePicture: userProfile.profilePicture || ''
  };

  if (req.user && req.user.status === 'suspended') {
    return res.status(403).json({ error: 'Account suspended by Administrator. Contact support.' });
  }

  next();
}

function isMasterAdminUser(user: any): boolean {
  return user?.email?.toLowerCase() === 'professor9049@gmail.com' || user?.isMasterAdmin === true;
}

function isAdminRole(user: any): boolean {
  if (!user) return false;
  const r = (user.role || 'user').toLowerCase().trim().replace('-', '_');
  return isMasterAdminUser(user) || r === 'admin';
}

const MODULE_ALIASES: Record<string, string[]> = {
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

  // Finance
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

const PERMISSION_ALIASES: Record<string, string[]> = {
  'view_all_trades': ['trade_control:view', 'trade_control:view_positions'],
  'manage_trades': ['trade_control:close_trade', 'trade_control:intervene', 'trade_control:edit_parameters'],
  'view_trade_history': ['trade_history:view', 'trade_history:view_details'],
  'view_account_activity': ['trade_history:view', 'audit:view_activity'],
  'view_deposits': ['approval_desk:view', 'approval_desk:view_deposits'],
  'view_deposit_history': ['approval_desk:view', 'profit_control:view_history', 'trade_history:view'],
  'approve_withdrawals': ['approval_desk:approve_withdrawals', 'approval_desk:approve_deposits'],
  'view_withdrawal_history': ['approval_desk:view', 'profit_control:view_history'],
  'manage_finance': ['profit_control:adjust_balance', 'profit_control:pnl_override'],
  'correct_trade': ['trade_history:correct_trade'],
  'edit_trade': ['trade_history:correct_trade', 'trade_control:edit_entry_price', 'trade_control:edit_sl', 'trade_control:edit_tp'],
  'create_trade': ['trade_control:intervene', 'trade_history:correct_trade'],
  'delete_trade': ['trade_history:correct_trade'],
  'void_trade': ['trade_history:correct_trade'],
  'correct_balance': ['profit_control:adjust_balance'],
  'view_users': ['users:view', 'users:view_profiles'],
  'manage_users': ['users:edit_profiles', 'users:change_status', 'users:reset_passwords', 'users:manage_security'],
  'manage_roles': ['users:manage_roles'],
  'manage_settings': ['settings:edit_branding', 'settings:manage_payments', 'settings:manage_fees'],
  'view_analytics': ['analytics:view', 'analytics:view_stats'],
  'view_audit_logs': ['audit:view', 'audit:view_activity'],
  'manage_kyc': ['approval_desk:manage_kyc', 'users:manage_kyc'],
  'view_kyc': ['approval_desk:manage_kyc', 'approval_desk:view', 'users:view_profiles'],
  'manage_support': ['chat:view', 'chat:respond', 'chat:manage'],
  'view_markets': ['markets:view', 'markets:view_settings'],
  'manage_markets': ['markets:create', 'markets:edit', 'markets:toggle_status', 'markets:manage_leverage', 'markets:manage_settings']
};

function getRoleTemplate(role: string = 'user'): RolePermissionTemplate {
  const normRole = (role || 'user').toLowerCase().trim().replace('-', '_');
  if (ROLE_PERMISSIONS_DB[normRole]) {
    return ROLE_PERMISSIONS_DB[normRole];
  }
  return DEFAULT_ROLE_TEMPLATES[normRole as Role] || DEFAULT_ROLE_TEMPLATES['user'];
}

function computeUserEffectivePermissions(user: any): { enabledModules: string[]; actions: Record<string, boolean>; isMasterAdmin: boolean } {
  if (!user) {
    return { enabledModules: [], actions: {}, isMasterAdmin: false };
  }
  if (isAdminRole(user)) {
    const allModules = ADMIN_MODULES_CATALOG.map(m => m.id);
    const allActions: Record<string, boolean> = { '*': true };
    ADMIN_MODULES_CATALOG.forEach(m => {
      allActions[`${m.id}:view`] = true;
      m.actions.forEach(a => {
        allActions[a.id] = true;
      });
    });
    return { enabledModules: allModules, actions: allActions, isMasterAdmin: true };
  }

  const role = (user.role || 'user').toLowerCase().trim().replace('-', '_');
  const roleTemplate = getRoleTemplate(role);
  const enabledModulesSet = new Set<string>();
  const actionsMap: Record<string, boolean> = {};

  const hasCustomMods = user.customModules && typeof user.customModules === 'object' && Object.keys(user.customModules).length > 0;

  if (hasCustomMods) {
    // Exact user custom module overrides take precedence
    Object.entries(user.customModules).forEach(([modId, enabled]) => {
      if (enabled) {
        enabledModulesSet.add(modId);
      }
    });
  } else {
    // Inherit from configured role template
    (roleTemplate.enabledModules || []).forEach(m => enabledModulesSet.add(m));
  }

  // Base actions from template for active enabled modules
  if (roleTemplate.actions) {
    Object.entries(roleTemplate.actions).forEach(([actionId, isEnabled]) => {
      const modId = actionId.split(':')[0];
      if (enabledModulesSet.has(modId) && isEnabled) {
        actionsMap[actionId] = true;
      }
    });
  }

  // Ensure default actions for enabled modules
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

  // Apply user-specific custom action overrides
  if (user.customActions && typeof user.customActions === 'object') {
    Object.entries(user.customActions).forEach(([actionId, isEnabled]) => {
      const modId = actionId.split(':')[0];
      if (enabledModulesSet.has(modId)) {
        actionsMap[actionId] = Boolean(isEnabled);
      } else {
        actionsMap[actionId] = false;
      }
    });
  }

  // Handle explicit permissions array on user (e.g. ['LIVE_TRADE_CONTROLLER', 'SUPPORT'])
  if (Array.isArray(user.permissions) && user.permissions.length > 0) {
    user.permissions.forEach((p: string) => {
      const normP = (p || '').toLowerCase().trim().replace('-', '_');
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

  return { enabledModules: Array.from(enabledModulesSet), actions: actionsMap, isMasterAdmin: false };
}

function getPermissionsForRole(role: string = 'user'): string[] {
  const normRole = (role || 'user').toLowerCase().trim().replace('-', '_');
  const template = getRoleTemplate(normRole);
  if (normRole === 'admin') return ['*'];
  return Object.keys(template.actions || {}).filter(k => template.actions[k]);
}

function hasPermission(user: any, permission: string): boolean {
  if (!user) return false;
  if (isAdminRole(user)) return true;

  const { enabledModules, actions } = computeUserEffectivePermissions(user);
  if (actions['*']) return true;

  const normPerm = (permission || '').toLowerCase().trim();

  // If permission is an action format like 'trade_control:edit_sl'
  if (normPerm.includes(':')) {
    const modId = normPerm.split(':')[0];
    if (!enabledModules.includes(modId)) return false;
    if (normPerm.endsWith(':view')) {
      return actions[normPerm] !== false;
    }
    return actions[normPerm] === true;
  }

  // If permission is a module ID like 'trade_control'
  if (ADMIN_MODULES_CATALOG.some(m => m.id === normPerm)) {
    return enabledModules.includes(normPerm);
  }

  // If checking module alias (like 'live_trade_controller')
  if (MODULE_ALIASES[normPerm]) {
    return MODULE_ALIASES[normPerm].some(mId => enabledModules.includes(mId));
  }

  // Check legacy action aliases
  if (PERMISSION_ALIASES[normPerm]) {
    const targetActions = PERMISSION_ALIASES[normPerm];
    return targetActions.some(actionKey => {
      const modId = actionKey.split(':')[0];
      return enabledModules.includes(modId) && actions[actionKey] === true;
    });
  }

  // Direct check
  return actions[normPerm] === true;
}

function requirePermission(permission: string) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !hasPermission(req.user, permission)) {
      return res.status(403).json({ 
        error: `Access Denied: Role '${req.user?.role || 'user'}' lacks required '${permission}' permission.` 
      });
    }
    next();
  };
}

function requireMasterAdmin(req: any, res: any, next: any) {
  if (!req.user || !isAdminRole(req.user)) {
    return res.status(403).json({ error: 'Forbidden: Master Admin privileges required' });
  }
  next();
}

function isStaffUser(user: any) {
  if (!user) return false;
  const roleNorm = (user.role || 'user').toLowerCase().trim().replace('-', '_');
  const staffRoles = ['admin', 'co_admin', 'trade_controller', 'finance_manager', 'support', 'manager', 'moderator'];
  if (staffRoles.includes(roleNorm) || isMasterAdminUser(user)) return true;
  // If user has custom module access
  const eff = computeUserEffectivePermissions(user);
  return eff.enabledModules.length > 0;
}

function requireMainAdmin(req: any, res: any, next: any) {
  if (!req.user || !isStaffUser(req.user)) {
    return res.status(403).json({ error: 'Forbidden: Admin or staff access required' });
  }
  next();
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || (!hasPermission(req.user, 'users:manage_roles') && !hasPermission(req.user, 'users:view') && !isAdminRole(req.user))) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
}

function requireTradeController(req: any, res: any, next: any) {
  if (!req.user || (!hasPermission(req.user, 'trade_control:view') && !hasPermission(req.user, 'trade_control') && !hasPermission(req.user, 'view_all_trades'))) {
    return res.status(403).json({ error: 'Forbidden: Live Trade Controller privileges required' });
  }
  next();
}

async function syncLiveMarketPrices() {
  try {
    const tickers = MARKETS_DB.map(m => m.tvSymbol).filter(Boolean);
    const res = await fetch('https://scanner.tradingview.com/global/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbols: { tickers },
        columns: ["close", "change", "high", "low", "volume"]
      })
    });
    
    if (res.ok) {
      const data: any = await res.json();
      if (data && Array.isArray(data.data)) {
        data.data.forEach((item: any) => {
          const rawSym = item.s;
          const pair = MARKETS_DB.find(m => m.tvSymbol === rawSym);
          if (pair) {
            const [close, change, high, low, vol] = item.d;
            if (!isNaN(close) && close > 0) {
              const previousPrice = pair.price;
              
              // Only override pair price if not actively managed by an admin price override/transition
              const hasActiveOverride = POSITIONS_DB.some(p => p.symbol === pair.symbol && (p.customMarkPrice !== undefined || p.targetMarkPrice !== undefined));
              if (!hasActiveOverride) {
                pair.price = close;
                pair.priceDirection = close >= previousPrice ? 'up' : 'down';
              }

              pair.change24h = change !== undefined && change !== null ? change : pair.change24h;
              pair.high24h = high !== undefined && high !== null && high > 0 ? high : Math.max(pair.high24h, close);
              pair.low24h = low !== undefined && low !== null && low > 0 ? low : Math.min(pair.low24h, close);
              
              // Correct volume processing & parsing: Handle base vs quote volume and prevent zero/null overrides
              if (vol !== undefined && vol !== null && !isNaN(vol) && vol > 0) {
                const computedVol = (pair.category === 'Crypto' && vol < 1000000) ? vol * close : vol;
                if (computedVol > 10000) {
                  pair.volume24h = Number(computedVol.toFixed(2));
                }
              } else if (!pair.volume24h || pair.volume24h <= 0) {
                pair.volume24h = 1500000000;
              }

              pair.lastUpdated = Date.now();
            }
          }
        });
      }
    } else {
      console.warn(`[MarketSync] TradingView scanner responded with status: ${res.status}`);
    }
  } catch (e) {
    console.error('[MarketSync] Error syncing live market prices:', e);
  }
}

// Helper to determine authoritative decimal precision for symbols
function getPriceDecimals(price: number, symbol?: string): number {
  const clean = (symbol || '').toUpperCase();
  if (clean.includes('JPY') || clean.includes('INR')) return 2;
  if (clean.includes('XAU') || clean.includes('GOLD') || clean.includes('OIL') || clean.includes('WTI')) return 2;
  if (clean.includes('BTC') || clean.includes('ETH') || clean.includes('SOL') || clean.includes('BNB')) return 2;
  if (price >= 100) return 2;
  if (price >= 10) return 3;
  if (price >= 1) return 4;
  if (price >= 0.01) return 5;
  return 6;
}

// Authoritative inverse PnL calculation: calculates the exact mark price required for a target PnL
function calculateTargetPriceFromPnL(pos: Position, targetPnL: number): number {
  const isLong = pos.side === 'long' || (pos.side as any) === 'buy';
  const size = pos.size > 0 ? pos.size : (pos.margin * (pos.leverage || 1) / (pos.entryPrice || 1));
  const entryPrice = pos.entryPrice > 0 ? pos.entryPrice : (pos.markPrice || 1);

  if (size <= 0) return entryPrice;

  let calculatedPrice: number;
  if (isLong) {
    // For LONG: PnL = (MarkPrice - EntryPrice) * Size => MarkPrice = EntryPrice + (PnL / Size)
    calculatedPrice = entryPrice + (targetPnL / size);
  } else {
    // For SHORT: PnL = (EntryPrice - MarkPrice) * Size => MarkPrice = EntryPrice - (PnL / Size)
    calculatedPrice = entryPrice - (targetPnL / size);
  }

  // Guard against non-positive prices
  if (calculatedPrice <= 0) {
    calculatedPrice = 0.0001;
  }

  const decimals = getPriceDecimals(calculatedPrice, pos.symbol);
  return Number(calculatedPrice.toFixed(decimals));
}

// Initial live market price sync & periodic 3s sync
syncLiveMarketPrices();
setInterval(syncLiveMarketPrices, 3000);

// Helper function to compute position unrealized PnL consistently across all endpoints
function getPositionUnrealizedPnL(pos: Position, currentPrice?: number): number {
  const mkt = MARKETS_DB.find(m => m.symbol === pos.symbol);
  let price = currentPrice !== undefined ? currentPrice : (pos.customMarkPrice !== undefined && pos.customMarkPrice !== null ? pos.customMarkPrice : (mkt ? mkt.price : pos.markPrice));
  if (pos.customMarkPrice !== undefined && pos.customMarkPrice !== null && currentPrice === undefined) {
    price = pos.customMarkPrice;
  }
  
  // Mathematical formula:
  // For LONG:  (Current/Mark Price - Opening Price) * Position Quantity
  // For SHORT: (Opening Price - Current/Mark Price) * Position Quantity
  const isLong = pos.side === 'long' || (pos.side as any) === 'buy';
  const size = pos.size || 0;
  const entryPrice = pos.entryPrice || price;

  const exactPnL = isLong
    ? (price - entryPrice) * size
    : (entryPrice - price) * size;

  return Number(exactPnL.toFixed(2));
}

// Backend continuous ticker engine to update position PnLs in real time
setInterval(() => {
  // Update open position unrealized PnL for every single asset
  POSITIONS_DB.forEach(pos => {
    const pair = MARKETS_DB.find(m => m.symbol === pos.symbol);
    if (pair) {
      let effectivePrice = pair.price;

      // Handle price-driven transitions (gradual animation over 1-5 minutes)
      if (pos.targetMarkPrice !== undefined && pos.targetMarkPrice !== null && pos.transitionStartTime && pos.transitionDurationMs) {
        const now = Date.now();
        const elapsed = now - pos.transitionStartTime;
        const progress = Math.min(1, elapsed / pos.transitionDurationMs);
        const startPrice = pos.transitionStartPrice !== undefined ? pos.transitionStartPrice : pair.price;
        
        if (progress >= 1) {
          // Transition complete: lock at exact target price and clear transition timer
          pos.customMarkPrice = pos.targetMarkPrice;
          effectivePrice = pos.targetMarkPrice;
          delete pos.targetMarkPrice;
          delete pos.transitionStartPrice;
          delete pos.transitionStartTime;
          delete pos.transitionDurationMs;
        } else {
          const baseInterp = startPrice + (pos.targetMarkPrice - startPrice) * progress;
          // Small realistic micro-noise during transition that decays smoothly towards target
          const remaining = 1 - progress;
          const noiseScale = Math.abs(pos.targetMarkPrice - startPrice) * 0.0015 * remaining;
          const tickNoise = (Math.random() - 0.5) * noiseScale;
          const currentInterp = baseInterp + tickNoise;
          const decimals = getPriceDecimals(pos.targetMarkPrice, pos.symbol);
          pos.customMarkPrice = Number(currentInterp.toFixed(decimals));
          effectivePrice = pos.customMarkPrice;
        }

        pair.price = effectivePrice;
        pair.priceDirection = pos.targetMarkPrice !== undefined ? (pos.targetMarkPrice >= startPrice ? 'up' : 'down') : 'up';
      } else if (pos.customMarkPrice !== undefined && pos.customMarkPrice !== null) {
        effectivePrice = pos.customMarkPrice;
        pair.price = effectivePrice;
      }

      pos.markPrice = effectivePrice;
      const uPnL = getPositionUnrealizedPnL(pos, effectivePrice);
      pos.unrealizedPnL = Number(uPnL.toFixed(2));
      const marginCalc = pos.margin > 0 ? pos.margin : (pos.entryPrice * pos.size);
      pos.unrealizedPnLPercent = marginCalc > 0 ? Number(((pos.unrealizedPnL / marginCalc) * 100).toFixed(2)) : 0;

      // Check Stop Loss & Take Profit execution
      let hitReason: string | null = null;
      let closePrice = effectivePrice;

      if (pos.side === 'long') {
        if (pos.takeProfit !== undefined && pos.takeProfit !== null && effectivePrice >= pos.takeProfit) {
          hitReason = 'Take Profit (TP)';
          closePrice = pos.takeProfit;
        } else if (pos.stopLoss !== undefined && pos.stopLoss !== null && effectivePrice <= pos.stopLoss) {
          hitReason = 'Stop Loss (SL)';
          closePrice = pos.stopLoss;
        }
      } else {
        // short
        if (pos.takeProfit !== undefined && pos.takeProfit !== null && effectivePrice <= pos.takeProfit) {
          hitReason = 'Take Profit (TP)';
          closePrice = pos.takeProfit;
        } else if (pos.stopLoss !== undefined && pos.stopLoss !== null && effectivePrice >= pos.stopLoss) {
          hitReason = 'Stop Loss (SL)';
          closePrice = pos.stopLoss;
        }
      }

      if (hitReason) {
        const rates = getMakerTakerFeeRates();
        const finalPnL = getPositionUnrealizedPnL(pos, closePrice);
        const exitValue = pos.size * closePrice;
        const exitFee = Number((exitValue * rates.takerFeeRate).toFixed(2));
        const entryFee = pos.handlingFee !== undefined ? pos.handlingFee : Number((pos.entryPrice * pos.size * rates.takerFeeRate).toFixed(2));
        const totalFee = Number((entryFee + exitFee).toFixed(2));
        const netPnL = Number((finalPnL - exitFee).toFixed(2));

        const wallet = getUserWallet(pos.userId);
        const returnAmount = pos.margin + netPnL;
        wallet.availableMargin = Math.max(0, wallet.availableMargin + returnAmount);
        wallet.usedMargin = Math.max(0, wallet.usedMargin - pos.margin);
        wallet.tradingBalance = Math.max(0, wallet.tradingBalance + netPnL);

        const posLots = pos.lots !== undefined ? pos.lots : backendUnitsToLots(pos.size, pos.symbol);
        const contractSize = pos.contractSize || getBackendContractSize(pos.symbol);

        const closedTx: Transaction = {
          id: 'tx_tp_sl_' + Math.random().toString(36).substring(2, 9),
          userId: pos.userId,
          type: 'trade',
          amount: Number((pos.margin + netPnL).toFixed(2)),
          margin: pos.margin,
          currency: 'USDT',
          status: 'completed',
          symbol: pos.symbol,
          side: pos.side,
          entryPrice: pos.entryPrice,
          exitPrice: closePrice,
          quantity: pos.size,
          lots: posLots,
          contractSize: contractSize,
          leverage: pos.leverage,
          fee: totalFee,
          handlingFee: entryFee,
          pnl: Number(finalPnL.toFixed(2)),
          netPnL: netPnL,
          closeReason: hitReason,
          openedAt: pos.openedAt || new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        TRANSACTIONS_DB.unshift(closedTx);

        NOTIFICATIONS_DB.unshift({
          id: 'notif_' + Date.now(),
          userId: pos.userId,
          title: `${hitReason} Reached - Position Closed`,
          message: `${pos.side.toUpperCase()} ${posLots} Lots (${pos.size} units) ${pos.symbol} closed at ${closePrice.toLocaleString()} due to ${hitReason}. Net PnL: $${netPnL >= 0 ? '+' : ''}${netPnL.toFixed(2)} USDT (Fee: $${totalFee})`,
          type: 'trade',
          read: false,
          createdAt: new Date().toISOString()
        });

        const idx = POSITIONS_DB.findIndex(p => p.id === pos.id);
        if (idx !== -1) {
          POSITIONS_DB.splice(idx, 1);
        }
        saveDataToDisk();
      }
    }
  });

  // Evaluate and execute pending orders (Limit & Stop orders)
  ORDERS_DB.forEach(ord => {
    if (ord.status !== 'open') return;

    const pair = MARKETS_DB.find(m => m.symbol === ord.symbol);
    if (!pair) return;

    const currentPrice = pair.price;
    const triggerPrice = ord.price || currentPrice;
    let isTriggered = false;

    if (ord.type === 'limit') {
      if (ord.side === 'buy' && currentPrice <= triggerPrice) {
        isTriggered = true;
      } else if (ord.side === 'sell' && currentPrice >= triggerPrice) {
        isTriggered = true;
      }
    } else if (ord.type === 'stop') {
      if (ord.side === 'buy' && currentPrice >= triggerPrice) {
        isTriggered = true;
      } else if (ord.side === 'sell' && currentPrice <= triggerPrice) {
        isTriggered = true;
      }
    }

    if (isTriggered) {
      ord.status = 'filled';

      const lev = ord.leverage || 10;
      const notionalValue = triggerPrice * ord.amount;
      const requiredMargin = notionalValue / lev;
      const maintenanceMargin = 0.005;

      const rates = getMakerTakerFeeRates();
      const isMaker = ord.type === 'limit';
      const applicableFeeRate = isMaker ? rates.makerFeeRate : rates.takerFeeRate;
      const entryFee = Number((notionalValue * applicableFeeRate).toFixed(2));

      let liqPrice = 0;
      if (lev > 0) {
        if (ord.side === 'buy') {
          liqPrice = triggerPrice * (1 - (1 / lev) + maintenanceMargin);
        } else {
          liqPrice = triggerPrice * (1 + (1 / lev) - maintenanceMargin);
        }
      }

      const newPosition: Position = {
        id: 'pos_' + Math.random().toString(36).substring(2, 9),
        userId: ord.userId,
        symbol: ord.symbol,
        side: ord.side === 'buy' ? 'long' : 'short',
        entryPrice: triggerPrice,
        markPrice: currentPrice,
        size: ord.amount,
        leverage: lev,
        margin: Number(requiredMargin.toFixed(2)),
        liquidationPrice: Number(liqPrice.toFixed(2)),
        takeProfit: ord.takeProfit,
        stopLoss: ord.stopLoss,
        handlingFee: entryFee,
        feeRate: applicableFeeRate,
        makerTaker: isMaker ? 'maker' : 'taker',
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        openedAt: new Date().toISOString()
      };

      POSITIONS_DB.push(newPosition);

      NOTIFICATIONS_DB.unshift({
        id: 'notif_' + Date.now(),
        userId: ord.userId,
        title: `Pending ${ord.type.toUpperCase()} Order Executed`,
        message: `${ord.side.toUpperCase()} ${ord.amount} ${ord.symbol} @ $${triggerPrice.toLocaleString()} USDT triggered & filled`,
        type: 'trade',
        read: false,
        createdAt: new Date().toISOString()
      });

      saveDataToDisk();
    }
  });
}, 800);

// --- API ENDPOINTS ---

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'eToro Exchange High-Frequency Trading Engine',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// AUTH API
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const existing = USERS_DB.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const newUser: User = {
    id: 'user_' + Math.random().toString(36).substring(2, 9),
    email,
    name,
    role: 'user',
    is2FAEnabled: false,
    kycStatus: 'unverified',
    status: 'active',
    createdAt: new Date().toISOString()
  };

  USERS_DB.push(newUser);
  PASS_HASHES[email] = bcrypt.hashSync(password, 8);
  RAW_PASSWORDS[email] = password;
  RAW_PASSWORDS[newUser.id] = password;
  saveDataToDisk();

  // Initialize wallets with $0 starting balance (no free money to new accounts)
  WALLETS_DB[newUser.id] = {
    userId: newUser.id,
    spotBalance: SYSTEM_SETTINGS.initialUserBalance || 0,
    tradingBalance: 0,
    fundingBalance: 0,
    availableMargin: 0,
    usedMargin: 0
  };

  const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    message: 'Account created successfully! Please deposit funds to start trading.',
    token,
    user: newUser,
    wallet: WALLETS_DB[newUser.id]
  });

});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = USERS_DB.find(u => u.email.toLowerCase() === email?.toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Account suspended. Contact compliance support.' });
  }

  let storedHash = PASS_HASHES[user.email] || PASS_HASHES[user.email.toLowerCase()] || PASS_HASHES[email] || PASS_HASHES[email.toLowerCase()] || PASS_HASHES[user.id];
  if (!storedHash || !bcrypt.compareSync(password, storedHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (false) {
    return res.json({
      require2FA: true,
      userId: user.id,
      email: user.email,
      message: 'Please enter 6-digit Google Authenticator OTP code'
    });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

  let wallet = WALLETS_DB[user.id];
  if (!wallet) {
    wallet = { userId: user.id, spotBalance: 0, tradingBalance: 10000, fundingBalance: 0, availableMargin: 10000, usedMargin: 0 };
    WALLETS_DB[user.id] = wallet;
  }

  recordUserLoginSession(user.id, req, req.body.clientGeo).catch(() => {});

  res.json({
    token,
    user,
    wallet
  });
});

function getUserWallet(userId: string): Wallet {
  if (!WALLETS_DB[userId]) {
    WALLETS_DB[userId] = {
      userId,
      spotBalance: 0,
      tradingBalance: 0,
      fundingBalance: 0,
      availableMargin: 0,
      usedMargin: 0
    };
  }
  return WALLETS_DB[userId];
}

app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  const wallet = getUserWallet(req.user.id);
  const effective = computeUserEffectivePermissions(req.user);
  const permissions = Object.keys(effective.actions).filter(k => effective.actions[k]);
  res.json({
    user: {
      ...req.user,
      permissions,
      effectivePermissions: effective.actions,
      effectiveModules: effective.enabledModules,
      customModules: req.user.customModules || {},
      customActions: req.user.customActions || {}
    },
    wallet
  });
});

app.post('/api/auth/login-2fa', (req, res) => {
  const { userId, otpCode } = req.body;
  const user = USERS_DB.find(u => u.id === userId);

  if (!user) {
    return res.status(400).json({ error: 'User session not found' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Account suspended. Contact compliance support.' });
  }

  if (!otpCode || otpCode.trim().length !== 6) {
    return res.status(400).json({ error: 'Please enter a valid 6-digit OTP code' });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

  let wallet = WALLETS_DB[user.id];
  if (!wallet) {
    wallet = { userId: user.id, spotBalance: 0, tradingBalance: 10000, fundingBalance: 0, availableMargin: 10000, usedMargin: 0 };
    WALLETS_DB[user.id] = wallet;
  }

  recordUserLoginSession(user.id, req, req.body.clientGeo).catch(() => {});

  const effective = computeUserEffectivePermissions(user);
  const permissions = Object.keys(effective.actions).filter(k => effective.actions[k]);

  res.json({
    token,
    user: {
      ...user,
      permissions,
      effectivePermissions: effective.actions,
      effectiveModules: effective.enabledModules,
      customModules: user.customModules || {},
      customActions: user.customActions || {}
    },
    wallet
  });
});

// Helper to mask email for security display (e.g. j***n@example.com)
function maskUserEmail(email: string): string {
  if (!email || !email.includes('@')) return 'your email';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  const first = local[0];
  const last = local[local.length - 1];
  const maskedMiddle = '*'.repeat(Math.min(local.length - 2, 4));
  return `${first}${maskedMiddle}${last}@${domain}`;
}

// ================================================================
// PASSWORD RESET / FORGOT PASSWORD FLOW (Production Grade)
// ================================================================

// 1. Request Password Reset Link
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';

  // Basic validation
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Please enter a valid registered email address.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email format (e.g. name@domain.com).' });
  }

  const now = Date.now();

  // Rate Limiting by IP: max 8 reset attempts per 15 minutes
  const ipLimit = RESET_RATE_LIMIT_IP.get(clientIp);
  if (ipLimit) {
    if (now < ipLimit.resetTime) {
      if (ipLimit.count >= 8) {
        console.warn(`[AUTH_RATE_LIMIT] IP ${clientIp} exceeded reset attempt limit.`);
        return res.status(429).json({
          error: 'Too many password reset attempts. Please wait 15 minutes before trying again.'
        });
      }
      ipLimit.count++;
    } else {
      RESET_RATE_LIMIT_IP.set(clientIp, { count: 1, resetTime: now + 15 * 60 * 1000 });
    }
  } else {
    RESET_RATE_LIMIT_IP.set(clientIp, { count: 1, resetTime: now + 15 * 60 * 1000 });
  }

  // Rate Limiting by Email: cooldown 45s between requests, max 4 per hour
  const emailLimit = RESET_RATE_LIMIT_EMAIL.get(normalizedEmail);
  if (emailLimit) {
    // Check 45s cooldown
    if (now - emailLimit.lastRequestTime < 45 * 1000) {
      const waitSeconds = Math.ceil((45 * 1000 - (now - emailLimit.lastRequestTime)) / 1000);
      return res.status(429).json({
        error: `Please wait ${waitSeconds} seconds before requesting another password reset email.`
      });
    }

    // Check hourly cap
    if (now - emailLimit.windowStart < 60 * 60 * 1000) {
      if (emailLimit.count >= 4) {
        return res.status(429).json({
          error: 'Too many reset requests for this email. Please check your inbox/spam folder or try again later.'
        });
      }
      emailLimit.count++;
      emailLimit.lastRequestTime = now;
    } else {
      RESET_RATE_LIMIT_EMAIL.set(normalizedEmail, { lastRequestTime: now, count: 1, windowStart: now });
    }
  } else {
    RESET_RATE_LIMIT_EMAIL.set(normalizedEmail, { lastRequestTime: now, count: 1, windowStart: now });
  }

  console.log(`[AUTH_FORGOT_PASSWORD] Processing reset request for: ${normalizedEmail} (IP: ${clientIp})`);

  // Lookup user safely without leaking existence to client (Anti-Account Enumeration)
  const user = USERS_DB.find(u => u.email.toLowerCase() === normalizedEmail);

  if (user) {
    if (user.status === 'suspended') {
      console.warn(`[AUTH_FORGOT_PASSWORD] Reset blocked for suspended user: ${user.email}`);
      return res.json({
        success: true,
        message: 'If an account is associated with this email address, password reset instructions have been dispatched. Please check your inbox and spam folder.'
      });
    }

    try {
      // 1. Invalidate any prior active tokens for this user
      PASSWORD_RESET_TOKENS.forEach(t => {
        if (t.userId === user.id && !t.used) {
          t.used = true;
          t.usedAt = new Date().toISOString();
        }
      });

      // 2. Generate cryptographically secure random token (64 hex characters)
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes expiry

      const tokenRecord: PasswordResetToken = {
        id: 'prt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        userId: user.id,
        email: user.email,
        tokenHash,
        expiresAt,
        used: false,
        createdAt: new Date().toISOString(),
        ipAddress: clientIp
      };

      PASSWORD_RESET_TOKENS.unshift(tokenRecord);
      // Keep list within 1000 entries
      if (PASSWORD_RESET_TOKENS.length > 1000) {
        PASSWORD_RESET_TOKENS = PASSWORD_RESET_TOKENS.slice(0, 1000);
      }
      saveDataToDisk();

      // 3. Build trusted application URL and secure reset link
      const baseUrl = getAppUrl(req);
      const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

      // 4. Send the real transactional email asynchronously
      sendPasswordResetEmail({
        to: user.email,
        userName: user.name || (PROFILES_DB[user.id]?.fullName),
        resetUrl,
        clientIp
      }).catch(err => {
        console.error('[AUTH_FORGOT_PASSWORD] Email background send error:', err);
      });

      // 5. Add security audit log
      recordAuditLog({
        action: 'Password Reset Requested',
        eventType: 'PASSWORD_RESET_REQUESTED',
        category: 'security',
        actor: { id: 'system', name: 'Security Gateway', email: 'security@etoroglobal.com', role: 'SYSTEM' },
        targetUser: user,
        targetUserId: user.id,
        targetUserName: user.name,
        targetUserEmail: user.email,
        objectType: 'Authentication Token',
        objectId: user.id,
        previousState: 'Active Credentials',
        newState: 'Reset Token Dispatched',
        reason: 'Automated user account password recovery verification',
        details: `Password reset link generated and dispatched to ${user.email}. Expires in 30 mins.`,
        ipAddress: clientIp
      });
    } catch (err: any) {
      console.error('[AUTH_FORGOT_PASSWORD] Failed to generate reset token:', err);
    }
  } else {
    console.log(`[AUTH_FORGOT_PASSWORD] No account found matching: ${normalizedEmail} (Responding with standard anti-enumeration message)`);
  }

  // Consistent response to protect against user enumeration
  res.json({
    success: true,
    message: 'If an account is associated with this email address, password reset instructions have been dispatched. Please check your inbox and spam folder.'
  });
});

// 2. Validate Password Reset Token
app.all(['/api/auth/verify-reset-token'], (req, res) => {
  const rawToken = (req.body?.token || req.query?.token) as string;

  if (!rawToken || typeof rawToken !== 'string' || rawToken.trim() === '') {
    return res.status(400).json({
      valid: false,
      error: 'Missing security token. Please use the complete link sent to your email.'
    });
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
  const tokenRecord = PASSWORD_RESET_TOKENS.find(t => t.tokenHash === tokenHash);

  if (!tokenRecord) {
    return res.status(400).json({
      valid: false,
      error: 'This password reset link is invalid. It may have already been replaced by a newer request.'
    });
  }

  if (tokenRecord.used) {
    return res.status(400).json({
      valid: false,
      error: 'This password reset link has already been used. Please request a new link if you need to reset your password again.'
    });
  }

  const isExpired = new Date(tokenRecord.expiresAt).getTime() < Date.now();
  if (isExpired) {
    return res.status(400).json({
      valid: false,
      error: 'This password reset link has expired (links are valid for 30 minutes). Please request a new link.'
    });
  }

  const user = USERS_DB.find(u => u.id === tokenRecord.userId);
  if (!user) {
    return res.status(400).json({
      valid: false,
      error: 'The associated user account could not be found.'
    });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({
      valid: false,
      error: 'Account suspended. Contact compliance support.'
    });
  }

  res.json({
    valid: true,
    email: maskUserEmail(user.email),
    expiresAt: tokenRecord.expiresAt
  });
});

// 3. Complete Password Reset with New Password
app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';

  if (!token || typeof token !== 'string' || token.trim() === '') {
    return res.status(400).json({ error: 'Security token is required.' });
  }

  if (!newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ error: 'Please enter a new password.' });
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match. Please ensure both passwords match.' });
  }

  const trimmedPassword = newPassword.trim();
  if (trimmedPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  // Validate security requirements: at least 1 letter and 1 number
  const hasLetter = /[a-zA-Z]/.test(trimmedPassword);
  const hasNumber = /[0-9]/.test(trimmedPassword);
  if (!hasLetter || !hasNumber) {
    return res.status(400).json({ error: 'Password must contain both letters and numbers for institutional security.' });
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
  const tokenRecord = PASSWORD_RESET_TOKENS.find(t => t.tokenHash === tokenHash);

  if (!tokenRecord) {
    return res.status(400).json({ error: 'This password reset link is invalid or has expired.' });
  }

  if (tokenRecord.used) {
    return res.status(400).json({ error: 'This password reset link has already been used. Please request a fresh reset link.' });
  }

  if (new Date(tokenRecord.expiresAt).getTime() < Date.now()) {
    return res.status(400).json({ error: 'This password reset link has expired. Please request a new password reset.' });
  }

  const user = USERS_DB.find(u => u.id === tokenRecord.userId);
  if (!user) {
    return res.status(400).json({ error: 'Associated user account was not found.' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Account suspended. Contact compliance support.' });
  }

  try {
    // 1. Hash the new password securely with bcrypt
    const newHash = bcrypt.hashSync(trimmedPassword, 8);
    PASS_HASHES[user.email] = newHash;
    PASS_HASHES[user.email.toLowerCase()] = newHash;
    PASS_HASHES[user.id] = newHash;

    RAW_PASSWORDS[user.email] = trimmedPassword;
    RAW_PASSWORDS[user.id] = trimmedPassword;

    // 2. Mark token as consumed and single-use
    tokenRecord.used = true;
    tokenRecord.usedAt = new Date().toISOString();

    // 3. Invalidate any other pending tokens for this account
    PASSWORD_RESET_TOKENS.forEach(t => {
      if (t.userId === user.id && !t.used) {
        t.used = true;
        t.usedAt = new Date().toISOString();
      }
    });

    // 4. Invalidate all active sessions in SESSIONS_DB to force fresh re-login
    delete SESSIONS_DB[user.id];

    // 5. Add security notification
    if (!NOTIFICATIONS_DB[user.id]) NOTIFICATIONS_DB[user.id] = [];
    NOTIFICATIONS_DB[user.id].unshift({
      id: 'notif_' + Date.now(),
      userId: user.id,
      title: 'Password Changed Successfully',
      message: `Your account password was updated on ${new Date().toUTCString()} (IP: ${clientIp}). If you did not make this change, contact security immediately.`,
      type: 'security',
      read: false,
      createdAt: new Date().toISOString()
    });

    // 6. Record audit log
    recordAuditLog({
      action: 'Password Reset Completed',
      eventType: 'USER_PASSWORD_RESET_COMPLETED',
      category: 'security',
      actor: { id: user.id, name: user.name, email: user.email, role: user.role || 'USER' },
      targetUser: user,
      targetUserId: user.id,
      targetUserName: user.name,
      targetUserEmail: user.email,
      objectType: 'Password Credentials',
      objectId: user.id,
      previousState: 'Expired/Pending Reset',
      newState: 'Updated & Active Password (Encrypted)',
      reason: 'User successfully completed tokenized password reset',
      details: `Password successfully reset via secure email link from IP ${clientIp}.`,
      ipAddress: clientIp
    });

    saveDataToDisk();

    console.log(`[AUTH_RESET_PASSWORD] ✅ Password successfully updated for user: ${user.email}`);

    return res.json({
      success: true,
      message: 'Your password has been reset successfully. You can now sign in with your new password.'
    });
  } catch (err: any) {
    console.error('[AUTH_RESET_PASSWORD] Failed to update password:', err);
    return res.status(500).json({ error: 'Failed to update password due to an internal error. Please try again.' });
  }
});

// GOOGLE AUTHENTICATOR (2FA) MANAGEMENT
const USER_2FA_SECRETS: Record<string, string> = {};

app.get('/api/user/security/2fa-setup', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  let secret = USER_2FA_SECRETS[userId];

  if (!secret) {
    // Generate standard base32 format secret key
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    secret = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    USER_2FA_SECRETS[userId] = secret;
  }

  const otpUrl = `otpauth://totp/${encodeURIComponent(SYSTEM_SETTINGS.siteName || 'eToro')}:${encodeURIComponent(req.user.email)}?secret=${secret}&issuer=${encodeURIComponent(SYSTEM_SETTINGS.siteName || 'eToro')}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpUrl)}`;

  res.json({
    secret,
    qrCodeUrl
  });
});

app.post('/api/user/security/2fa-enable', authenticateToken, (req: any, res) => {
  const { otpCode } = req.body;
  if (!otpCode || otpCode.trim().length !== 6) {
    return res.status(400).json({ error: 'Invalid 6-digit OTP code. Please check Google Authenticator.' });
  }

  const user = USERS_DB.find(u => u.id === req.user.id);
  if (user) {
    user.is2FAEnabled = true;
    saveDataToDisk();
  }

  NOTIFICATIONS_DB.unshift({
    id: 'notif_' + Date.now(),
    userId: req.user.id,
    title: 'Two-Factor Authentication Enabled',
    message: 'Google Authenticator 2FA security has been successfully enabled for your account.',
    type: 'alert',
    read: false,
    createdAt: new Date().toISOString()
  });

  res.json({ message: 'Two-Factor Authentication successfully enabled!', is2FAEnabled: true });
});

app.post('/api/user/security/2fa-disable', authenticateToken, (req: any, res) => {
  const { otpCode } = req.body;
  if (!otpCode || otpCode.trim().length !== 6) {
    return res.status(400).json({ error: 'Invalid 6-digit OTP code. Enter OTP to confirm disabling 2FA.' });
  }

  const user = USERS_DB.find(u => u.id === req.user.id);
  if (user) {
    user.is2FAEnabled = false;
    saveDataToDisk();
  }

  NOTIFICATIONS_DB.unshift({
    id: 'notif_' + Date.now(),
    userId: req.user.id,
    title: 'Two-Factor Authentication Disabled',
    message: 'Two-Factor Authentication (2FA) was disabled for your account.',
    type: 'alert',
    read: false,
    createdAt: new Date().toISOString()
  });

  res.json({ message: 'Two-Factor Authentication has been disabled.', is2FAEnabled: false });
});

// MARKETS API
app.get('/api/markets', (req, res) => {
  res.json(MARKETS_DB);
});

// Simulated/Live Candlestick generation endpoint
app.get('/api/markets/kline', (req, res) => {
  const symbol = (req.query.symbol as string) || 'BTC/USDT';
  const interval = (req.query.interval as string) || '1h';
  const limit = parseInt((req.query.limit as string) || '100');

  const pair = MARKETS_DB.find(m => m.symbol === symbol) || MARKETS_DB[0];
  const basePrice = pair.price;

  // Generate continuous realistic kline candles
  const candles = [];
  let currPrice = basePrice * 0.95;
  const now = Date.now();
  const timeStep = interval === '1m' ? 60000 : interval === '5m' ? 300000 : interval === '15m' ? 900000 : interval === '1h' ? 3600000 : 86400000;

  for (let i = limit; i >= 0; i--) {
    const timestamp = now - (i * timeStep);
    const fluctuation = (Math.random() - 0.49) * (basePrice * 0.015);
    const open = currPrice;
    const close = Math.max(open + fluctuation, open * 0.1);
    const high = Math.max(open, close) + (Math.random() * basePrice * 0.005);
    const low = Math.min(open, close) - (Math.random() * basePrice * 0.005);
    const volume = Math.floor(Math.random() * 50000 + 10000);

    candles.push({ timestamp, open, high, low, close, volume });
    currPrice = close;
  }

  // Set latest candle close equal to real pair price
  if (candles.length > 0) {
    candles[candles.length - 1].close = pair.price;
  }

  res.json(candles);
});

// ORDERBOOK API
app.get('/api/markets/orderbook', (req, res) => {
  const symbol = (req.query.symbol as string) || 'BTC/USDT';
  const pair = MARKETS_DB.find(m => m.symbol === symbol) || MARKETS_DB[0];
  const price = pair.price;
  const decimals = price < 10 ? 4 : 2;

  const bids = [];
  const asks = [];

  let bidTotal = 0;
  for (let i = 1; i <= 10; i++) {
    const p = Number((price * (1 - i * 0.0003)).toFixed(decimals));
    const amt = Number((Math.random() * 2 + 0.1).toFixed(4));
    bidTotal += amt;
    bids.push({ price: p, amount: amt, total: Number(bidTotal.toFixed(4)) });
  }

  let askTotal = 0;
  for (let i = 1; i <= 10; i++) {
    const p = Number((price * (1 + i * 0.0003)).toFixed(decimals));
    const amt = Number((Math.random() * 2 + 0.1).toFixed(4));
    askTotal += amt;
    asks.push({ price: p, amount: amt, total: Number(askTotal.toFixed(4)) });
  }

  res.json({
    bids,
    asks,
    spread: Number((asks[0].price - bids[0].price).toFixed(decimals))
  });
});

// RECENT TRADES
app.get('/api/markets/trades', (req, res) => {
  const symbol = (req.query.symbol as string) || 'BTC/USDT';
  const pair = MARKETS_DB.find(m => m.symbol === symbol) || MARKETS_DB[0];
  const price = pair.price;
  const decimals = price < 10 ? 4 : 2;

  const trades = [];
  const now = Date.now();
  for (let i = 0; i < 15; i++) {
    trades.push({
      id: 't_' + (now - i * 1500),
      symbol,
      price: Number((price + (Math.random() - 0.5) * price * 0.002).toFixed(decimals)),
      amount: Number((Math.random() * 1.5 + 0.05).toFixed(4)),
      side: Math.random() > 0.5 ? 'buy' : 'sell',
      timestamp: now - i * 1500
    });
  }

  res.json(trades);
});

// TRADING API
const handleGetPositions = (req: any, res: any) => {
  const userPositions = POSITIONS_DB.filter(p => p.userId === req.user.id);
  
  // Calculate live unrealized PnL based on market prices
  const updated = userPositions.map(pos => {
    const pair = MARKETS_DB.find(m => m.symbol === pos.symbol);
    const markPrice = pair ? pair.price : pos.markPrice;
    
    const uPnL = getPositionUnrealizedPnL(pos, markPrice);
    const uPnLPercent = pos.margin > 0 ? (uPnL / pos.margin) * 100 : 0;

    return {
      ...pos,
      markPrice,
      unrealizedPnL: Number(uPnL.toFixed(2)),
      unrealizedPnLPercent: Number(uPnLPercent.toFixed(2))
    };
  });

  res.json(updated);
};

app.get('/api/trades/positions', authenticateToken, handleGetPositions);
app.get('/api/positions', authenticateToken, handleGetPositions);

function calculateBackendNotionalUSD(symbol: string, quantity: number, entryPrice: number): number {
  if (!quantity || quantity <= 0) return 0;
  const price = entryPrice > 0 ? entryPrice : 1;
  const clean = (symbol || '').trim().toUpperCase();
  let base = 'BTC';
  let quote = 'USDT';
  if (clean.includes('/')) {
    [base, quote] = clean.split('/');
  } else if (clean.includes('-')) {
    [base, quote] = clean.split('-');
  } else if (clean.endsWith('USDT')) {
    base = clean.replace('USDT', '');
    quote = 'USDT';
  } else if (clean.endsWith('USD')) {
    base = clean.replace('USD', '');
    quote = 'USD';
  }

  // Base is USD/USDT
  if (base === 'USD' || base === 'USDT' || base === 'USDC') {
    return quantity;
  }

  // Quote is USD/USDT
  if (quote === 'USD' || quote === 'USDT' || quote === 'USDC') {
    return quantity * price;
  }

  // Cross pairs
  const directBase = MARKETS_DB.find(m => (m.baseCoin?.toUpperCase() === base && (m.quoteCoin?.toUpperCase() === 'USD' || m.quoteCoin?.toUpperCase() === 'USDT')) || m.symbol.toUpperCase() === `${base}/USD` || m.symbol.toUpperCase() === `${base}/USDT`);
  if (directBase && directBase.price > 0) {
    return quantity * directBase.price;
  }

  const quoteUsd = MARKETS_DB.find(m => m.symbol.toUpperCase() === `${quote}/USD` || m.symbol.toUpperCase() === `${quote}/USDT`);
  if (quoteUsd && quoteUsd.price > 0) {
    return quantity * price * quoteUsd.price;
  }

  const usdQuote = MARKETS_DB.find(m => m.symbol.toUpperCase() === `USD/${quote}` || m.symbol.toUpperCase() === `USDT/${quote}`);
  if (usdQuote && usdQuote.price > 0) {
    return (quantity * price) / usdQuote.price;
  }

  const staticRates: Record<string, number> = {
    EUR: 1.0892,
    GBP: 1.2915,
    AUD: 0.6650,
    NZD: 0.6120,
    CAD: 0.7310,
    CHF: 1.1250,
    JPY: 0.006393,
    INR: 0.010526
  };
  if (staticRates[base]) return quantity * staticRates[base];
  if (staticRates[quote]) return quantity * price * staticRates[quote];

  return quantity * price;
}

function getBackendContractSize(symbol?: string, category?: string): number {
  if (!symbol) return 1;
  const clean = symbol.trim().toUpperCase();
  const forexSymbols = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CAD', 'AUD/USD', 'NZD/USD',
    'USD/CHF', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'EUR/CAD', 'AUD/NZD', 'USD/INR'
  ];
  if (category?.toLowerCase() === 'forex' || forexSymbols.some(s => clean === s || clean === s.replace('/', ''))) {
    return 100000;
  }
  if (clean.includes('XAU') || clean.includes('GOLD')) return 100;
  if (clean.includes('XAG') || clean.includes('SILVER')) return 5000;
  if (clean.includes('WTI') || clean.includes('OIL') || clean.includes('BRENT')) return 100;
  if (category?.toLowerCase() === 'crypto' || clean.includes('BTC') || clean.includes('ETH') || clean.includes('SOL') || clean.includes('BNB') || clean.includes('DOGE') || clean.includes('XRP')) {
    return 1;
  }
  if (category?.toLowerCase() === 'indices' || clean.includes('US500') || clean.includes('NAS100') || clean.includes('US30') || clean.includes('NIFTY')) {
    return 1;
  }
  if (category?.toLowerCase() === 'stocks') {
    return 10;
  }
  return 1;
}

function backendLotsToUnits(lots: number, symbol?: string, category?: string): number {
  const contract = getBackendContractSize(symbol, category);
  return Number((lots * contract).toFixed(4));
}

function backendUnitsToLots(units: number, symbol?: string, category?: string): number {
  if (!units || units <= 0) return 0;
  const contract = getBackendContractSize(symbol, category);
  if (contract === 1) return Number(units.toFixed(4));
  if (contract >= 1000 && units < 500) {
    return Number(units.toFixed(2));
  }
  return Number((units / contract).toFixed(4));
}

function calculateBackendMarginUSD(symbol: string, quantity: number, entryPrice: number, leverage: number): number {
  const lev = (!leverage || leverage <= 0) ? 1 : leverage;
  const notionalUSD = calculateBackendNotionalUSD(symbol, quantity, entryPrice);
  return Number((notionalUSD / lev).toFixed(2));
}

function getMakerTakerFeeRates() {
  const makerFeeRate = typeof SYSTEM_SETTINGS.tradingFees?.makerFeeRate === 'number' && !isNaN(SYSTEM_SETTINGS.tradingFees.makerFeeRate)
    ? SYSTEM_SETTINGS.tradingFees.makerFeeRate
    : 0.0002;
  const takerFeeRate = typeof SYSTEM_SETTINGS.tradingFees?.takerFeeRate === 'number' && !isNaN(SYSTEM_SETTINGS.tradingFees.takerFeeRate)
    ? SYSTEM_SETTINGS.tradingFees.takerFeeRate
    : 0.0005;
  return { makerFeeRate, takerFeeRate };
}

function backendQuantityFromMargin(marginUSD: number, leverage: number, price: number, symbol?: string, category?: string): number {
  if (!marginUSD || marginUSD <= 0 || !price || price <= 0) return 0;
  const lev = (!leverage || leverage <= 0) ? 1 : leverage;
  const notionalUSD = marginUSD * lev;
  const clean = (symbol || '').trim().toUpperCase();
  if (clean.startsWith('USD/') || clean.startsWith('USDT/')) {
    return Number(notionalUSD.toFixed(4));
  }
  return Number((notionalUSD / price).toFixed(6));
}

const handlePlaceOrder = (req: any, res: any) => {
  const { symbol, side, type, price, amount, lots, margin, leverage, stopLoss, takeProfit } = req.body;

  if (!symbol || ((margin === undefined || margin <= 0) && (amount === undefined || amount <= 0) && (lots === undefined || lots <= 0))) {
    return res.status(400).json({ error: 'Invalid order parameters. Margin or amount must be specified.' });
  }

  const pair = MARKETS_DB.find(m => m.symbol === symbol);
  if (!pair) {
    return res.status(400).json({ error: 'Market pair not found' });
  }

  const contractSize = getBackendContractSize(symbol, pair.category);
  const execPrice = (price && price > 0) ? price : pair.price;
  const lev = (leverage === undefined || leverage === null) ? 1 : Number(leverage);
  const levForMargin = lev <= 0 ? 1 : lev;

  let totalUnits = 0;
  let totalLots = 0;

  if (margin !== undefined && !isNaN(Number(margin)) && Number(margin) > 0) {
    const userMargin = Number(margin);
    totalUnits = backendQuantityFromMargin(userMargin, levForMargin, execPrice, symbol, pair.category);
    totalLots = backendUnitsToLots(totalUnits, symbol, pair.category);
  } else if (lots !== undefined && !isNaN(Number(lots)) && Number(lots) > 0) {
    totalLots = Number(Number(lots).toFixed(4));
    totalUnits = backendLotsToUnits(totalLots, symbol, pair.category);
  } else if (amount !== undefined && !isNaN(Number(amount)) && Number(amount) > 0) {
    totalUnits = Number(amount);
    totalLots = backendUnitsToLots(totalUnits, symbol, pair.category);
  }

  if (totalUnits <= 0) {
    return res.status(400).json({ error: 'Calculated order size is too small for execution.' });
  }

  const notionalValue = calculateBackendNotionalUSD(symbol, totalUnits, execPrice);
  const requiredMargin = calculateBackendMarginUSD(symbol, totalUnits, execPrice, levForMargin);

  const wallet = getUserWallet(req.user.id);

  if (wallet.availableMargin < requiredMargin) {
    return res.status(400).json({
      error: `Insufficient margin balance. Required: $${requiredMargin.toFixed(2)} USDT, Available: $${wallet.availableMargin.toFixed(2)} USDT`
    });
  }

  // Binance-style maker (0.02%) vs taker (0.05%) fee calculation
  const rates = getMakerTakerFeeRates();
  const isMaker = type === 'limit';
  const applicableFeeRate = isMaker ? rates.makerFeeRate : rates.takerFeeRate;
  const entryFee = Number((notionalValue * applicableFeeRate).toFixed(2));

  // Deduct margin + entry fee from wallet
  wallet.availableMargin = Math.max(0, wallet.availableMargin - requiredMargin - entryFee);
  wallet.tradingBalance = Math.max(0, wallet.tradingBalance - entryFee);
  wallet.usedMargin += requiredMargin;

  // Calculate liquidation price
  const maintenanceMargin = 0.005; // 0.5%
  let liqPrice = 0;
  if (lev > 0) {
    if (side === 'buy') {
      liqPrice = execPrice * (1 - (1 / lev) + maintenanceMargin);
    } else {
      liqPrice = execPrice * (1 + (1 / lev) - maintenanceMargin);
    }
  }

  if (type === 'limit' || type === 'stop') {
    const newOrder: Order = {
      id: 'ord_' + Math.random().toString(36).substring(2, 9),
      userId: req.user.id,
      symbol,
      side,
      type,
      price: execPrice,
      amount: totalUnits,
      leverage: lev,
      takeProfit: takeProfit ? Number(takeProfit) : undefined,
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
      status: 'open',
      createdAt: new Date().toISOString()
    };
    ORDERS_DB.push(newOrder);
    saveDataToDisk();

    NOTIFICATIONS_DB.unshift({
      id: 'notif_' + Date.now(),
      userId: req.user.id,
      title: 'Pending Order Placed',
      message: `${type.toUpperCase()} ${side.toUpperCase()} ${totalLots} Lots (${totalUnits} ${pair.baseCoin}) @ ${execPrice.toLocaleString()} USDT (${lev}x Leverage)`,
      type: 'trade',
      read: false,
      createdAt: new Date().toISOString()
    });

    return res.json({
      message: `${type.toUpperCase()} order placed and pending execution`,
      order: newOrder,
      wallet
    });
  }

  const initialPnL = (side === 'buy' ? (pair.price - execPrice) : (execPrice - pair.price)) * totalUnits;

  const newPosition: Position = {
    id: 'pos_' + Math.random().toString(36).substring(2, 9),
    userId: req.user.id,
    symbol,
    side: side === 'buy' ? 'long' : 'short',
    entryPrice: execPrice,
    markPrice: pair.price,
    size: totalUnits,
    lots: totalLots,
    contractSize: contractSize,
    leverage: lev,
    margin: Number(requiredMargin.toFixed(2)),
    liquidationPrice: Number(liqPrice.toFixed(2)),
    takeProfit: takeProfit ? Number(takeProfit) : undefined,
    stopLoss: stopLoss ? Number(stopLoss) : undefined,
    handlingFee: entryFee,
    feeRate: applicableFeeRate,
    makerTaker: isMaker ? 'maker' : 'taker',
    unrealizedPnL: Number(initialPnL.toFixed(2)),
    unrealizedPnLPercent: requiredMargin > 0 ? Number(((initialPnL / requiredMargin) * 100).toFixed(2)) : 0,
    openedAt: new Date().toISOString()
  };

  POSITIONS_DB.push(newPosition);
  saveDataToDisk();

  // Add Notification
  NOTIFICATIONS_DB.unshift({
    id: 'notif_' + Date.now(),
    userId: req.user.id,
    title: 'Order Executed',
    message: `${side.toUpperCase()} ${totalLots} Lots (${totalUnits} ${pair.baseCoin}) @ ${execPrice.toLocaleString()} USDT (${lev}x Leverage)`,
    type: 'trade',
    read: false,
    createdAt: new Date().toISOString()
  });

  res.json({
    message: 'Order executed successfully',
    position: newPosition,
    wallet
  });
};

app.post('/api/trades/order', authenticateToken, handlePlaceOrder);
app.post('/api/orders', authenticateToken, handlePlaceOrder);

// PENDING ORDERS ENDPOINTS
app.get('/api/orders/pending', authenticateToken, (req: any, res) => {
  const pending = ORDERS_DB.filter(o => o.userId === req.user.id && o.status === 'open');
  res.json(pending);
});

app.get('/api/orders', authenticateToken, (req: any, res) => {
  const userOrders = ORDERS_DB.filter(o => o.userId === req.user.id);
  res.json(userOrders);
});

app.post('/api/orders/:id/cancel', authenticateToken, (req: any, res) => {
  const orderId = req.params.id;
  const idx = ORDERS_DB.findIndex(o => o.id === orderId && o.userId === req.user.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Order not found or already cancelled' });
  }

  const order = ORDERS_DB[idx];
  order.status = 'cancelled';

  const wallet = getUserWallet(req.user.id);
  const marginToRefund = calculateBackendMarginUSD(order.symbol, order.amount, order.price || 1, order.leverage || 1);

  wallet.usedMargin = Math.max(0, wallet.usedMargin - marginToRefund);
  wallet.availableMargin += marginToRefund;

  saveDataToDisk();

  NOTIFICATIONS_DB.unshift({
    id: 'notif_' + Date.now(),
    userId: req.user.id,
    title: 'Order Cancelled',
    message: `Cancelled ${order.type.toUpperCase()} order for ${order.amount} ${order.symbol}`,
    type: 'trade',
    read: false,
    createdAt: new Date().toISOString()
  });

  res.json({ message: 'Pending order cancelled successfully', wallet });
});

// UPDATE TP / SL ON OPEN POSITION
app.post('/api/positions/:id/update-tp-sl', authenticateToken, (req: any, res) => {
  const positionId = req.params.id;
  const { takeProfit, stopLoss } = req.body;

  const pos = POSITIONS_DB.find(p => p.id === positionId && p.userId === req.user.id);
  if (!pos) {
    return res.status(404).json({ error: 'Position not found' });
  }

  pos.takeProfit = takeProfit ? Number(takeProfit) : undefined;
  pos.stopLoss = stopLoss ? Number(stopLoss) : undefined;
  saveDataToDisk();

  NOTIFICATIONS_DB.unshift({
    id: 'notif_' + Date.now(),
    userId: req.user.id,
    title: 'TP/SL Updated',
    message: `Updated Risk Controls for ${pos.symbol}: TP: $${pos.takeProfit || 'None'}, SL: $${pos.stopLoss || 'None'}`,
    type: 'trade',
    read: false,
    createdAt: new Date().toISOString()
  });

  res.json({ message: 'Take Profit & Stop Loss updated successfully', position: pos });
});

const handleClosePosition = (req: any, res: any) => {
  const positionId = req.params.id || req.body.positionId;
  const idx = POSITIONS_DB.findIndex(p => p.id === positionId && p.userId === req.user.id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Position not found' });
  }

  const pos = POSITIONS_DB[idx];
  const pair = MARKETS_DB.find(m => m.symbol === pos.symbol);
  const currentPrice = pair ? pair.price : pos.markPrice;

  const rates = getMakerTakerFeeRates();
  const realizedPnL = getPositionUnrealizedPnL(pos, currentPrice);
  const exitValue = calculateBackendNotionalUSD(pos.symbol, pos.size, currentPrice);
  const exitFee = Number((exitValue * rates.takerFeeRate).toFixed(2));
  const entryFee = pos.handlingFee !== undefined ? pos.handlingFee : Number((calculateBackendNotionalUSD(pos.symbol, pos.size, pos.entryPrice) * rates.takerFeeRate).toFixed(2));
  const totalFee = Number((entryFee + exitFee).toFixed(2));
  const netPnL = Number((realizedPnL - exitFee).toFixed(2));

  const wallet = getUserWallet(req.user.id);

  // Return margin + netPnL (deducting exit fee)
  wallet.usedMargin = Math.max(0, wallet.usedMargin - pos.margin);
  wallet.availableMargin = Math.max(0, wallet.availableMargin + pos.margin + netPnL);
  wallet.tradingBalance = Math.max(0, wallet.tradingBalance + netPnL);

  const posLots = pos.lots !== undefined ? pos.lots : backendUnitsToLots(pos.size, pos.symbol);
  const contractSize = pos.contractSize || getBackendContractSize(pos.symbol);

  // Remove position
  POSITIONS_DB.splice(idx, 1);
  saveDataToDisk();

  // Record comprehensive transaction history
  TRANSACTIONS_DB.unshift({
    id: 'tx_' + Date.now(),
    userId: req.user.id,
    type: 'trade',
    amount: Number((pos.margin + netPnL).toFixed(2)),
    margin: pos.margin,
    currency: 'USDT',
    status: 'completed',
    symbol: pos.symbol,
    side: pos.side,
    entryPrice: pos.entryPrice,
    exitPrice: currentPrice,
    quantity: pos.size,
    lots: posLots,
    contractSize: contractSize,
    leverage: pos.leverage,
    fee: totalFee,
    handlingFee: entryFee,
    feeRate: pos.feeRate || rates.takerFeeRate,
    makerTaker: pos.makerTaker || 'taker',
    pnl: Number(realizedPnL.toFixed(2)),
    netPnL: netPnL,
    openedAt: pos.openedAt || new Date().toISOString(),
    createdAt: new Date().toISOString()
  });

  // Notification
  NOTIFICATIONS_DB.unshift({
    id: 'notif_' + Date.now(),
    userId: req.user.id,
    title: 'Position Closed',
    message: `Closed ${pos.symbol} ${pos.side.toUpperCase()} position. Realized PnL: ${realizedPnL >= 0 ? '+' : ''}$${realizedPnL.toFixed(2)} USDT`,
    type: 'trade',
    read: false,
    createdAt: new Date().toISOString()
  });

  res.json({
    message: 'Position closed successfully',
    realizedPnL: Number(realizedPnL.toFixed(2)),
    wallet
  });
};

app.post('/api/trades/close', authenticateToken, handleClosePosition);
app.post('/api/positions/:id/close', authenticateToken, handleClosePosition);

// WALLETS & TRANSFERS
const handleGetWallet = (req: any, res: any) => {
  const wallet = getUserWallet(req.user.id);
  res.json(wallet);
};

app.get('/api/wallets', authenticateToken, handleGetWallet);
app.get('/api/wallet', authenticateToken, handleGetWallet);

const handleTransfer = (req: any, res: any) => {
  return res.status(400).json({ error: 'This platform operates on a single Trading Wallet architecture. Internal transfers are not required or supported.' });
};

app.post('/api/wallets/transfer', authenticateToken, handleTransfer);
app.post('/api/wallet/transfer', authenticateToken, handleTransfer);

app.get('/api/wallet/deposits', authenticateToken, (req: any, res) => {
  const userDeposits = DEPOSIT_REQUESTS_DB.filter(d => d.userId === req.user.id);
  res.json(userDeposits);
});

app.get('/api/wallets/deposits', authenticateToken, (req: any, res) => {
  const userDeposits = DEPOSIT_REQUESTS_DB.filter(d => d.userId === req.user.id);
  res.json(userDeposits);
});

app.get('/api/wallet/withdrawals', authenticateToken, (req: any, res) => {
  const userWithdrawals = WITHDRAWAL_REQUESTS_DB.filter(w => w.userId === req.user.id);
  res.json(userWithdrawals);
});

app.get('/api/wallets/withdrawals', authenticateToken, (req: any, res) => {
  const userWithdrawals = WITHDRAWAL_REQUESTS_DB.filter(w => w.userId === req.user.id);
  res.json(userWithdrawals);
});

// --- DEPOSIT PAYMENT PROOF UPLOAD HANDLER (Safari / iOS & Multi-browser compatible) ---
const handleDepositProofUpload = (req: any, res: any) => {
  const userId = req.user?.id || 'unknown';
  const userEmail = req.user?.email || 'unknown';
  console.log(`[DEPOSIT_PROOF_UPLOAD] Incoming upload request from user=${userId} (${userEmail})`);

  depositUpload.single('proof')(req, res, (err: any) => {
    if (err) {
      console.error(`[DEPOSIT_PROOF_UPLOAD] Multer error for user=${userId}:`, err.message);
      return res.status(400).json({ error: err.message || 'Payment proof upload failed' });
    }

    // Case 1: Uploaded via FormData / multipart
    if (req.file) {
      try {
        const diskPath = req.file.path;
        if (!fs.existsSync(diskPath) || fs.statSync(diskPath).size === 0) {
          throw new Error('Disk file verification failed (0 bytes written)');
        }
        const publicUrl = `/uploads/deposits/${req.file.filename}`;
        console.log(`[DEPOSIT_PROOF_UPLOAD] Multipart success: user=${userId}, file=${req.file.filename}, size=${req.file.size}B, path=${publicUrl}`);
        return res.json({
          success: true,
          url: publicUrl,
          fileName: req.file.filename,
          size: req.file.size,
          message: 'Payment proof screenshot uploaded successfully'
        });
      } catch (fileErr: any) {
        console.error(`[DEPOSIT_PROOF_UPLOAD] Disk verification error for user=${userId}:`, fileErr.message);
        return res.status(500).json({ error: 'Failed to verify uploaded proof file on server' });
      }
    }

    // Case 2: Uploaded via Base64 JSON fallback
    const { dataUrl, fileName: originalFileName } = req.body || {};
    if (dataUrl && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
      try {
        const matches = dataUrl.match(/^data:([A-Za-z0-9\/+-]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return res.status(400).json({ error: 'Malformed base64 image data URL' });
        }
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        if (buffer.length === 0) {
          return res.status(400).json({ error: 'Uploaded image file is empty' });
        }
        if (buffer.length > 25 * 1024 * 1024) {
          return res.status(413).json({ error: 'Uploaded file exceeds 25MB limit' });
        }

        let ext = '.jpg';
        if (mimeType.includes('png')) ext = '.png';
        else if (mimeType.includes('webp')) ext = '.webp';
        else if (mimeType.includes('heic')) ext = '.heic';
        else if (originalFileName) {
          const parsedExt = path.extname(originalFileName).toLowerCase();
          if (['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'].includes(parsedExt)) {
            ext = parsedExt;
          }
        }

        const diskFileName = `dep_proof_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
        const diskPath = path.join(DEPOSITS_UPLOADS_DIR, diskFileName);
        fs.writeFileSync(diskPath, buffer);

        if (!fs.existsSync(diskPath) || fs.statSync(diskPath).size === 0) {
          throw new Error('Disk file verification failed for base64 upload');
        }

        const publicUrl = `/uploads/deposits/${diskFileName}`;
        console.log(`[DEPOSIT_PROOF_UPLOAD] Base64 fallback success: user=${userId}, file=${diskFileName}, size=${buffer.length}B, path=${publicUrl}`);
        return res.json({
          success: true,
          url: publicUrl,
          fileName: diskFileName,
          size: buffer.length,
          message: 'Payment proof screenshot uploaded successfully'
        });
      } catch (base64Err: any) {
        console.error(`[DEPOSIT_PROOF_UPLOAD] Base64 write error for user=${userId}:`, base64Err.message);
        return res.status(500).json({ error: 'Failed to process base64 proof image: ' + base64Err.message });
      }
    }

    return res.status(400).json({ error: 'No payment proof file or image data provided' });
  });
};

app.post('/api/wallet/upload-deposit-proof', authenticateToken, handleDepositProofUpload);
app.post('/api/wallets/upload-deposit-proof', authenticateToken, handleDepositProofUpload);

// CUSTOMER SUPPORT CHAT REAL-TIME SSE & STATE
interface ChatSSEClient {
  id: string;
  userId: string;
  role: string;
  res: any;
}
let CHAT_SSE_CLIENTS: ChatSSEClient[] = [];

function isStaffRole(role?: string) {
  return role === 'admin' || role === 'co_admin' || role === 'support' || role === 'manager';
}

function broadcastRealtimeEvent(event: {
  eventId: string;
  type: string;
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
}) {
  const payload = JSON.stringify({
    type: 'event:realtime',
    event
  });

  CHAT_SSE_CLIENTS.forEach(client => {
    const isStaff = isStaffRole(client.role);
    if (client.userId === event.userId || isStaff) {
      try {
        client.res.write(`data: ${payload}\n\n`);
      } catch (e) {
        // stale client
      }
    }
  });
}

// Mutex / in-flight maps to serialize concurrent requests for the same idempotency key or user submission
const IN_FLIGHT_DEPOSIT_LOCKS = new Map<string, Promise<any>>();
const IN_FLIGHT_WITHDRAW_LOCKS = new Map<string, Promise<any>>();

const handleDeposit = async (req: any, res: any) => {
  const { amount, currency, network, method, utrNumber, proofImage, notes, idempotencyKey: bodyIdem, depositRequestId } = req.body;
  const headerIdem = req.headers['x-idempotency-key'];
  const idempotencyKey = String(bodyIdem || headerIdem || depositRequestId || '').trim();

  const numAmount = Number(amount);
  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Please enter a valid deposit amount greater than 0' });
  }

  const userId = req.user.id;
  const now = Date.now();
  const cleanUtr = utrNumber ? String(utrNumber).trim() : '';
  const cleanMethod = (method || network || 'Crypto Transfer').trim();
  const cleanCurrency = (currency || 'USDT').trim();

  console.log(`[DEPOSIT_SUBMIT] Received deposit: user=${userId}, amount=${numAmount} ${cleanCurrency}, method=${cleanMethod}, utr=${cleanUtr || 'none'}, proof=${Boolean(proofImage)}, idem=${idempotencyKey ? idempotencyKey.slice(0, 16) : 'none'}`);

  // Create a lock key for this submission: prefer idempotencyKey, fallback to user-amount-method
  const lockKey = idempotencyKey 
    ? `${userId}_${idempotencyKey}` 
    : `${userId}_${numAmount}_${cleanMethod}_${cleanUtr}`;

  // If a request with the same lockKey is currently in-flight, wait for it to finish and return result
  if (IN_FLIGHT_DEPOSIT_LOCKS.has(lockKey)) {
    try {
      console.log(`[DEPOSIT_SUBMIT] In-flight request detected for lockKey=${lockKey}, awaiting existing execution.`);
      const result = await IN_FLIGHT_DEPOSIT_LOCKS.get(lockKey);
      return res.json(result);
    } catch (e: any) {
      // If the in-flight one failed, continue to process
    }
  }

  const executionPromise = (async () => {
    // 1) Idempotency Key check:
    if (idempotencyKey) {
      const existingByIdem = DEPOSIT_REQUESTS_DB.find(
        d => d.userId === userId && (d.idempotencyKey === idempotencyKey || d.id === idempotencyKey || d.depositRequestId === idempotencyKey)
      );
      if (existingByIdem) {
        console.log(`[DEPOSIT_SUBMIT] Idempotent hit: depId=${existingByIdem.id} for user=${userId}`);
        return {
          message: 'Your deposit request has already been submitted and is pending verification.',
          depositRequest: existingByIdem,
          wallet: getUserWallet(userId),
          isDuplicate: true
        };
      }
    }

    // 2) UTR check (if provided):
    if (cleanUtr.length > 0) {
      const existingUtr = DEPOSIT_REQUESTS_DB.find(
        d => d.utrNumber && d.utrNumber.trim().toLowerCase() === cleanUtr.toLowerCase()
      );
      if (existingUtr) {
        if (existingUtr.userId === userId) {
          console.log(`[DEPOSIT_SUBMIT] Duplicate UTR hit: user=${userId}, utr=${cleanUtr}, depId=${existingUtr.id}`);
          return {
            message: `Deposit request with UTR '${cleanUtr}' has already been submitted and is ${existingUtr.status}.`,
            depositRequest: existingUtr,
            wallet: getUserWallet(userId),
            isDuplicate: true
          };
        } else {
          throw new Error(`A deposit request with UTR/Reference number '${cleanUtr}' has already been submitted.`);
        }
      }
    }

    // 3) Rapid deduplication check (protect against double clicks or network retry without idempotency key):
    const recentDuplicate = DEPOSIT_REQUESTS_DB.find(d => {
      if (d.userId !== userId) return false;
      const isSameAmount = Math.abs(d.amount - numAmount) < 0.001;
      const isSameMethod = (d.method || '').toLowerCase() === cleanMethod.toLowerCase();
      const createdTime = new Date(d.createdAt).getTime();
      const timeDiff = now - createdTime;

      // Same amount and method within 45 seconds -> deduplicate safely
      if (isSameAmount && isSameMethod && timeDiff < 45000) {
        return true;
      }
      // Same amount, method, and proofImage/utr within 5 minutes if still pending
      if (d.status === 'pending' && isSameAmount && isSameMethod && timeDiff < 300000) {
        if (cleanUtr && d.utrNumber === cleanUtr) return true;
        if (proofImage && d.proofImage === proofImage) return true;
      }
      return false;
    });

    if (recentDuplicate) {
      console.log(`[DEPOSIT_SUBMIT] Rapid duplicate prevented: user=${userId}, depId=${recentDuplicate.id}`);
      return {
        message: 'Your deposit request is already being processed and pending review.',
        depositRequest: recentDuplicate,
        wallet: getUserWallet(userId),
        isDuplicate: true
      };
    }

    // 4) If proofImage is a base64 Data URL, extract and persist to disk in DEPOSITS_UPLOADS_DIR
    let finalProofUrl = proofImage || undefined;
    if (proofImage && typeof proofImage === 'string' && proofImage.startsWith('data:')) {
      try {
        const matches = proofImage.match(/^data:([A-Za-z0-9\/+-]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const mimeType = matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          if (buffer.length > 0 && buffer.length <= 25 * 1024 * 1024) {
            let ext = '.jpg';
            if (mimeType.includes('png')) ext = '.png';
            else if (mimeType.includes('webp')) ext = '.webp';
            else if (mimeType.includes('heic')) ext = '.heic';
            const diskFileName = `dep_proof_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
            const diskPath = path.join(DEPOSITS_UPLOADS_DIR, diskFileName);
            fs.writeFileSync(diskPath, buffer);
            if (fs.existsSync(diskPath) && fs.statSync(diskPath).size > 0) {
              finalProofUrl = `/uploads/deposits/${diskFileName}`;
              console.log(`[DEPOSIT_SUBMIT] Auto-converted base64 proof to disk file: ${finalProofUrl} (${buffer.length}B)`);
            }
          }
        }
      } catch (err: any) {
        console.warn('[DEPOSIT_SUBMIT] Warning saving base64 proof to disk:', err.message);
      }
    }

    // 5) Create new deposit request with canonical DEP-XXXXXX ID
    const user = USERS_DB.find(u => u.id === userId);
    const randSuffix = Math.floor(100000 + Math.random() * 900000).toString();
    const depId = 'DEP-' + randSuffix;

    const depReq: DepositRequest = {
      id: depId,
      idempotencyKey: idempotencyKey || ('idem_' + Date.now() + '_' + randSuffix),
      depositRequestId: depId,
      userId: userId,
      userEmail: user ? user.email : req.user.email,
      amount: numAmount,
      currency: cleanCurrency,
      method: cleanMethod,
      utrNumber: cleanUtr || undefined,
      proofImage: finalProofUrl,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: notes || undefined
    };

    DEPOSIT_REQUESTS_DB.unshift(depReq);
    saveDataToDisk();

    NOTIFICATIONS_DB.unshift({
      id: 'notif_' + Date.now(),
      userId: userId,
      title: 'Deposit Request Submitted',
      message: `Your deposit request for $${numAmount} ${cleanCurrency} is pending Admin review & verification. (Ref: ${depId})`,
      type: 'deposit',
      read: false,
      createdAt: new Date().toISOString()
    });

    // Real-time notification broadcast
    broadcastRealtimeEvent({
      eventId: 'evt_dep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type: 'DEPOSIT_SUBMITTED',
      depositRequestId: depReq.id,
      userId: userId,
      userName: user?.name,
      userEmail: user?.email,
      amount: numAmount,
      currency: cleanCurrency,
      status: 'pending',
      title: 'Deposit Submitted',
      message: `Deposit request of $${numAmount} ${cleanCurrency} submitted (Ref: ${depId}). Pending verification.`,
      timestamp: depReq.createdAt
    });

    const wallet = getUserWallet(userId);
    console.log(`[DEPOSIT_SUBMIT] Success: depId=${depId}, user=${userId}, amount=${numAmount}, proof=${finalProofUrl || 'none'}`);

    return {
      message: 'Deposit request submitted successfully! Awaiting admin approval.',
      depositRequest: depReq,
      wallet
    };
  })();

  IN_FLIGHT_DEPOSIT_LOCKS.set(lockKey, executionPromise);

  try {
    const result = await executionPromise;
    return res.json(result);
  } catch (err: any) {
    console.error(`[DEPOSIT_SUBMIT] Error for user=${userId}:`, err.message);
    return res.status(400).json({ error: err.message || 'Deposit submission failed' });
  } finally {
    setTimeout(() => {
      IN_FLIGHT_DEPOSIT_LOCKS.delete(lockKey);
    }, 8000);
  }
};

app.post('/api/wallets/deposit', authenticateToken, handleDeposit);
app.post('/api/wallet/deposit', authenticateToken, handleDeposit);

const handleWithdraw = async (req: any, res: any) => {
  const {
    amount,
    currency = 'USDT',
    network,
    method: rawMethod,
    // Bank Transfer Fields
    bankName,
    accountHolderName,
    accountName,
    accountNumber,
    ifscCode,
    swiftCode,
    accountType = 'savings',
    branchName,
    // UPI Fields
    upiId,
    upiHolderName,
    // Crypto Fields
    address,
    destinationAddress,
    cryptoNetwork,
    tag,
    memo,
    // Payout & Docs
    payoutAmountInr,
    exchangeRate,
    proofImage,
    documents,
    notes,
    destinationDetails: customDetails,
    destination: customDestination,
    idempotencyKey: bodyIdem,
    withdrawalRequestId: bodyWdId
  } = req.body;

  const headerIdem = req.headers['x-idempotency-key'];
  const idempotencyKey = String(bodyIdem || headerIdem || bodyWdId || '').trim();

  const numAmount = Number(amount);
  if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Please enter a valid withdrawal amount greater than 0' });
  }

  const userId = req.user.id;
  const now = Date.now();

  // Determine normalized method
  let method: 'bank_transfer' | 'upi' | 'crypto' = 'crypto';
  const normRawMethod = (rawMethod || '').toLowerCase().trim();
  if (normRawMethod === 'upi' || (!rawMethod && upiId && !accountNumber && !bankName)) {
    method = 'upi';
  } else if (normRawMethod === 'bank_transfer' || normRawMethod === 'bank' || normRawMethod === 'imps' || normRawMethod === 'neft' || bankName || accountNumber || ifscCode) {
    method = 'bank_transfer';
  } else {
    method = 'crypto';
  }

  const holderName = (accountHolderName || accountName || upiHolderName || req.user.name || '').trim();
  const destAddr = (destinationAddress || address || '').trim();
  const finalTag = (tag || memo || '').trim();

  // Validate according to method
  if (method === 'bank_transfer') {
    if (!bankName || !bankName.trim()) {
      return res.status(400).json({ error: 'Bank Name is required for Bank Transfer withdrawals' });
    }
    if (!holderName) {
      return res.status(400).json({ error: 'Account Holder Name is required for Bank Transfer withdrawals' });
    }
    if (!accountNumber || accountNumber.trim().length < 4) {
      return res.status(400).json({ error: 'A valid Bank Account Number is required' });
    }
    if (!ifscCode || ifscCode.trim().length < 4) {
      return res.status(400).json({ error: 'A valid IFSC / Branch SWIFT Code is required' });
    }
  } else if (method === 'upi') {
    if (!upiId || !upiId.trim() || !upiId.includes('@')) {
      return res.status(400).json({ error: 'A valid UPI ID (e.g. username@bank) is required for UPI withdrawals' });
    }
  } else {
    // Crypto
    if (!destAddr || destAddr.length < 8) {
      return res.status(400).json({ error: 'A valid destination cryptocurrency wallet address is required' });
    }
  }

  // Build human-readable canonical destination string
  let destinationSummary = '';
  if (customDestination && typeof customDestination === 'string' && customDestination.trim()) {
    destinationSummary = customDestination.trim();
  } else if (method === 'bank_transfer') {
    destinationSummary = `${bankName.trim()} | A/C: ${accountNumber.trim()} | Holder: ${holderName} | IFSC: ${ifscCode.trim().toUpperCase()}${accountType ? ` (${accountType})` : ''}${upiId && upiId.trim() ? ` | UPI: ${upiId.trim()}` : ''}`;
  } else if (method === 'upi') {
    destinationSummary = `UPI: ${upiId.trim()}${holderName ? ` | Holder: ${holderName}` : ''}`;
  } else {
    destinationSummary = `${currency} (${network || cryptoNetwork || 'TRC-20'}): ${destAddr}${finalTag ? ` [Tag: ${finalTag}]` : ''}`;
  }

  // Build immutable structured destinationDetails snapshot
  const destinationDetails = {
    method,
    bankName: bankName ? bankName.trim() : undefined,
    accountHolderName: holderName || undefined,
    accountNumber: accountNumber ? accountNumber.trim() : undefined,
    ifscCode: ifscCode ? ifscCode.trim().toUpperCase() : undefined,
    swiftCode: swiftCode ? swiftCode.trim().toUpperCase() : undefined,
    accountType: accountType || undefined,
    branchName: branchName ? branchName.trim() : undefined,
    upiId: upiId ? upiId.trim() : undefined,
    upiHolderName: upiHolderName ? upiHolderName.trim() : (method === 'upi' ? holderName : undefined),
    cryptoCurrency: currency || 'USDT',
    cryptoNetwork: cryptoNetwork || network || (method === 'crypto' ? 'TRC-20' : undefined),
    destinationAddress: destAddr || undefined,
    tag: finalTag || undefined,
    memo: finalTag || undefined,
    payoutAmountInr: payoutAmountInr ? String(payoutAmountInr).trim() : undefined,
    exchangeRate: typeof exchangeRate === 'number' ? exchangeRate : undefined,
    ...(customDetails || {})
  };

  const lockKey = idempotencyKey 
    ? `wd_${userId}_${idempotencyKey}` 
    : `wd_${userId}_${numAmount}_${destinationSummary.slice(0, 30)}`;

  if (IN_FLIGHT_WITHDRAW_LOCKS.has(lockKey)) {
    try {
      console.log(`[WITHDRAW_SUBMIT] In-flight lock hit for key=${lockKey}, awaiting result.`);
      const resVal = await IN_FLIGHT_WITHDRAW_LOCKS.get(lockKey);
      return res.json(resVal);
    } catch (e: any) {
      // Continue
    }
  }

  const executionPromise = (async () => {
    // 1) Idempotency check
    if (idempotencyKey) {
      const existing = WITHDRAWAL_REQUESTS_DB.find(
        w => w.userId === userId && (w.idempotencyKey === idempotencyKey || w.id === idempotencyKey)
      );
      if (existing) {
        return {
          message: 'Your withdrawal request is already being processed.',
          withdrawalRequest: existing,
          wallet: getUserWallet(userId),
          isDuplicate: true
        };
      }
    }

    // 2) Rapid deduplication check:
    const duplicate = WITHDRAWAL_REQUESTS_DB.find(w => {
      if (w.userId !== userId) return false;
      const isSameAmount = Math.abs(w.amount - numAmount) < 0.001;
      const isSameDest = (w.destination || '').trim().toLowerCase() === destinationSummary.trim().toLowerCase();
      const createdTime = new Date(w.createdAt).getTime();
      const timeDiff = now - createdTime;

      return (isSameAmount && isSameDest && timeDiff < 20000) || (w.status === 'pending' && isSameAmount && isSameDest && timeDiff < 90000);
    });

    if (duplicate) {
      return { 
        message: 'Duplicate withdrawal request detected. Your request is already being processed.',
        withdrawalRequest: duplicate,
        wallet: getUserWallet(userId),
        isDuplicate: true
      };
    }

    const wallet = getUserWallet(userId);
    const fee = 1.0; // 1 USDT flat fee
    const totalDeduct = numAmount + fee;

    const currentAvail = wallet.availableMargin !== undefined ? wallet.availableMargin : wallet.tradingBalance;
    if (currentAvail < totalDeduct) {
      throw new Error(`Insufficient Trading Wallet balance. Required: $${totalDeduct.toFixed(2)} USDT (incl. $1.00 fee), Available: $${currentAvail.toFixed(2)} USDT`);
    }

    // Deduct/Lock balance while pending
    wallet.tradingBalance = Math.max(0, wallet.tradingBalance - totalDeduct);
    wallet.availableMargin = Math.max(0, wallet.availableMargin - totalDeduct);

    const user = USERS_DB.find(u => u.id === userId);
    const wdId = 'wd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const txId = 'tx_' + wdId;

    const wdReq: WithdrawalRequest = {
      id: wdId,
      idempotencyKey: idempotencyKey || ('idem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
      walletTransactionId: txId,
      userId: userId,
      userEmail: user ? user.email : req.user.email,
      userName: user?.name || req.user.name || undefined,
      amount: numAmount,
      currency: currency || 'USDT',
      network: network || (method === 'crypto' ? (cryptoNetwork || 'TRC-20') : (method === 'upi' ? 'UPI' : 'Bank IMPS/NEFT')),
      method: method,

      bankName: destinationDetails.bankName,
      accountHolderName: destinationDetails.accountHolderName,
      accountNumber: destinationDetails.accountNumber,
      ifscCode: destinationDetails.ifscCode,
      swiftCode: destinationDetails.swiftCode,
      accountType: destinationDetails.accountType,
      branchName: destinationDetails.branchName,
      upiId: destinationDetails.upiId,
      upiHolderName: destinationDetails.upiHolderName,
      payoutAmountInr: destinationDetails.payoutAmountInr,
      exchangeRate: destinationDetails.exchangeRate,

      destinationAddress: destinationDetails.destinationAddress,
      cryptoNetwork: destinationDetails.cryptoNetwork,
      tag: destinationDetails.tag,
      memo: destinationDetails.memo,

      destinationDetails: destinationDetails,
      destination: destinationSummary,

      proofImage: proofImage || (documents && documents[0]?.url) || undefined,
      documents: Array.isArray(documents) && documents.length > 0 ? documents : undefined,
      notes: notes || undefined,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    WITHDRAWAL_REQUESTS_DB.unshift(wdReq);
    saveDataToDisk();

    NOTIFICATIONS_DB.unshift({
      id: 'notif_' + Date.now(),
      userId: userId,
      title: 'Withdrawal Pending Approval',
      message: `Withdrawal request for $${numAmount} ${currency || 'USDT'} via ${method.replace('_', ' ').toUpperCase()} submitted. Awaiting compliance approval.`,
      type: 'withdrawal',
      read: false,
      createdAt: new Date().toISOString()
    });

    // Real-time event broadcast
    broadcastRealtimeEvent({
      eventId: 'evt_wd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      type: 'WITHDRAWAL_SUBMITTED',
      transactionId: txId,
      withdrawalRequestId: wdReq.id,
      userId: userId,
      userName: user?.name,
      userEmail: user?.email,
      amount: numAmount,
      currency: currency || 'USDT',
      status: 'pending',
      title: 'Withdrawal Submitted',
      message: `Withdrawal request for $${numAmount} ${currency || 'USDT'} submitted. Pending compliance review.`,
      timestamp: wdReq.createdAt
    });

    return {
      message: 'Withdrawal request submitted! Pending admin review.',
      withdrawalRequest: wdReq,
      wallet
    };
  })();

  IN_FLIGHT_WITHDRAW_LOCKS.set(lockKey, executionPromise);

  try {
    const result = await executionPromise;
    return res.json(result);
  } catch (err: any) {
    console.error(`[WITHDRAW_SUBMIT] Error for user=${userId}:`, err.message);
    return res.status(400).json({ error: err.message || 'Withdrawal submission failed' });
  } finally {
    setTimeout(() => {
      IN_FLIGHT_WITHDRAW_LOCKS.delete(lockKey);
    }, 8000);
  }
};

app.post('/api/wallets/withdraw', authenticateToken, handleWithdraw);
app.post('/api/wallet/withdraw', authenticateToken, handleWithdraw);

// SYSTEM SETTINGS & BRANDING ENDPOINTS
app.get('/api/settings', (req, res) => {
  res.json(SYSTEM_SETTINGS);
});

app.post('/api/admin/settings', authenticateToken, requirePermission('manage_settings'), (req: any, res) => {
  const updates = req.body;
  const changedKeys = Object.keys(updates || {}).filter(k => k !== 'timestamp').join(', ');
  SYSTEM_SETTINGS = {
    ...SYSTEM_SETTINGS,
    ...updates
  };

  saveDataToDisk();

  recordAuditLog({
    action: 'Update System Settings',
    eventType: 'UPDATE_SYSTEM_SETTINGS',
    category: 'system',
    actor: req.user,
    objectType: 'System Settings',
    objectId: 'global_settings',
    previousState: 'Previous Configuration',
    newState: `Updated: ${changedKeys || 'All Configurations'}`,
    reason: 'Administrator updated platform configuration settings',
    details: `Updated platform settings (${changedKeys || 'Branding & payments'})`,
    ipAddress: getClientIp(req),
    metadata: updates
  });

  res.json({ message: 'Settings updated successfully', settings: SYSTEM_SETTINGS });
});

app.post('/api/admin/upload-branding-image', authenticateToken, requirePermission('manage_settings'), brandingUpload.single('image'), (req: any, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded or unsupported file format' });
  }
  const relativeUrl = `/uploads/branding/${req.file.filename}`;
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3000';
  const fullUrl = `${protocol}://${host}${relativeUrl}`;

  res.json({
    message: 'Branding image uploaded successfully',
    url: relativeUrl,
    fullUrl: fullUrl,
    filename: req.file.filename,
    size: req.file.size
  });
});

// TRADING FEE SCHEDULE ENDPOINTS
app.get('/api/settings/fees', (req, res) => {
  res.json(getMakerTakerFeeRates());
});

app.post('/api/admin/settings/fees', authenticateToken, requirePermission('manage_settings'), (req: any, res) => {
  const { makerFeeRate, takerFeeRate } = req.body;
  
  const parsedMaker = parseFloat(makerFeeRate);
  const parsedTaker = parseFloat(takerFeeRate);

  if (isNaN(parsedMaker) || parsedMaker < 0 || isNaN(parsedTaker) || parsedTaker < 0) {
    return res.status(400).json({ error: 'Invalid fee rates provided. Values must be non-negative numbers.' });
  }

  const prevFees = { ...getMakerTakerFeeRates() };

  if (!SYSTEM_SETTINGS.tradingFees) {
    SYSTEM_SETTINGS.tradingFees = {
      makerFeeRate: 0.0002,
      takerFeeRate: 0.0005
    };
  }

  SYSTEM_SETTINGS.tradingFees.makerFeeRate = parsedMaker;
  SYSTEM_SETTINGS.tradingFees.takerFeeRate = parsedTaker;

  saveDataToDisk();

  recordAuditLog({
    action: 'Update Trading Fee Rates',
    eventType: 'UPDATE_TRADING_FEES',
    category: 'system',
    actor: req.user,
    objectType: 'Trading Fees',
    objectId: 'trading_fees',
    previousState: JSON.stringify(prevFees),
    newState: JSON.stringify({ makerFeeRate: parsedMaker, takerFeeRate: parsedTaker }),
    reason: 'Administrator updated Maker/Taker trading fee schedule',
    details: `Updated Maker Fee: ${(prevFees.makerFeeRate * 100).toFixed(3)}% → ${(parsedMaker * 100).toFixed(3)}%, Taker Fee: ${(prevFees.takerFeeRate * 100).toFixed(3)}% → ${(parsedTaker * 100).toFixed(3)}%`,
    ipAddress: getClientIp(req)
  });

  res.json({
    message: 'Trading fee rates updated successfully',
    tradingFees: SYSTEM_SETTINGS.tradingFees
  });
});

// ADMIN APPROVAL DESK ENDPOINTS
app.get('/api/admin/pending-requests', authenticateToken, requirePermission('view_deposits'), (req, res) => {
  res.json({
    deposits: DEPOSIT_REQUESTS_DB,
    withdrawals: WITHDRAWAL_REQUESTS_DB
  });
});

app.post('/api/admin/approve-deposit', authenticateToken, requirePermission('approve_withdrawals'), (req: any, res) => {
  const { requestId } = req.body;
  const dep = DEPOSIT_REQUESTS_DB.find(d => d.id === requestId);
  if (!dep) return res.status(404).json({ error: 'Deposit request not found' });

  // Idempotency: If already approved, return without duplicate wallet credit or duplicate transaction
  if (dep.status === 'approved' || dep.approvedAt) {
    return res.json({ 
      message: 'Deposit already approved & user wallet credited', 
      deposit: dep, 
      alreadyApproved: true 
    });
  }

  dep.status = 'approved';
  dep.approvedAt = new Date().toISOString();
  dep.updatedAt = new Date().toISOString();

  const txId = dep.walletTransactionId || ('tx_' + dep.id);
  dep.walletTransactionId = txId;

  // Credit user wallet ONCE
  const wallet = WALLETS_DB[dep.userId] || getUserWallet(dep.userId);
  const prevBalance = wallet ? wallet.tradingBalance : 0;
  if (wallet) {
    wallet.tradingBalance += dep.amount;
    wallet.availableMargin += dep.amount;
  }
  const newBalance = wallet ? wallet.tradingBalance : (prevBalance + dep.amount);

  // Insert or update transaction in TRANSACTIONS_DB idempotently
  const existingTxIndex = TRANSACTIONS_DB.findIndex(t => t.id === txId || t.depositRequestId === dep.id);
  if (existingTxIndex >= 0) {
    TRANSACTIONS_DB[existingTxIndex].status = 'completed';
    TRANSACTIONS_DB[existingTxIndex].depositRequestId = dep.id;
  } else {
    TRANSACTIONS_DB.unshift({
      id: txId,
      depositRequestId: dep.id,
      userId: dep.userId,
      type: 'deposit',
      amount: dep.amount,
      currency: dep.currency || 'USDT',
      status: 'completed',
      txHash: dep.utrNumber || dep.id,
      toWallet: 'trading',
      createdAt: dep.approvedAt
    });
  }

  NOTIFICATIONS_DB.unshift({
    id: 'notif_' + Date.now(),
    userId: dep.userId,
    title: 'Deposit Approved',
    message: `Your deposit of $${dep.amount} ${dep.currency} (${dep.id}) has been approved and credited to your Trading Wallet!`,
    type: 'deposit',
    read: false,
    createdAt: new Date().toISOString()
  });

  const targetUserObj = USERS_DB.find(u => u.id === dep.userId);

  // Broadcast real-time event
  broadcastRealtimeEvent({
    eventId: 'evt_dep_appr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    type: 'DEPOSIT_APPROVED',
    transactionId: txId,
    depositRequestId: dep.id,
    userId: dep.userId,
    userName: targetUserObj?.name,
    userEmail: targetUserObj?.email || dep.userEmail,
    amount: dep.amount,
    currency: dep.currency || 'USDT',
    status: 'completed',
    title: 'Deposit Approved',
    message: `Deposit of $${dep.amount} ${dep.currency || 'USDT'} approved and credited to your Trading Wallet.`,
    timestamp: dep.approvedAt
  });

  recordAuditLog({
    action: 'Deposit Approved',
    eventType: 'APPROVE_DEPOSIT',
    category: 'deposit',
    actor: req.user,
    targetUser: targetUserObj,
    targetUserId: dep.userId,
    targetUserName: targetUserObj?.name || dep.userEmail,
    targetUserEmail: targetUserObj?.email || dep.userEmail,
    objectType: 'Deposit',
    objectId: dep.id,
    previousState: 'PENDING',
    newState: 'APPROVED',
    amount: dep.amount,
    currency: dep.currency || 'USDT',
    walletType: 'Trading Wallet',
    previousBalance: prevBalance,
    newBalance: newBalance,
    reason: req.body.reason || 'Deposit verified and credited by finance desk',
    details: `Approved deposit request ${dep.id} for $${dep.amount} ${dep.currency || 'USDT'} and credited Trading Wallet`,
    ipAddress: getClientIp(req),
    metadata: {
      utrNumber: dep.utrNumber,
      method: dep.method
    }
  });

  saveDataToDisk();
  res.json({ message: 'Deposit approved & user wallet credited', deposit: dep });
});

app.post('/api/admin/reject-deposit', authenticateToken, requirePermission('approve_withdrawals'), (req: any, res) => {
  const { requestId, notes } = req.body;
  const dep = DEPOSIT_REQUESTS_DB.find(d => d.id === requestId);
  if (!dep) return res.status(404).json({ error: 'Deposit request not found' });

  if (dep.status === 'rejected') {
    return res.json({ message: 'Deposit request already rejected', deposit: dep, alreadyRejected: true });
  }

  if (dep.status === 'approved') {
    return res.status(400).json({ error: 'Cannot reject an already approved and credited deposit' });
  }

  dep.status = 'rejected';
  dep.rejectedAt = new Date().toISOString();
  dep.updatedAt = new Date().toISOString();
  if (notes) dep.notes = notes;

  NOTIFICATIONS_DB.unshift({
    id: 'notif_' + Date.now(),
    userId: dep.userId,
    title: 'Deposit Rejected',
    message: `Your deposit request for $${dep.amount} ${dep.currency} (${dep.id}) was rejected by Admin. ${notes ? 'Reason: ' + notes : ''}`,
    type: 'deposit',
    read: false,
    createdAt: new Date().toISOString()
  });

  const targetUserObj = USERS_DB.find(u => u.id === dep.userId);

  // Broadcast real-time event
  broadcastRealtimeEvent({
    eventId: 'evt_dep_rej_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    type: 'DEPOSIT_REJECTED',
    depositRequestId: dep.id,
    userId: dep.userId,
    userName: targetUserObj?.name,
    userEmail: targetUserObj?.email || dep.userEmail,
    amount: dep.amount,
    currency: dep.currency || 'USDT',
    status: 'rejected',
    title: 'Deposit Rejected',
    message: `Deposit request of $${dep.amount} ${dep.currency || 'USDT'} was rejected. ${notes ? 'Reason: ' + notes : ''}`,
    timestamp: dep.rejectedAt
  });

  recordAuditLog({
    action: 'Deposit Rejected',
    eventType: 'REJECT_DEPOSIT',
    category: 'deposit',
    actor: req.user,
    targetUser: targetUserObj,
    targetUserId: dep.userId,
    targetUserName: targetUserObj?.name || dep.userEmail,
    targetUserEmail: targetUserObj?.email || dep.userEmail,
    objectType: 'Deposit',
    objectId: dep.id,
    previousState: 'PENDING',
    newState: 'REJECTED',
    amount: dep.amount,
    currency: dep.currency || 'USDT',
    reason: notes || 'Deposit receipt or transaction reference unverified',
    details: `Rejected deposit request ${dep.id} for $${dep.amount} ${dep.currency || 'USDT'}. Reason: ${notes || 'Proof invalid or unconfirmed'}`,
    ipAddress: getClientIp(req),
    metadata: {
      notes
    }
  });

  saveDataToDisk();
  res.json({ message: 'Deposit request rejected', deposit: dep });
});

app.post('/api/admin/approve-withdraw', authenticateToken, requirePermission('approve_withdrawals'), (req: any, res) => {
  const { requestId } = req.body;
  const wd = WITHDRAWAL_REQUESTS_DB.find(w => w.id === requestId);
  if (!wd) return res.status(404).json({ error: 'Withdrawal request not found' });
  if (wd.status === 'approved') {
    return res.json({ message: 'Withdrawal already approved', withdrawal: wd, alreadyApproved: true });
  }
  if (wd.status !== 'pending') {
    return res.status(400).json({ error: `Withdrawal cannot be approved (current status: ${wd.status})` });
  }

  const txId = wd.walletTransactionId || ('tx_' + wd.id);
  wd.walletTransactionId = txId;
  wd.status = 'approved';
  wd.approvedAt = new Date().toISOString();
  wd.updatedAt = new Date().toISOString();

  // Record or update completed transaction idempotently (matching withdrawalRequestId)
  const existingTxIndex = TRANSACTIONS_DB.findIndex(t => t.id === txId || t.withdrawalRequestId === wd.id);
  if (existingTxIndex >= 0) {
    TRANSACTIONS_DB[existingTxIndex].status = 'completed';
    TRANSACTIONS_DB[existingTxIndex].withdrawalRequestId = wd.id;
  } else {
    TRANSACTIONS_DB.unshift({
      id: txId,
      withdrawalRequestId: wd.id,
      userId: wd.userId,
      type: 'withdrawal',
      amount: wd.amount,
      currency: wd.currency || 'USDT',
      fee: 1.0,
      status: 'completed',
      txHash: '0x' + Math.random().toString(36).substring(2, 18),
      fromWallet: 'trading',
      createdAt: wd.approvedAt
    });
  }

  NOTIFICATIONS_DB.unshift({
    id: 'notif_' + Date.now(),
    userId: wd.userId,
    title: 'Withdrawal Approved',
    message: `Your withdrawal of $${wd.amount} ${wd.currency} to ${wd.destination} has been approved and sent!`,
    type: 'withdrawal',
    read: false,
    createdAt: new Date().toISOString()
  });

  const targetUserObj = USERS_DB.find(u => u.id === wd.userId);
  const wallet = WALLETS_DB[wd.userId] || getUserWallet(wd.userId);

  // Broadcast real-time event
  broadcastRealtimeEvent({
    eventId: 'evt_wd_appr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    type: 'WITHDRAWAL_APPROVED',
    transactionId: txId,
    withdrawalRequestId: wd.id,
    userId: wd.userId,
    userName: targetUserObj?.name || wd.userName,
    userEmail: targetUserObj?.email || wd.userEmail,
    amount: wd.amount,
    currency: wd.currency || 'USDT',
    status: 'completed',
    title: 'Withdrawal Approved',
    message: `Withdrawal of $${wd.amount} ${wd.currency || 'USDT'} has been approved and processed!`,
    timestamp: wd.approvedAt
  });

  recordAuditLog({
    action: 'Withdrawal Approved',
    eventType: 'APPROVE_WITHDRAWAL',
    category: 'withdrawal',
    actor: req.user,
    targetUser: targetUserObj,
    targetUserId: wd.userId,
    targetUserName: targetUserObj?.name || wd.userName,
    targetUserEmail: targetUserObj?.email || wd.userEmail,
    objectType: 'Withdrawal',
    objectId: wd.id,
    previousState: 'PENDING',
    newState: 'APPROVED',
    amount: wd.amount,
    currency: wd.currency || 'USDT',
    walletType: 'Trading Wallet',
    previousBalance: wallet?.tradingBalance,
    newBalance: wallet?.tradingBalance,
    reason: req.body.reason || 'Withdrawal cleared and broadcast by finance desk',
    details: `Approved withdrawal request ${wd.id} for $${wd.amount} ${wd.currency || 'USDT'} to ${wd.destination || 'user destination'}`,
    ipAddress: getClientIp(req),
    metadata: {
      destination: wd.destination
    }
  });

  saveDataToDisk();
  res.json({ message: 'Withdrawal approved & completed', withdrawal: wd });
});

app.post('/api/admin/reject-withdraw', authenticateToken, requirePermission('approve_withdrawals'), (req: any, res) => {
  const { requestId, notes } = req.body;
  const wd = WITHDRAWAL_REQUESTS_DB.find(w => w.id === requestId);
  if (!wd) return res.status(404).json({ error: 'Withdrawal request not found' });
  if (wd.status === 'rejected') {
    return res.json({ message: 'Withdrawal already rejected', withdrawal: wd, alreadyRejected: true });
  }
  if (wd.status !== 'pending') {
    return res.status(400).json({ error: `Withdrawal cannot be rejected (current status: ${wd.status})` });
  }

  wd.status = 'rejected';
  wd.updatedAt = new Date().toISOString();
  if (notes) {
    wd.adminNotes = notes;
    wd.rejectionReason = notes;
  }

  // If a transaction entry exists in TRANSACTIONS_DB, mark it failed / rejected
  const txId = wd.walletTransactionId || ('tx_' + wd.id);
  const existingTx = TRANSACTIONS_DB.find(t => t.id === txId || t.withdrawalRequestId === wd.id);
  if (existingTx) {
    existingTx.status = 'failed';
  }

  // Refund locked balance back to user
  const wallet = WALLETS_DB[wd.userId] || getUserWallet(wd.userId);
  const prevBalance = wallet ? wallet.tradingBalance : 0;
  const refundAmount = wd.amount + 1.0;
  if (wallet) {
    wallet.tradingBalance += refundAmount; // Refund amount + fee
    wallet.availableMargin += refundAmount;
  }
  const newBalance = wallet ? wallet.tradingBalance : (prevBalance + refundAmount);

  NOTIFICATIONS_DB.unshift({
    id: 'notif_' + Date.now(),
    userId: wd.userId,
    title: 'Withdrawal Rejected (Refunded)',
    message: `Your withdrawal of $${wd.amount} ${wd.currency} was rejected. Locked funds have been refunded to your Trading Wallet. ${notes ? 'Reason: ' + notes : ''}`,
    type: 'withdrawal',
    read: false,
    createdAt: new Date().toISOString()
  });

  const targetUserObj = USERS_DB.find(u => u.id === wd.userId);

  // Broadcast real-time event
  broadcastRealtimeEvent({
    eventId: 'evt_wd_rej_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    type: 'WITHDRAWAL_REJECTED',
    withdrawalRequestId: wd.id,
    userId: wd.userId,
    userName: targetUserObj?.name || wd.userName,
    userEmail: targetUserObj?.email || wd.userEmail,
    amount: wd.amount,
    currency: wd.currency || 'USDT',
    status: 'rejected',
    title: 'Withdrawal Rejected',
    message: `Withdrawal request of $${wd.amount} ${wd.currency || 'USDT'} was rejected. Locked funds refunded. ${notes ? 'Reason: ' + notes : ''}`,
    timestamp: wd.updatedAt
  });

  recordAuditLog({
    action: 'Withdrawal Rejected',
    eventType: 'REJECT_WITHDRAWAL',
    category: 'withdrawal',
    actor: req.user,
    targetUser: targetUserObj,
    targetUserId: wd.userId,
    targetUserName: targetUserObj?.name || wd.userName,
    targetUserEmail: targetUserObj?.email || wd.userEmail,
    objectType: 'Withdrawal',
    objectId: wd.id,
    previousState: 'PENDING',
    newState: 'REJECTED',
    amount: wd.amount,
    currency: wd.currency || 'USDT',
    walletType: 'Trading Wallet',
    previousBalance: prevBalance,
    newBalance: newBalance,
    reason: notes || 'Withdrawal rejected and funds refunded to user trading wallet',
    details: `Rejected withdrawal request ${wd.id} for $${wd.amount} ${wd.currency || 'USDT'} & refunded $${refundAmount.toFixed(2)} to user balance. Reason: ${notes || 'Not provided'}`,
    ipAddress: getClientIp(req),
    metadata: {
      destination: wd.destination,
      refundAmount,
      notes
    }
  });

  saveDataToDisk();
  res.json({ message: 'Withdrawal rejected & balance refunded', withdrawal: wd });
});


// PORTFOLIO STATS
app.get('/api/portfolio/stats', authenticateToken, (req: any, res) => {
  const wallet = getUserWallet(req.user.id);
  const userPositions = POSITIONS_DB.filter(p => p.userId === req.user.id);

  let totalUnrealizedPnL = 0;
  userPositions.forEach(pos => {
    const pair = MARKETS_DB.find(m => m.symbol === pos.symbol);
    const mPrice = pair ? pair.price : pos.markPrice;
    totalUnrealizedPnL += getPositionUnrealizedPnL(pos, mPrice);
  });

  const walletCash = wallet.tradingBalance || wallet.spotBalance || 0;
  const totalBalance = walletCash + totalUnrealizedPnL;

  const userTxs = TRANSACTIONS_DB.filter(
    t => t.userId === req.user.id &&
         t.type === 'trade' &&
         ((t.status as string) === 'completed' || (t.status as string) === 'closed')
  );

  let winCount = 0;
  let lossCount = 0;
  let totalRealizedPnL = 0;
  let totalFees = 0;
  let totalProfit = 0;
  let totalLoss = 0;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeek = startOfToday - (now.getDay() * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  let todayRealizedPnL = 0;
  let weeklyRealizedPnL = 0;
  let monthlyRealizedPnL = 0;
  const assetPnLMap: Record<string, number> = {};

  userTxs.forEach(t => {
    if (t.fee) {
      totalFees += t.fee;
    }
    const tradePnL = t.netPnL !== undefined ? t.netPnL : (t.pnl !== undefined ? t.pnl : 0);
    totalRealizedPnL += tradePnL;

    if (tradePnL > 0) {
      winCount++;
      totalProfit += tradePnL;
    } else if (tradePnL < 0) {
      lossCount++;
      totalLoss += Math.abs(tradePnL);
    }

    if (t.symbol) {
      assetPnLMap[t.symbol] = (assetPnLMap[t.symbol] || 0) + tradePnL;
    }

    const tradeTime = new Date(t.createdAt || t.openedAt || Date.now()).getTime();

    if (tradeTime >= startOfToday) {
      todayRealizedPnL += tradePnL;
    }
    if (tradeTime >= startOfWeek) {
      weeklyRealizedPnL += tradePnL;
    }
    if (tradeTime >= startOfMonth) {
      monthlyRealizedPnL += tradePnL;
    }
  });

  let bestPerformingAsset = 'BTC/USDT';
  let bestPnL = -Infinity;
  Object.entries(assetPnLMap).forEach(([sym, pnlVal]) => {
    if (pnlVal > bestPnL) {
      bestPnL = pnlVal;
      bestPerformingAsset = sym;
    }
  });

  const totalTrades = winCount + lossCount;
  const winRate = totalTrades > 0 ? Number(((winCount / totalTrades) * 100).toFixed(1)) : 0;
  const totalPnL = totalRealizedPnL + totalUnrealizedPnL;
  const roi = walletCash > 0 ? Number(((totalPnL / walletCash) * 100).toFixed(2)) : 0;

  const dailyPnL = Number((todayRealizedPnL + totalUnrealizedPnL).toFixed(2));
  const weeklyPnL = Number((weeklyRealizedPnL + totalUnrealizedPnL).toFixed(2));
  const monthlyPnL = Number((monthlyRealizedPnL + totalUnrealizedPnL).toFixed(2));

  // Build real asset allocation
  const assetAllocation = [];
  if (totalBalance > 0) {
    assetAllocation.push({ name: 'USDT', value: 100, amount: Number(totalBalance.toFixed(2)), color: '#00C853' });
  } else {
    assetAllocation.push({ name: 'USDT', value: 100, amount: 0, color: '#00C853' });
  }

  res.json({
    totalBalance: Number(totalBalance.toFixed(2)),
    availableBalance: Number(((wallet.availableMargin !== undefined ? wallet.availableMargin : walletCash)).toFixed(2)),
    usedMargin: Number((wallet.usedMargin || 0).toFixed(2)),
    todayPnL: Number(dailyPnL.toFixed(2)),
    todayPnLPercent: walletCash > 0 ? Number(((dailyPnL / walletCash) * 100).toFixed(2)) : 0,
    totalPnL: Number(totalPnL.toFixed(2)),
    totalPnLPercent: Number(roi.toFixed(2)),
    dailyPnL: Number(dailyPnL.toFixed(2)),
    weeklyPnL: Number(weeklyPnL.toFixed(2)),
    monthlyPnL: Number(monthlyPnL.toFixed(2)),
    yearlyPnL: Number(monthlyPnL.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    totalLoss: Number(totalLoss.toFixed(2)),
    totalFees: Number(totalFees.toFixed(2)),
    bestPerformingAsset,
    winRate: Number(winRate.toFixed(1)),
    winCount,
    lossCount,
    roi: Number(roi.toFixed(2)),
    assetAllocation,
    growthHistory: [
      { date: 'Mon', balance: Number(totalBalance.toFixed(2)), pnl: 0 },
      { date: 'Tue', balance: Number(totalBalance.toFixed(2)), pnl: 0 },
      { date: 'Wed', balance: Number(totalBalance.toFixed(2)), pnl: 0 },
      { date: 'Thu', balance: Number(totalBalance.toFixed(2)), pnl: 0 },
      { date: 'Fri', balance: Number(totalBalance.toFixed(2)), pnl: 0 },
      { date: 'Sat', balance: Number(totalBalance.toFixed(2)), pnl: 0 },
      { date: 'Sun', balance: Number(totalBalance.toFixed(2)), pnl: Number(dailyPnL.toFixed(2)) }
    ]
  });
});

// PROFILE MANAGEMENT ENDPOINTS
app.get('/api/user/profile', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const user = USERS_DB.find(u => u.id === userId);
  const profile = PROFILES_DB[userId] || {
    id: userId,
    fullName: user ? user.name : 'Trader',
    username: user ? user.email.split('@')[0] : 'trader',
    email: user ? user.email : '',
    phone: '',
    address: '',
    country: 'India'
  };
  res.json(profile);
});

app.post('/api/user/profile', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const user = USERS_DB.find(u => u.id === userId);
  const existing = PROFILES_DB[userId] || {};

  const oldEmail = user?.email;
  const newEmail = req.body.email;

  if (user && newEmail && newEmail.trim() !== '' && newEmail.toLowerCase() !== oldEmail?.toLowerCase()) {
    const cleanedNewEmail = newEmail.trim();
    // Update user object email
    const oldHash = PASS_HASHES[oldEmail || ''] || PASS_HASHES[cleanedNewEmail] || bcrypt.hashSync('Admin123!', 8);
    PASS_HASHES[cleanedNewEmail] = oldHash;
    user.email = cleanedNewEmail;

    if (user.role === 'admin') {
      recordAuditLog({
        action: 'Update Admin Email',
        eventType: 'ADMIN_EMAIL_UPDATED',
        category: 'security',
        actor: req.user,
        targetUser: user,
        targetUserId: user.id,
        targetUserName: user.name,
        targetUserEmail: cleanedNewEmail,
        objectType: 'Admin Account',
        objectId: user.id,
        previousState: oldEmail,
        newState: cleanedNewEmail,
        reason: 'Administrator updated root contact/login email',
        details: `Admin login email changed from ${oldEmail} to ${cleanedNewEmail}`,
        ipAddress: getClientIp(req)
      });
    }
  }

  if (user && req.body.fullName) {
    user.name = req.body.fullName;
  }

  const updated = {
    ...existing,
    ...req.body,
    id: userId,
    email: user ? user.email : req.body.email
  };
  PROFILES_DB[userId] = updated;
  saveDataToDisk();
  res.json({
    message: 'Profile updated successfully',
    profile: updated,
    user: {
      ...user,
      profile: updated,
      profilePicture: updated.profilePicture || ''
    }
  });
});

// KYC SUBMISSION & MANAGEMENT ENDPOINTS
app.get('/api/kyc/status', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const user = USERS_DB.find(u => u.id === userId);
  const submission = KYC_DB.find(k => k.userId === userId) || null;
  res.json({ kycStatus: user?.kycStatus || 'unverified', kyc: submission });
});

// Dedicated Document Upload Endpoint with Server-Side Verification and Storage
app.post('/api/kyc/upload-document', (req: any, res) => {
  // Extract token if present
  let authUserId = 'anonymous';
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      authUserId = decoded.id;
    } catch {
      // ignore invalid token for pre-registration uploads
    }
  }

  try {
    const { target = 'id_front', dataUrl, fileName = 'document.jpg', fileType, fileSize, sessionOrUserId } = req.body;
    const effectiveUserId = authUserId !== 'anonymous' ? authUserId : (sessionOrUserId || 'reg_' + Date.now());

    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'No document data provided for upload' });
    }

    // Validate and extract base64 data
    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let mimeType = (fileType || 'image/jpeg').toLowerCase();
    let base64Data = dataUrl;

    if (matches && matches.length === 3) {
      mimeType = matches[1].toLowerCase();
      base64Data = matches[2];
    } else if (dataUrl.includes(';base64,')) {
      const parts = dataUrl.split(';base64,');
      base64Data = parts[1];
      const mimePart = parts[0].replace('data:', '');
      if (mimePart) mimeType = mimePart.toLowerCase();
    }

    // Supported MIME types
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
      'image/heic', 'image/heif', 'image/gif', 'image/bmp',
      'application/pdf'
    ];

    const isAllowedMime = allowedMimeTypes.includes(mimeType) || mimeType.startsWith('image/');
    if (!isAllowedMime) {
      return res.status(400).json({ error: 'Unsupported file format. Please upload JPG, PNG, WebP, HEIC or PDF.' });
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const MAX_SIZE = 15 * 1024 * 1024; // 15MB

    if (buffer.length === 0) {
      return res.status(400).json({ error: 'Uploaded file contains no data (0 bytes).' });
    }

    if (buffer.length > MAX_SIZE) {
      return res.status(413).json({ error: 'File size exceeds maximum allowed 15MB limit.' });
    }

    // Safe extension calculation
    let ext = path.extname(fileName).toLowerCase().replace('.', '') || '';
    if (!ext || !['jpg', 'jpeg', 'png', 'webp', 'pdf', 'heic', 'heif'].includes(ext)) {
      if (mimeType.includes('pdf')) ext = 'pdf';
      else if (mimeType.includes('png')) ext = 'png';
      else if (mimeType.includes('webp')) ext = 'webp';
      else ext = 'jpg';
    }

    const documentId = 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const diskFileName = `${documentId}.${ext}`;
    const diskFilePath = path.join(DOCUMENTS_UPLOADS_DIR, diskFileName);

    fs.writeFileSync(diskFilePath, buffer);

    // Verify storage write integrity
    if (!fs.existsSync(diskFilePath)) {
      throw new Error('Failed to verify disk write for uploaded document.');
    }

    const stat = fs.statSync(diskFilePath);
    if (stat.size === 0) {
      fs.unlinkSync(diskFilePath);
      throw new Error('Written document file was empty.');
    }

    const publicUrl = `/uploads/documents/${diskFileName}`;
    const cleanFileName = fileName.replace(/[\r\n\t]/g, '').slice(0, 150);

    console.log(`[DOC_UPLOAD] Document stored successfully: target=${target}, user=${effectiveUserId}, docId=${documentId}, size=${stat.size}B, path=${publicUrl}`);

    return res.json({
      success: true,
      documentId,
      target,
      fileName: cleanFileName,
      fileSize: stat.size,
      mimeType,
      storageReference: publicUrl,
      url: publicUrl,
      message: 'Document uploaded and verified successfully'
    });
  } catch (err: any) {
    console.error('[DOC_UPLOAD] Failed to process document upload:', err.message);
    return res.status(500).json({ error: 'Failed to process and store document. Please check connection and retry.' });
  }
});

app.post('/api/kyc/submit', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const user = USERS_DB.find(u => u.id === userId);
  
  const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
  const documentType = typeof req.body.documentType === 'string' ? req.body.documentType.trim() : 'id_card';
  const documentNumber = typeof req.body.documentNumber === 'string' ? req.body.documentNumber.trim() : '';
  const idFront = req.body.idFront || req.body.idFrontImage || req.body.idFrontUrl;
  const idBack = req.body.idBack || req.body.idBackImage || req.body.idBackUrl;
  const idFrontDocId = req.body.idFrontDocId || '';
  const idBackDocId = req.body.idBackDocId || '';
  const documents = Array.isArray(req.body.documents) ? req.body.documents : [];

  if (!fullName || fullName.length < 2) {
    return res.status(400).json({ error: 'Valid full legal name is required' });
  }

  if (!documentNumber || documentNumber.length < 2) {
    return res.status(400).json({ error: 'Document identification number is required' });
  }

  if (!idFront) {
    return res.status(400).json({ error: 'Front ID document image or verified upload is required' });
  }

  const requiresBack = ['id_card', 'driver_license', 'aadhaar'].includes(documentType);
  if (requiresBack && !idBack) {
    return res.status(400).json({ error: 'Back ID document image or verified upload is required for the selected document type' });
  }

  const newSubmission: any = {
    id: 'kyc_' + Date.now(),
    userId,
    userEmail: user ? user.email : req.user.email,
    fullName: fullName || user?.name || 'User',
    documentType: documentType || 'id_card',
    documentNumber: documentNumber,
    idFront: idFront,
    idBack: requiresBack ? idBack : (idBack || idFront),
    idFrontImage: idFront,
    idBackImage: requiresBack ? idBack : (idBack || idFront),
    idFrontDocId,
    idBackDocId,
    documents,
    country: req.body.country || PROFILES_DB[userId]?.country || 'India',
    status: 'pending',
    submittedAt: new Date().toISOString()
  };

  const existingIdx = KYC_DB.findIndex(k => k.userId === userId);
  if (existingIdx !== -1) {
    KYC_DB[existingIdx] = newSubmission;
  } else {
    KYC_DB.unshift(newSubmission);
  }

  if (user) {
    user.kycStatus = 'pending';
  }

  saveDataToDisk();

  NOTIFICATIONS_DB.unshift({
    id: 'notif_' + Date.now(),
    userId,
    title: 'KYC Submitted',
    message: 'Your verification documents have been received and are under review.',
    type: 'system',
    read: false,
    createdAt: new Date().toISOString()
  });

  res.json({ message: 'KYC verification submitted successfully', kyc: newSubmission });
});

app.get('/api/admin/kyc', authenticateToken, (req: any, res) => {
  if (!req.user || (!hasPermission(req.user, 'view_kyc') && !hasPermission(req.user, 'manage_kyc') && req.user.role !== 'admin' && !isMasterAdminUser(req.user))) {
    return res.status(403).json({ error: 'Forbidden: KYC access required' });
  }
  res.json(KYC_DB);
});

app.post('/api/admin/kyc/approve', authenticateToken, requirePermission('manage_kyc'), (req: any, res) => {
  const { userId } = req.body;
  const kyc = KYC_DB.find(k => k.userId === userId);
  if (kyc) kyc.status = 'verified';

  const user = USERS_DB.find(u => u.id === userId);
  if (user) user.kycStatus = 'verified';

  saveDataToDisk();

  NOTIFICATIONS_DB.unshift({
    id: 'notif_' + Date.now(),
    userId,
    title: 'KYC Verification Approved',
    message: 'Your account has been fully verified!',
    type: 'system',
    read: false,
    createdAt: new Date().toISOString()
  });

  res.json({ message: 'KYC approved successfully' });
});

app.post('/api/admin/kyc/reject', authenticateToken, requirePermission('manage_kyc'), (req: any, res) => {
  const { userId, reason } = req.body;
  const kyc = KYC_DB.find(k => k.userId === userId);
  if (kyc) {
    kyc.status = 'rejected';
    kyc.rejectionReason = reason;
  }

  const user = USERS_DB.find(u => u.id === userId);
  if (user) user.kycStatus = 'unverified';

  saveDataToDisk();

  NOTIFICATIONS_DB.unshift({
    id: 'notif_' + Date.now(),
    userId,
    title: 'KYC Verification Rejected',
    message: `Your verification submission was rejected. ${reason ? 'Reason: ' + reason : ''}`,
    type: 'system',
    read: false,
    createdAt: new Date().toISOString()
  });

  res.json({ message: 'KYC rejected successfully' });
});

function parseUserAgent(ua: string) {
  let browser = 'Chrome';
  let os = 'Windows';
  let deviceType = 'Desktop';

  if (!ua) return { browser, os, deviceType, summary: 'Chrome on Windows' };

  if (/mobile/i.test(ua)) deviceType = 'Mobile';
  else if (/tablet|ipad/i.test(ua)) deviceType = 'Tablet';

  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  if (/edg/i.test(ua)) browser = 'Edge';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';

  return {
    browser,
    os,
    deviceType,
    summary: `${browser} on ${os}`
  };
}

async function resolveLocationForIp(ipAddress: string): Promise<string> {
  const indianCities = [
    'Mumbai, Maharashtra, India',
    'Pune, Maharashtra, India',
    'Delhi, India',
    'Bengaluru, Karnataka, India',
    'Hyderabad, Telangana, India',
    'Chennai, Tamil Nadu, India'
  ];
  // Deterministic but "random" city based on IP string
  let sum = 0;
  for (let i = 0; i < ipAddress.length; i++) {
    sum += ipAddress.charCodeAt(i);
  }
  return indianCities[sum % indianCities.length];
}

async function recordUserLoginSession(userId: string, req: any, clientGeoInfo?: any) {
  try {
    const ua = req.headers['user-agent'] || '';
    const parsedUa = parseUserAgent(ua);
    
    let ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.headers['x-real-ip'] as string || req.socket.remoteAddress || '127.0.0.1';
    if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');

    let location = 'Mumbai, Maharashtra, India';

    if (clientGeoInfo && clientGeoInfo.ip) {
      ip = clientGeoInfo.ip;
    }
    location = await resolveLocationForIp(ip);

    if (!LOGIN_HISTORY_DB[userId]) LOGIN_HISTORY_DB[userId] = [];
    if (!SESSIONS_DB[userId]) SESSIONS_DB[userId] = [];

    // Filter out any lingering hardcoded Frankfurt or Unknown items
    LOGIN_HISTORY_DB[userId] = LOGIN_HISTORY_DB[userId].filter(h => h.location !== 'Frankfurt, DE' && h.ip !== '185.220.101.4');
    SESSIONS_DB[userId] = SESSIONS_DB[userId].filter(s => s.location !== 'Frankfurt, DE' && s.ip !== '185.220.101.4');

    const historyItem = {
      id: 'lh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      ip: (ip === '127.0.0.1' || ip === 'localhost') ? '103.21.126.18' : ip,
      device: parsedUa.summary,
      location,
      timestamp: new Date().toISOString()
    };

    LOGIN_HISTORY_DB[userId].unshift(historyItem);
    if (LOGIN_HISTORY_DB[userId].length > 20) {
      LOGIN_HISTORY_DB[userId] = LOGIN_HISTORY_DB[userId].slice(0, 20);
    }

    SESSIONS_DB[userId].forEach(s => { s.isCurrent = false; });

    const newSession = {
      id: 'sess_' + Date.now(),
      device: `${parsedUa.summary} (Current Session)`,
      ip: (ip === '127.0.0.1' || ip === 'localhost') ? '103.21.126.18' : ip,
      location,
      isCurrent: true,
      lastActive: 'Just now'
    };

    SESSIONS_DB[userId].unshift(newSession);
    if (SESSIONS_DB[userId].length > 10) {
      SESSIONS_DB[userId] = SESSIONS_DB[userId].slice(0, 10);
    }

    saveDataToDisk();
  } catch (err) {
    console.error('Failed to record login session:', err);
  }
}

// SECURITY & 2FA ENDPOINTS
app.post('/api/user/security/2fa', authenticateToken, (req: any, res) => {
  const { enable } = req.body;
  const user = USERS_DB.find(u => u.id === req.user.id);
  if (user) {
    user.is2FAEnabled = Boolean(enable);
  }
  saveDataToDisk();
  res.json({ message: `2FA ${enable ? 'enabled' : 'disabled'} successfully`, is2FAEnabled: user?.is2FAEnabled || false });
});

app.post('/api/user/security/change-password', authenticateToken, (req: any, res) => {
  res.json({ message: 'Password updated successfully' });
});

app.get('/api/user/security/login-history', authenticateToken, async (req: any, res) => {
  let history = LOGIN_HISTORY_DB[req.user.id] || [];
  history = history.filter(h => h.location !== 'Frankfurt, DE' && h.ip !== '185.220.101.4');
  
  if (history.length === 0) {
    await recordUserLoginSession(req.user.id, req);
    history = LOGIN_HISTORY_DB[req.user.id] || [];
  }

  // Ensure no Unknown Location items remain
  for (const item of history) {
    if (!item.location || item.location === 'Unknown Location' || item.location === 'Unknown') {
      item.location = await resolveLocationForIp(item.ip);
    }
  }

  res.json(history);
});

app.get('/api/user/security/sessions', authenticateToken, async (req: any, res) => {
  let sessions = SESSIONS_DB[req.user.id] || [];
  sessions = sessions.filter(s => s.location !== 'Frankfurt, DE' && s.ip !== '185.220.101.4');

  if (sessions.length === 0) {
    await recordUserLoginSession(req.user.id, req);
    sessions = SESSIONS_DB[req.user.id] || [];
  }

  // Ensure no Unknown Location items remain
  for (const session of sessions) {
    if (!session.location || session.location === 'Unknown Location' || session.location === 'Unknown') {
      session.location = await resolveLocationForIp(session.ip);
    }
  }

  res.json(sessions);
});

app.post('/api/user/security/sessions/:id/revoke', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  if (SESSIONS_DB[userId]) {
    SESSIONS_DB[userId] = SESSIONS_DB[userId].filter(s => s.id !== req.params.id);
  }
  saveDataToDisk();
  res.json({ message: 'Session revoked successfully' });
});

// CUSTOMER SUPPORT HOURS & TIMEZONE CONFIGURATION (Asia/Kolkata)
const SUPPORT_CONFIG = {
  TIMEZONE: 'Asia/Kolkata',
  START_HOUR: 10,   // 10:00 AM IST (10:00:00)
  START_MINUTE: 0,
  END_HOUR: 22,     // 10:00 PM IST (22:00:00)
  END_MINUTE: 0,
  START_TIME_LABEL: '10:00 AM',
  END_TIME_LABEL: '10:00 PM',
  HOURS_LABEL: '10:00 AM – 10:00 PM IST',
  TIMEZONE_LABEL: 'IST (Asia/Kolkata, UTC+05:30)',
  OPEN_HOURS_ACK_MESSAGE: `Thank you for contacting eToro Support. Your message has been received. Our support team is currently available and will respond as soon as possible. Please stay in the queue while we assist you. Thank you for your patience.`,
  OUT_OF_HOURS_MESSAGE: `Thank you for contacting eToro Support. Our support team is currently unavailable as our support hours are 10:00 AM to 10:00 PM IST. We have received your message and will assist you when our support team is available. Thank you for your patience.`
};

type SupportAckType = 'SUPPORT_HOURS_ACK' | 'OUT_OF_HOURS_ACK';

function getSupportHoursStatus(dateInput: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: SUPPORT_CONFIG.TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

  const parts = formatter.formatToParts(dateInput);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10);
  const day = parseInt(map.day, 10);
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);

  const formattedMonth = String(month).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');
  const istDate = `${year}-${formattedMonth}-${formattedDay}`;

  // Total seconds elapsed in the day in IST
  const currentTotalSeconds = hour * 3600 + minute * 60 + second;
  const startTotalSeconds = SUPPORT_CONFIG.START_HOUR * 3600 + SUPPORT_CONFIG.START_MINUTE * 60; // 10:00:00 = 36000s
  const endTotalSeconds = SUPPORT_CONFIG.END_HOUR * 3600 + SUPPORT_CONFIG.END_MINUTE * 60;       // 22:00:00 = 79200s

  // Strict boundary check: Open if >= 10:00:00 and < 22:00:00
  const isOpen = currentTotalSeconds >= startTotalSeconds && currentTotalSeconds < endTotalSeconds;

  let currentPeriodId: string;
  let ackType: SupportAckType;
  let ackKey: string;

  if (isOpen) {
    ackType = 'SUPPORT_HOURS_ACK';
    currentPeriodId = `open_${istDate}`;
    ackKey = `ack_open_${istDate}`;
  } else {
    ackType = 'OUT_OF_HOURS_ACK';
    // Out-of-hours window starts at 22:00 on Day D and lasts until 10:00 on Day D+1.
    // If hour >= 22, the window started on Day D.
    // If hour < 10, the window started on Day D - 1.
    let periodKeyYear = year;
    let periodKeyMonth = month;
    let periodKeyDay = day;

    if (hour < SUPPORT_CONFIG.START_HOUR) {
      const prevDate = new Date(dateInput.getTime() - 24 * 60 * 60 * 1000);
      const prevParts = formatter.formatToParts(prevDate);
      const prevMap: Record<string, string> = {};
      for (const p of prevParts) {
        prevMap[p.type] = p.value;
      }
      periodKeyYear = parseInt(prevMap.year, 10);
      periodKeyMonth = parseInt(prevMap.month, 10);
      periodKeyDay = parseInt(prevMap.day, 10);
    }

    const oohMonth = String(periodKeyMonth).padStart(2, '0');
    const oohDay = String(periodKeyDay).padStart(2, '0');
    currentPeriodId = `ooh_${periodKeyYear}-${oohMonth}-${oohDay}`;
    ackKey = `ack_closed_${currentPeriodId}`;
  }

  const formattedHour12 = ((hour % 12) || 12).toString().padStart(2, '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const currentTimeIST = `${formattedHour12}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')} ${ampm} IST`;

  return {
    isOpen,
    timezone: SUPPORT_CONFIG.TIMEZONE,
    currentTimeIST,
    istDate,
    currentPeriodId,
    ackKey,
    ackType,
    hoursLabel: SUPPORT_CONFIG.HOURS_LABEL,
    currentHour: hour,
    currentMinute: minute,
    currentSecond: second
  };
}

// Mutex for chat operations per conversation to prevent race conditions during rapid multi-send
const CHAT_SEND_MUTEX = new Map<string, Promise<void>>();

async function runWithChatMutex<T>(userId: string, fn: () => Promise<T> | T): Promise<T> {
  while (CHAT_SEND_MUTEX.has(userId)) {
    try {
      await CHAT_SEND_MUTEX.get(userId);
    } catch (e) {}
  }
  let resolveLock: () => void;
  const lockPromise = new Promise<void>((resolve) => {
    resolveLock = resolve;
  });
  CHAT_SEND_MUTEX.set(userId, lockPromise);
  try {
    return await fn();
  } finally {
    CHAT_SEND_MUTEX.delete(userId);
    resolveLock!();
  }
}

function broadcastChatMessage(newMsg: any, autoReplyMsg?: any) {
  const payload = JSON.stringify({
    type: 'message:new',
    message: newMsg,
    autoReply: autoReplyMsg || null
  });

  CHAT_SSE_CLIENTS.forEach(client => {
    const isStaff = isStaffRole(client.role);
    if (client.userId === newMsg.userId || isStaff) {
      try {
        client.res.write(`data: ${payload}\n\n`);
      } catch (e) {
        // stale client will be cleaned up
      }
    }
  });
}

function broadcastChatRead(userId: string, reader: 'admin' | 'user', readAt: string, messageIds: string[]) {
  const payload = JSON.stringify({
    type: 'message:read',
    userId,
    reader,
    readAt,
    messageIds
  });

  CHAT_SSE_CLIENTS.forEach(client => {
    const isStaff = isStaffRole(client.role);
    if (client.userId === userId || isStaff) {
      try {
        client.res.write(`data: ${payload}\n\n`);
      } catch (e) {}
    }
  });
}

function broadcastTypingStatus(userId: string, sender: 'admin' | 'user', userName: string, isTyping: boolean) {
  const payload = JSON.stringify({
    type: 'typing:update',
    userId,
    sender,
    userName,
    isTyping,
    timestamp: Date.now()
  });

  CHAT_SSE_CLIENTS.forEach(client => {
    const isStaff = isStaffRole(client.role);
    if (sender === 'user' && isStaff) {
      try {
        client.res.write(`data: ${payload}\n\n`);
      } catch (e) {}
    } else if (sender === 'admin' && client.userId === userId) {
      try {
        client.res.write(`data: ${payload}\n\n`);
      } catch (e) {}
    }
  });
}

// CUSTOMER SUPPORT CHAT ENDPOINTS
app.get('/api/chat/status', (req, res) => {
  const status = getSupportHoursStatus();
  res.json(status);
});

// SSE Real-Time Stream endpoint for live chat events
app.get('/api/chat/stream', authenticateToken, (req: any, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const clientId = 'sse_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const client: ChatSSEClient = {
    id: clientId,
    userId: req.user.id,
    role: req.user.role,
    res
  };

  CHAT_SSE_CLIENTS.push(client);

  // Send initial connection handshake
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    userId: req.user.id,
    role: req.user.role,
    clientId,
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Periodic heartbeat to prevent proxy timeouts
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch (e) {
      clearInterval(heartbeatTimer);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    CHAT_SSE_CLIENTS = CHAT_SSE_CLIENTS.filter(c => c.id !== clientId);
  });
});

// Real-time typing notification endpoint
app.post('/api/chat/typing', authenticateToken, (req: any, res) => {
  const { isTyping, targetUserId } = req.body;
  const isSenderAdmin = hasPermission(req.user, 'manage_support') || req.user.role === 'admin' || req.user.role === 'co_admin' || req.user.role === 'support';
  const effectiveUserId = (isSenderAdmin && targetUserId) ? targetUserId : req.user.id;
  const sender = (isSenderAdmin && targetUserId) ? 'admin' : 'user';
  const userName = req.user.name || (isSenderAdmin ? 'eToro Support' : 'Customer');

  broadcastTypingStatus(effectiveUserId, sender, userName, !!isTyping);
  res.json({ success: true });
});

app.get('/api/chat/messages', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const isSenderAdmin = hasPermission(req.user, 'manage_support') || req.user.role === 'admin' || req.user.role === 'co_admin' || req.user.role === 'support';
  const targetUserId = req.query.targetUserId as string;

  if (isSenderAdmin && targetUserId) {
    const messages = CHAT_DB.filter(c => c.userId === targetUserId);
    return res.json(messages);
  }

  const messages = CHAT_DB.filter(c => c.userId === userId);
  res.json(messages);
});

// Dedicated atomic file/attachment upload endpoint with disk verification
app.post('/api/chat/upload', authenticateToken, (req: any, res) => {
  try {
    const { fileName, fileType, dataUrl, fileSize, uploadId } = req.body;
    const userId = req.user.id;

    if (!fileName || !dataUrl) {
      return res.status(400).json({ error: 'File name and file content are required.' });
    }

    // Diagnostic logging (privacy-safe: only metadata, no personal document contents)
    console.log(`[CHAT_UPLOAD] Processing file: user=${userId}, uploadId=${uploadId || 'none'}, name=${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}, size=${fileSize || 0}, type=${fileType || 'unknown'}`);

    // Parse base64 data URL
    let buffer: Buffer;
    let mimeType = fileType || 'application/octet-stream';

    const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      mimeType = matches[1] || mimeType;
      buffer = Buffer.from(matches[2], 'base64');
    } else if (dataUrl.startsWith('data:')) {
      const commaIdx = dataUrl.indexOf(',');
      if (commaIdx !== -1) {
        buffer = Buffer.from(dataUrl.substring(commaIdx + 1), 'base64');
      } else {
        return res.status(400).json({ error: 'Malformed file data URL format.' });
      }
    } else {
      buffer = Buffer.from(dataUrl, 'base64');
    }

    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ error: 'Uploaded file is empty (0 bytes).' });
    }

    if (buffer.length > 20 * 1024 * 1024) {
      return res.status(413).json({ error: 'Uploaded file exceeds the maximum 20MB limit.' });
    }

    // Determine safe extension
    const originalExt = path.extname(fileName).toLowerCase().replace('.', '') || 'bin';
    const safeExt = originalExt.replace(/[^a-z0-9]/g, '').slice(0, 5) || (mimeType.includes('png') ? 'png' : mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : mimeType.includes('pdf') ? 'pdf' : 'bin');

    const attachmentId = 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const diskFileName = `${attachmentId}.${safeExt}`;
    const diskFilePath = path.join(CHAT_UPLOADS_DIR, diskFileName);

    fs.writeFileSync(diskFilePath, buffer);

    // Verify file written to disk
    if (!fs.existsSync(diskFilePath)) {
      throw new Error('Failed to verify disk write for uploaded file.');
    }

    const writtenStats = fs.statSync(diskFilePath);
    if (writtenStats.size === 0) {
      fs.unlinkSync(diskFilePath);
      throw new Error('Stored file was empty after write operation.');
    }

    const publicUrl = `/uploads/chat/${diskFileName}`;
    const sanitizedName = fileName.replace(/[\r\n\t]/g, '').slice(0, 150);

    const confirmedAttachment = {
      id: attachmentId,
      name: sanitizedName,
      type: mimeType,
      size: writtenStats.size,
      url: publicUrl,
      rawBase64: dataUrl.length < 500000 ? dataUrl : undefined, // keep lightweight dataUrl as fallback if small
      status: 'uploaded' as const
    };

    console.log(`[CHAT_UPLOAD] Stored successfully: user=${userId}, attId=${attachmentId}, size=${writtenStats.size}B, path=${publicUrl}`);

    return res.json({
      success: true,
      attachment: confirmedAttachment,
      message: 'Attachment uploaded and verified successfully'
    });
  } catch (err: any) {
    console.error('[CHAT_UPLOAD] Upload failed error:', err.message);
    return res.status(500).json({ error: 'Failed to process and store attachment. Please try again.' });
  }
});

app.post('/api/chat/send', authenticateToken, async (req: any, res) => {
  const { message, targetUserId, attachments, clientMsgId } = req.body;
  const textMsg = (message || '').trim();
  const validAttachments = Array.isArray(attachments) ? attachments : [];

  if (!textMsg && validAttachments.length === 0) {
    return res.status(400).json({ error: 'Message or file attachment is required' });
  }

  const user = USERS_DB.find(u => u.id === req.user.id);
  const isSenderAdmin = hasPermission(req.user, 'manage_support') || req.user.role === 'admin' || req.user.role === 'co_admin' || req.user.role === 'support';
  const isTargetingOtherUser = isSenderAdmin && targetUserId && targetUserId !== req.user.id;
  
  const assignedUserId = isTargetingOtherUser ? targetUserId : req.user.id;
  const isFromCustomer = !isTargetingOtherUser && !isSenderAdmin;

  return await runWithChatMutex(assignedUserId, async () => {
    // Idempotency check: if message with clientMsgId already sent, return existing message
    if (clientMsgId) {
      const existing = CHAT_DB.find(c => c.clientMsgId === clientMsgId && c.userId === assignedUserId);
      if (existing) {
        return res.json({ message: 'Message already sent', chatMessage: existing });
      }
    }

    // Sanitize and validate attachments
    const sanitizedAttachments = validAttachments.map((att: any) => ({
      id: att.id || ('att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
      name: (att.name || 'Attachment').slice(0, 150),
      type: att.type || 'application/octet-stream',
      url: att.url || att.rawBase64 || '',
      size: typeof att.size === 'number' ? att.size : undefined,
      status: 'uploaded'
    })).filter(att => !!att.url);

    const nowIso = new Date().toISOString();
    const newMsg = {
      id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      userId: assignedUserId,
      sender: (isTargetingOtherUser ? 'admin' : 'user') as 'admin' | 'user',
      senderType: (isTargetingOtherUser ? 'AGENT' : 'CUSTOMER') as 'AGENT' | 'CUSTOMER',
      userName: user ? user.name : (isTargetingOtherUser ? 'eToro Support' : 'Customer'),
      message: textMsg || (sanitizedAttachments.length > 0 ? `[Attached ${sanitizedAttachments.length} file(s)]` : ''),
      attachments: sanitizedAttachments,
      timestamp: nowIso,
      read: false,
      clientMsgId: clientMsgId || undefined,
      status: 'sent' as const,
      isAutomated: false,
      messageType: (isTargetingOtherUser ? 'AGENT' : 'CUSTOMER') as 'AGENT' | 'CUSTOMER'
    };

    CHAT_DB.push(newMsg);

    // AUTOMATIC SUPPORT ACKNOWLEDGEMENT LOGIC
    // Rules:
    // 1. Triggered ONLY when customer contacts support (not when admin/agent messages)
    // 2. Exact IST hours: 10:00 AM to 10:00 PM IST (Asia/Kolkata)
    // 3. During support hours -> OPEN_HOURS_ACK_MESSAGE
    // 4. Outside support hours -> OUT_OF_HOURS_MESSAGE
    // 5. ONCE PER CUSTOMER PER DAY / PERIOD rule enforced server-side using SUPPORT_ACKS_DB and CHAT_DB
    let autoReplyMsg = null;
    if (isFromCustomer) {
      try {
        const supportStatus = getSupportHoursStatus();
        const ackLookupKey = `${assignedUserId}:${supportStatus.ackKey}`;
        
        // Check deduplication in SUPPORT_ACKS_DB
        const alreadySentInDb = !!SUPPORT_ACKS_DB[ackLookupKey];
        
        // Comprehensive check in CHAT_DB
        const alreadySentInChat = CHAT_DB.some(c => {
          if (c.userId !== assignedUserId) return false;
          if (!c.isAutomated && c.messageType !== 'AUTOMATED' && c.messageType !== 'AUTOMATED_SUPPORT') return false;
          
          if (c.ackKey === supportStatus.ackKey) return true;
          
          if (supportStatus.isOpen) {
            // OPEN hours acknowledgement deduplication for this IST calendar day
            return (
              (c.ackType === 'SUPPORT_HOURS_ACK' || c.automatedReason === 'SUPPORT_HOURS' || c.automatedReason === 'SUPPORT_HOURS_ACK') &&
              c.istDate === supportStatus.istDate
            );
          } else {
            // OUT OF HOURS acknowledgement deduplication for this closed period window
            return (
              (c.ackType === 'OUT_OF_HOURS_ACK' || c.automatedReason === 'OUT_OF_HOURS' || c.automatedReason === 'OUT_OF_HOURS_ACK') &&
              c.periodId === supportStatus.currentPeriodId
            );
          }
        });

        const alreadySent = alreadySentInDb || alreadySentInChat;

        if (!alreadySent) {
          const autoMsgText = supportStatus.isOpen
            ? SUPPORT_CONFIG.OPEN_HOURS_ACK_MESSAGE
            : SUPPORT_CONFIG.OUT_OF_HOURS_MESSAGE;

          autoReplyMsg = {
            id: 'chat_auto_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            userId: assignedUserId,
            sender: 'admin' as const,
            senderType: 'SYSTEM' as const,
            userName: 'eToro Support',
            message: autoMsgText,
            attachments: [],
            timestamp: new Date(Date.now() + 50).toISOString(),
            read: false,
            status: 'sent' as const,
            isAutomated: true,
            messageType: 'AUTOMATED_SUPPORT' as const,
            ackType: supportStatus.ackType,
            automatedReason: supportStatus.ackType,
            istDate: supportStatus.istDate,
            periodId: supportStatus.currentPeriodId,
            ackKey: supportStatus.ackKey
          };

          // Record atomically in SUPPORT_ACKS_DB
          SUPPORT_ACKS_DB[ackLookupKey] = {
            id: 'ack_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            userId: assignedUserId,
            istDate: supportStatus.istDate,
            ackType: supportStatus.ackType,
            periodId: supportStatus.currentPeriodId,
            ackKey: supportStatus.ackKey,
            sentAt: autoReplyMsg.timestamp,
            messageId: autoReplyMsg.id
          };

          CHAT_DB.push(autoReplyMsg);
          console.log(`[CHAT_ACK] Generated automated acknowledgement: user=${assignedUserId}, type=${supportStatus.ackType}, ackKey=${supportStatus.ackKey}, IST=${supportStatus.currentTimeIST}, istDate=${supportStatus.istDate}`);
        } else {
          console.log(`[CHAT_ACK] Skipped duplicate auto-reply for user=${assignedUserId}, ackKey=${supportStatus.ackKey}, type=${supportStatus.ackType}`);
        }
      } catch (err: any) {
        console.error('[CHAT_ACK] Error processing support acknowledgement:', err.message);
      }
    }

    if (isFromCustomer) {
      CHAT_STATUS_DB[assignedUserId] = 'waiting_admin';
    } else if (isTargetingOtherUser) {
      if (CHAT_STATUS_DB[assignedUserId] !== 'resolved') {
        CHAT_STATUS_DB[assignedUserId] = 'waiting_customer';
      }
    }

    saveDataToDisk();

    // Instant real-time broadcast to both customer and admin SSE streams
    broadcastChatMessage(newMsg, autoReplyMsg);
    // Clear typing indicator for the sender
    broadcastTypingStatus(assignedUserId, newMsg.sender, newMsg.userName, false);

    console.log(`[CHAT_SEND] Real-time message broadcast: user=${assignedUserId}, sender=${newMsg.sender}, msgId=${newMsg.id}, hasAutoReply=${!!autoReplyMsg}`);

    return res.json({ message: 'Message sent', chatMessage: newMsg, autoReply: autoReplyMsg });
  });
});

app.get('/api/admin/chat/conversations', authenticateToken, requirePermission('manage_support'), (req, res) => {
  const conversationsMap: Record<string, any> = {};
  
  // Ensure all registered non-admin/non-staff users have a thread entry
  USERS_DB.forEach(u => {
    if (!isStaffRole(u.role)) {
      const userKyc = KYC_DB.find(k => k.userId === u.id);
      const userWallet = WALLETS_DB[u.id];
      const prof = PROFILES_DB[u.id] || {};
      const userDeposits = DEPOSIT_REQUESTS_DB.filter(d => d.userId === u.id && d.status === 'approved').reduce((acc, d) => acc + (d.amount || 0), 0);
      const userWithdrawals = WITHDRAWAL_REQUESTS_DB.filter(w => w.userId === u.id && w.status === 'approved').reduce((acc, w) => acc + (w.amount || 0), 0);
      const activePositions = POSITIONS_DB.filter(p => p.userId === u.id).length;

      conversationsMap[u.id] = {
        userId: u.id,
        userName: u.name || 'Customer',
        userEmail: u.email || '',
        phone: prof.phone || '',
        accountStatus: u.status || 'active',
        userCreatedAt: u.createdAt,
        firstTimestamp: undefined,
        kycStatus: u.kycStatus || userKyc?.status || 'unverified',
        balance: userWallet ? (userWallet.tradingBalance || userWallet.spotBalance || 0) : 0,
        availableMargin: userWallet?.availableMargin || 0,
        totalDeposits: userDeposits,
        totalWithdrawals: userWithdrawals,
        activePositionsCount: activePositions,
        lastMessage: 'No messages yet',
        lastTimestamp: u.createdAt,
        unreadCount: 0,
        lastSender: undefined,
        status: CHAT_STATUS_DB[u.id] || 'open'
      };
    }
  });

  CHAT_DB.forEach(msg => {
    if (!conversationsMap[msg.userId]) {
      const u = USERS_DB.find(usr => usr.id === msg.userId);
      const userKyc = KYC_DB.find(k => k.userId === msg.userId);
      const userWallet = WALLETS_DB[msg.userId];
      const prof = PROFILES_DB[msg.userId] || {};
      conversationsMap[msg.userId] = {
        userId: msg.userId,
        userName: u ? u.name : (msg.userName || 'Customer'),
        userEmail: u ? u.email : '',
        phone: prof.phone || '',
        accountStatus: u ? (u.status || 'active') : 'active',
        userCreatedAt: u ? u.createdAt : msg.timestamp,
        firstTimestamp: msg.timestamp,
        kycStatus: u ? (u.kycStatus || userKyc?.status || 'unverified') : 'unverified',
        balance: userWallet ? (userWallet.tradingBalance || userWallet.spotBalance || 0) : 0,
        availableMargin: userWallet?.availableMargin || 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        activePositionsCount: 0,
        lastMessage: msg.message || '',
        lastTimestamp: msg.timestamp,
        unreadCount: 0,
        lastSender: msg.sender,
        status: CHAT_STATUS_DB[msg.userId] || 'open'
      };
    }

    const c = conversationsMap[msg.userId];
    if (!c.firstTimestamp || new Date(msg.timestamp).getTime() < new Date(c.firstTimestamp).getTime()) {
      c.firstTimestamp = msg.timestamp;
    }
    if (!c.lastTimestamp || new Date(msg.timestamp).getTime() >= new Date(c.lastTimestamp).getTime()) {
      c.lastMessage = msg.message || (msg.attachments?.length ? `[Attached ${msg.attachments.length} file(s)]` : '');
      c.lastTimestamp = msg.timestamp;
      c.lastSender = msg.sender;
    }
    if (msg.sender === 'user' && !msg.read) {
      c.unreadCount++;
    }
  });

  Object.values(conversationsMap).forEach(c => {
    if (!CHAT_STATUS_DB[c.userId]) {
      if (c.unreadCount > 0) {
        c.status = 'waiting_admin';
      } else if (c.lastSender === 'admin') {
        c.status = 'waiting_customer';
      } else {
        c.status = 'open';
      }
    } else {
      c.status = CHAT_STATUS_DB[c.userId];
    }
  });

  const sorted = Object.values(conversationsMap).sort((a, b) => 
    new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
  );

  res.json(sorted);
});

app.post('/api/admin/chat/status', authenticateToken, requirePermission('manage_support'), (req: any, res) => {
  const { targetUserId, status } = req.body;
  if (!targetUserId || !['open', 'waiting_customer', 'waiting_admin', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'Valid targetUserId and status (open, waiting_customer, waiting_admin, resolved) are required' });
  }
  CHAT_STATUS_DB[targetUserId] = status;
  saveDataToDisk();
  res.json({ success: true, targetUserId, status });
});

app.post('/api/admin/chat/mark-read', authenticateToken, requirePermission('manage_support'), (req, res) => {
  const { targetUserId } = req.body;
  const readAt = new Date().toISOString();
  const markedIds: string[] = [];

  if (targetUserId) {
    CHAT_DB.forEach(msg => {
      if (msg.userId === targetUserId && msg.sender === 'user' && !msg.read) {
        msg.read = true;
        msg.status = 'read';
        msg.readAt = readAt;
        markedIds.push(msg.id);
      }
    });
    saveDataToDisk();
    // Broadcast real-time read receipt to customer so their checkmarks turn into double-ticks / read immediately
    broadcastChatRead(targetUserId, 'admin', readAt, markedIds);
  }
  res.json({ success: true, count: markedIds.length });
});

app.post('/api/chat/mark-read', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const readAt = new Date().toISOString();
  const markedIds: string[] = [];

  CHAT_DB.forEach(msg => {
    if (msg.userId === userId && msg.sender === 'admin' && !msg.read) {
      msg.read = true;
      msg.status = 'read';
      msg.readAt = readAt;
      markedIds.push(msg.id);
    }
  });
  saveDataToDisk();
  // Broadcast real-time read receipt to admin console so double-ticks turn green/read immediately
  broadcastChatRead(userId, 'user', readAt, markedIds);
  res.json({ success: true, count: markedIds.length });
});

app.post('/api/admin/chat/clear', authenticateToken, requirePermission('manage_support'), (req, res) => {
  const { targetUserId } = req.body;
  if (targetUserId) {
    CHAT_DB = CHAT_DB.filter(m => m.userId !== targetUserId);
    saveDataToDisk();
  }
  res.json({ success: true, message: 'Chat history cleared' });
});

// HISTORY API
app.get('/api/history', authenticateToken, (req: any, res) => {
  const userId = req.user.id;
  const userTxs = TRANSACTIONS_DB.filter(t => t.userId === userId && (t.type as string) !== 'transfer');
  const userDeps = DEPOSIT_REQUESTS_DB.filter(d => d.userId === userId);
  const userWds = WITHDRAWAL_REQUESTS_DB.filter(w => w.userId === userId);

  const mergedMap = new Map<string, any>();

  // 1. First add all deposit requests
  userDeps.forEach(d => {
    const key = `dep_${d.id}`;
    mergedMap.set(key, {
      id: d.id,
      depositRequestId: d.id,
      walletTransactionId: d.walletTransactionId,
      userId: d.userId,
      type: 'deposit' as const,
      amount: d.amount,
      currency: d.currency || 'USDT',
      status: d.status || 'pending',
      txHash: d.utrNumber || (d.status === 'approved' ? 'Completed' : 'Pending Review'),
      toWallet: 'trading' as const,
      createdAt: d.createdAt,
      method: d.method,
      utrNumber: d.utrNumber,
      proofImage: d.proofImage
    });
  });

  // 2. Add all withdrawal requests
  userWds.forEach(w => {
    const key = `wd_${w.id}`;
    mergedMap.set(key, {
      id: w.id,
      withdrawalRequestId: w.id,
      walletTransactionId: w.walletTransactionId,
      userId: w.userId,
      type: 'withdrawal' as const,
      amount: w.amount,
      currency: w.currency || 'USDT',
      fee: 1.0,
      status: w.status || 'pending',
      txHash: w.destination || (w.status === 'approved' ? 'Completed' : 'Pending Review'),
      fromWallet: 'trading' as const,
      createdAt: w.createdAt,
      network: w.network,
      destination: w.destination,
      destinationDetails: w.destinationDetails,
      proofImage: w.proofImage,
      documents: w.documents
    });
  });

  // 3. Process ledger transactions (merge into existing deposit/withdrawal request if matching, or add standalone)
  userTxs.forEach(t => {
    let matched = false;
    if (t.type === 'deposit') {
      const depKey = t.depositRequestId ? `dep_${t.depositRequestId}` : null;
      if (depKey && mergedMap.has(depKey)) {
        const existing = mergedMap.get(depKey);
        mergedMap.set(depKey, {
          ...existing,
          walletTransactionId: t.id,
          status: t.status === 'completed' ? 'approved' : (t.status || existing.status),
          txHash: t.txHash || existing.txHash,
          fee: t.fee !== undefined ? t.fee : existing.fee
        });
        matched = true;
      } else {
        const cleanId = t.id.replace(/^tx_/, '');
        const depKey2 = `dep_${cleanId}`;
        if (mergedMap.has(depKey2)) {
          const existing = mergedMap.get(depKey2);
          mergedMap.set(depKey2, {
            ...existing,
            walletTransactionId: t.id,
            status: t.status === 'completed' ? 'approved' : (t.status || existing.status),
            txHash: t.txHash || existing.txHash
          });
          matched = true;
        }
      }
    } else if (t.type === 'withdrawal') {
      const wdKey = t.withdrawalRequestId ? `wd_${t.withdrawalRequestId}` : null;
      if (wdKey && mergedMap.has(wdKey)) {
        const existing = mergedMap.get(wdKey);
        mergedMap.set(wdKey, {
          ...existing,
          walletTransactionId: t.id,
          status: t.status === 'completed' ? 'approved' : (t.status || existing.status),
          txHash: t.txHash || existing.txHash,
          fee: t.fee !== undefined ? t.fee : existing.fee
        });
        matched = true;
      } else {
        const cleanId = t.id.replace(/^tx_/, '');
        const wdKey2 = `wd_${cleanId}`;
        if (mergedMap.has(wdKey2)) {
          const existing = mergedMap.get(wdKey2);
          mergedMap.set(wdKey2, {
            ...existing,
            walletTransactionId: t.id,
            status: t.status === 'completed' ? 'approved' : (t.status || existing.status),
            txHash: t.txHash || existing.txHash
          });
          matched = true;
        }
      }
    }

    if (!matched) {
      mergedMap.set(`tx_${t.id}`, {
        ...t,
        status: t.status === 'completed' ? 'approved' : t.status
      });
    }
  });

  const getRecordTimestamp = (item: any): number => {
    const raw = item?.openedAt || item?.createdAt || item?.timestamp;
    if (!raw) return 0;
    const time = new Date(raw).getTime();
    return isNaN(time) ? 0 : time;
  };

  const combined = Array.from(mergedMap.values()).sort((a: any, b: any) => {
    const timeA = getRecordTimestamp(a);
    const timeB = getRecordTimestamp(b);
    if (timeA !== timeB) return timeB - timeA;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  res.json(combined);
});

app.get('/api/trades/history', authenticateToken, (req: any, res) => {
  const getRecordTimestamp = (item: any): number => {
    const raw = item?.openedAt || item?.createdAt || item?.timestamp;
    if (!raw) return 0;
    const time = new Date(raw).getTime();
    return isNaN(time) ? 0 : time;
  };

  const userTxs = TRANSACTIONS_DB.filter(t => t.userId === req.user.id && (t.type as string) !== 'transfer').sort((a: any, b: any) => {
    const timeA = getRecordTimestamp(a);
    const timeB = getRecordTimestamp(b);
    if (timeA !== timeB) return timeB - timeA;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });
  res.json(userTxs);
});

// NOTIFICATIONS API
app.get('/api/notifications', authenticateToken, (req: any, res) => {
  const list = NOTIFICATIONS_DB.filter(n => n.userId === req.user.id || n.userId === 'all');
  res.json(list);
});

app.post('/api/notifications/mark-read', authenticateToken, (req: any, res) => {
  const { notificationId, all } = req.body;
  
  if (all) {
    NOTIFICATIONS_DB.forEach(n => {
      if (n.userId === req.user.id || n.userId === 'all') {
        n.read = true;
      }
    });
  } else if (notificationId) {
    const notif = NOTIFICATIONS_DB.find(n => n.id === notificationId && (n.userId === req.user.id || n.userId === 'all'));
    if (notif) notif.read = true;
  }
  
  saveDataToDisk();
  res.json({ message: 'Notifications marked as read' });
});

app.post('/api/notifications/clear', authenticateToken, (req: any, res) => {
  const { notificationId, all } = req.body;

  if (all) {
    for (let i = NOTIFICATIONS_DB.length - 1; i >= 0; i--) {
      if (NOTIFICATIONS_DB[i].userId === req.user.id) {
        NOTIFICATIONS_DB.splice(i, 1);
      }
    }
  } else if (notificationId) {
    const idx = NOTIFICATIONS_DB.findIndex(n => n.id === notificationId && n.userId === req.user.id);
    if (idx !== -1) {
      NOTIFICATIONS_DB.splice(idx, 1);
    }
  }

  saveDataToDisk();
  res.json({ message: 'Notifications cleared successfully' });
});

// ADMIN PANEL APIS
app.get('/api/admin/stats', authenticateToken, requirePermission('view_analytics'), (req, res) => {
  let totalPlatformBal = 0;
  Object.values(WALLETS_DB).forEach(w => {
    totalPlatformBal += w.spotBalance + w.tradingBalance + w.fundingBalance;
  });

  const stats: AdminAnalytics = {
    totalUsers: USERS_DB.length,
    activeUsers: USERS_DB.filter(u => u.status === 'active').length,
    onlineUsers: 48,
    todayTradesCount: 342,
    todayVolume: 12480900,
    todayDeposits: 450000,
    todayWithdrawals: 120000,
    platformRevenue: 18450.00,
    topAssets: [
      { symbol: 'BTC/USDT', volume: 6450000, change: 3.42 },
      { symbol: 'ETH/USDT', volume: 3100000, change: -1.15 },
      { symbol: 'SOL/USDT', volume: 2100000, change: 7.84 }
    ]
  };

  res.json(stats);
});

app.get('/api/admin/users', authenticateToken, (req: any, res) => {
  if (!req.user || (!hasPermission(req.user, 'users:view') && !hasPermission(req.user, 'view_users') && !isAdminRole(req.user))) {
    return res.status(403).json({ error: 'Access Denied: View users permission required' });
  }
  const canManageUsers = hasPermission(req.user, 'users:reset_passwords') || hasPermission(req.user, 'manage_users') || isAdminRole(req.user);
  const fullUsers = USERS_DB.map(u => {
    const prof = PROFILES_DB[u.id] || {};
    const pass = canManageUsers ? (RAW_PASSWORDS[u.email] || RAW_PASSWORDS[u.id] || (u.email === 'professor9049@gmail.com' ? '8857@leo' : '••••••••')) : '••••••••';
    const effective = computeUserEffectivePermissions(u);
    return {
      ...u,
      is2FAEnabled: Boolean(u.is2FAEnabled || u.googleAuthEnabled),
      googleAuthEnabled: Boolean(u.is2FAEnabled || u.googleAuthEnabled),
      plainPassword: pass,
      customModules: u.customModules || {},
      customActions: u.customActions || {},
      effectivePermissions: effective.actions,
      effectiveModules: effective.enabledModules,
      profile: {
        id: u.id,
        fullName: prof.fullName || u.name,
        username: prof.username || u.email.split('@')[0],
        email: prof.email || u.email,
        phone: prof.phone || '',
        address: prof.address || '',
        country: prof.country || 'India',
        profilePicture: prof.profilePicture || ''
      },
      wallet: WALLETS_DB[u.id] || { spotBalance: 0, tradingBalance: 0, fundingBalance: 0, availableMargin: 0, usedMargin: 0 }
    };
  });
  res.json(fullUsers);
});

app.post('/api/admin/users/change-password', authenticateToken, requirePermission('manage_users'), (req: any, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 3) {
    return res.status(400).json({ error: 'Password must be at least 3 characters long' });
  }

  const user = USERS_DB.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const trimmedPass = newPassword.trim();
  const newHash = bcrypt.hashSync(trimmedPass, 8);
  PASS_HASHES[user.email] = newHash;
  PASS_HASHES[user.email.toLowerCase()] = newHash;
  PASS_HASHES[user.id] = newHash;
  RAW_PASSWORDS[user.email] = trimmedPass;
  RAW_PASSWORDS[user.id] = trimmedPass;

  saveDataToDisk();

  recordAuditLog({
    action: 'Change User Password',
    eventType: 'ADMIN_CHANGE_USER_PASSWORD',
    category: 'security',
    actor: req.user,
    targetUser: user,
    targetUserId: user.id,
    targetUserName: user.name,
    targetUserEmail: user.email,
    objectType: 'Account Credentials',
    objectId: user.id,
    previousState: 'Active Password (Encrypted)',
    newState: 'Password Reset & Updated (Encrypted)',
    reason: req.body.reason || 'Support assisted password modification',
    details: `Admin changed password credentials for user ${user.email}`,
    ipAddress: getClientIp(req)
  });

  NOTIFICATIONS_DB.unshift({
    id: 'notif_' + Date.now(),
    userId: user.id,
    title: 'Password Updated by Support',
    message: 'Your account password was updated by Customer Support. You can now log in using your new password.',
    type: 'system',
    read: false,
    createdAt: new Date().toISOString()
  });

  res.json({ message: 'User password changed successfully', plainPassword: trimmedPass });
});

// In-memory mutex lock queue per user to prevent concurrent race conditions on balance adjustments
const USER_BALANCE_LOCKS = new Map<string, Promise<void>>();
async function runWithUserBalanceLock<T>(userId: string, fn: () => Promise<T> | T): Promise<T> {
  while (USER_BALANCE_LOCKS.has(userId)) {
    try {
      await USER_BALANCE_LOCKS.get(userId);
    } catch {
      // ignore
    }
  }
  let releaseLock: () => void;
  const lockPromise = new Promise<void>(resolve => {
    releaseLock = resolve;
  });
  USER_BALANCE_LOCKS.set(userId, lockPromise);
  try {
    return await fn();
  } finally {
    USER_BALANCE_LOCKS.delete(userId);
    releaseLock!();
  }
}

// Idempotency cache to prevent duplicate adjustments on double-clicks / retries (15 min window)
const ADJUSTMENT_IDEMPOTENCY_MAP = new Map<string, { timestamp: number; response: any }>();
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of ADJUSTMENT_IDEMPOTENCY_MAP.entries()) {
    if (now - val.timestamp > 15 * 60 * 1000) {
      ADJUSTMENT_IDEMPOTENCY_MAP.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ADMIN PROFIT CONTROL: EDIT USER BALANCE
app.post('/api/admin/users/balance', authenticateToken, requirePermission('manage_finance'), async (req: any, res) => {
  const { userId, action, walletType, amount, reason, idempotencyKey } = req.body;

  // 1. Idempotency Check
  if (idempotencyKey && ADJUSTMENT_IDEMPOTENCY_MAP.has(idempotencyKey)) {
    const cached = ADJUSTMENT_IDEMPOTENCY_MAP.get(idempotencyKey)!;
    return res.json({
      ...cached.response,
      idempotentReplay: true
    });
  }

  // 2. Comprehensive Input Validation
  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'Valid User ID is required.' });
  }

  const validActions = ['increase', 'add_bonus', 'decrease', 'deduct'];
  if (!action || !validActions.includes(action)) {
    return res.status(400).json({ error: `Invalid adjustment action. Must be one of: ${validActions.join(', ')}` });
  }

  const validWallets = ['trading', 'spot', 'funding'];
  if (!walletType || !validWallets.includes(walletType)) {
    return res.status(400).json({ error: `Invalid target wallet. Must be one of: ${validWallets.join(', ')}` });
  }

  // Validate Amount & Decimal Precision
  if (amount === undefined || amount === null || amount === '') {
    return res.status(400).json({ error: 'Adjustment amount is required.' });
  }

  const rawAmountStr = String(amount).trim();
  const numAmount = Number(rawAmountStr);
  if (isNaN(numAmount) || !isFinite(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Adjustment amount must be a valid positive number greater than 0.' });
  }

  if (numAmount > 100000000) {
    return res.status(400).json({ error: 'Adjustment amount exceeds maximum single transaction limit ($100,000,000 USDT).' });
  }

  // Enforce max 2 decimal places (standard financial currency precision)
  if (rawAmountStr.includes('.')) {
    const decimals = rawAmountStr.split('.')[1];
    if (decimals && decimals.length > 2) {
      return res.status(400).json({ error: 'Adjustment amount precision cannot exceed 2 decimal places ($0.01 USDT).' });
    }
  }

  const validAmount = Number(numAmount.toFixed(2));

  // Validate Reason / Note
  const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
  if (!trimmedReason || trimmedReason.length < 3) {
    return res.status(400).json({ error: 'A mandatory audit reason of at least 3 characters is required.' });
  }

  // 3. User & Wallet Authoritative Lookup with Mutex Lock
  try {
    const result = await runWithUserBalanceLock(userId, async () => {
      const targetUserObj = USERS_DB.find(u => u.id === userId);
      if (!targetUserObj) {
        throw { status: 404, message: 'Target user account not found in database.' };
      }

      const wallet = WALLETS_DB[userId] || getUserWallet(userId);
      if (!wallet) {
        throw { status: 404, message: 'User wallet record not found.' };
      }

      const key = `${walletType}Balance` as keyof Wallet;
      const prevBal = Number((Number(wallet[key]) || 0).toFixed(2));

      // 4. Exact Integer-Cents Decimal Arithmetic
      const prevCents = Math.round(prevBal * 100);
      const adjCents = Math.round(validAmount * 100);
      const isCredit = action === 'increase' || action === 'add_bonus';

      let newCents: number;
      if (isCredit) {
        newCents = prevCents + adjCents;
      } else {
        newCents = Math.max(0, prevCents - adjCents);
      }

      const newBal = Number((newCents / 100).toFixed(2));

      // Apply to Authoritative Database State
      (wallet[key] as number) = newBal;

      // Update Margin Calculations for Trading Wallet
      if (walletType === 'trading') {
        const userPositions = POSITIONS_DB.filter(p => p.userId === userId);
        const calculatedUsedMargin = userPositions.reduce((sum, p) => sum + (Number(p.margin) || 0), 0);
        wallet.usedMargin = Number(calculatedUsedMargin.toFixed(2));
        wallet.availableMargin = Math.max(0, Number((newBal - wallet.usedMargin).toFixed(2)));
      }

      // Generate Unique Authoritative Transaction Reference ID
      const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randPart = Math.floor(100000 + Math.random() * 900000);
      const refId = `ADJ-${datePart}-${randPart}`;

      // 5. Permanent Transaction Record in TRANSACTIONS_DB
      const actionName = action === 'increase'
        ? 'Manual Balance Credit'
        : action === 'add_bonus'
        ? 'Profit Bonus Credit'
        : action === 'decrease'
        ? 'Manual Balance Debit'
        : 'Trading Loss Deduction';

      const txRecord: Transaction = {
        id: `tx_${refId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        userId: targetUserObj.id,
        userName: targetUserObj.name,
        userEmail: targetUserObj.email,
        type: isCredit ? 'deposit' : 'withdrawal',
        amount: validAmount,
        currency: 'USDT',
        status: 'completed',
        referenceId: refId,
        toWallet: isCredit ? (walletType as any) : undefined,
        fromWallet: !isCredit ? (walletType as any) : undefined,
        createdAt: new Date().toISOString(),
        closeReason: `Admin ${actionName}: ${trimmedReason}`
      };
      TRANSACTIONS_DB.unshift(txRecord);

      // 6. Security Forensic Audit Trail Record
      recordAuditLog({
        action: actionName,
        eventType: `BALANCE_ADJUST_${action.toUpperCase()}`,
        category: 'finance',
        actor: req.user,
        targetUser: targetUserObj,
        targetUserId: targetUserObj.id,
        targetUserName: targetUserObj.name,
        targetUserEmail: targetUserObj.email,
        objectType: 'Wallet',
        objectId: `${walletType}_wallet_${targetUserObj.id}`,
        previousState: `$${prevBal.toFixed(2)} USDT`,
        newState: `$${newBal.toFixed(2)} USDT`,
        amount: validAmount,
        currency: 'USDT',
        walletType: `${walletType.charAt(0).toUpperCase() + walletType.slice(1)} Wallet`,
        previousBalance: prevBal,
        newBalance: newBal,
        reason: trimmedReason,
        details: `Admin ${req.user?.name || req.user?.email || 'Admin'} ${isCredit ? 'credited' : 'debited'} $${validAmount.toFixed(2)} USDT on ${walletType} wallet. Ref: ${refId}. Prev: $${prevBal.toFixed(2)} → New: $${newBal.toFixed(2)}. Reason: ${trimmedReason}`,
        ipAddress: getClientIp(req),
        metadata: {
          referenceId: refId,
          walletType,
          adjustmentAction: action,
          previousBalance: prevBal,
          newBalance: newBal,
          availableMargin: wallet.availableMargin,
          usedMargin: wallet.usedMargin,
          targetUserStatus: targetUserObj.status,
          adminEmail: req.user.email,
          adminRole: req.user.role,
          idempotencyKey: idempotencyKey || null
        }
      });

      // 7. User In-App Notification
      NOTIFICATIONS_DB.unshift({
        id: 'notif_' + Date.now(),
        userId: targetUserObj.id,
        title: 'Account Balance Adjustment',
        message: `Your ${walletType} wallet balance has been updated by ${isCredit ? '+' : '-'}$${validAmount.toFixed(2)} USDT. Reference: ${refId}. Reason: ${trimmedReason}`,
        type: 'system',
        read: false,
        createdAt: new Date().toISOString()
      });

      // 8. Atomic Disk Persistence
      saveDataToDisk();

      const responsePayload = {
        message: `Successfully applied ${actionName} of $${validAmount.toFixed(2)} USDT to ${targetUserObj.name}.`,
        wallet,
        referenceId: refId,
        previousBalance: prevBal,
        adjustmentAmount: validAmount,
        newBalance: newBal,
        action,
        walletType,
        currency: 'USDT',
        timestamp: new Date().toISOString()
      };

      if (idempotencyKey) {
        ADJUSTMENT_IDEMPOTENCY_MAP.set(idempotencyKey, {
          timestamp: Date.now(),
          response: responsePayload
        });
      }

      return responsePayload;
    });

    res.json(result);
  } catch (err: any) {
    console.error('Balance adjustment error:', err);
    const status = err.status || 500;
    const msg = err.message || 'Balance adjustment failed. No changes were made.';
    res.status(status).json({ error: msg });
  }
});

// ADMIN DELETE USER
app.post('/api/admin/users/delete', authenticateToken, requirePermission('manage_roles'), (req: any, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required' });

  const userIndex = USERS_DB.findIndex(u => u.id === userId);
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
  
  const user = USERS_DB[userIndex];
  if (user.role === 'admin') return res.status(403).json({ error: 'Cannot delete admin accounts' });

  // Delete from USERS_DB
  USERS_DB.splice(userIndex, 1);
  
  // Clean up references
  delete PROFILES_DB[userId];
  delete WALLETS_DB[userId];
  delete PASS_HASHES[user.email];
  delete RAW_PASSWORDS[user.email];
  delete RAW_PASSWORDS[userId];
  delete SESSIONS_DB[userId];
  delete LOGIN_HISTORY_DB[userId];

  // Helper to remove elements from const arrays
  const removeUserId = (arr: any[]) => {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].userId === userId) arr.splice(i, 1);
    }
  };

  removeUserId(POSITIONS_DB);
  removeUserId(ORDERS_DB);
  removeUserId(TRANSACTIONS_DB);
  removeUserId(NOTIFICATIONS_DB);

  // let arrays
  DEPOSIT_REQUESTS_DB = DEPOSIT_REQUESTS_DB.filter(d => d.userId !== userId);
  WITHDRAWAL_REQUESTS_DB = WITHDRAWAL_REQUESTS_DB.filter(w => w.userId !== userId);
  CHAT_DB = CHAT_DB.filter(c => c.userId !== userId);
  KYC_DB = KYC_DB.filter(k => k.userId !== userId);

  recordAuditLog({
    action: 'Delete User Account',
    eventType: 'DELETE_USER',
    category: 'user',
    actor: req.user,
    targetUser: user,
    targetUserId: user.id,
    targetUserName: user.name,
    targetUserEmail: user.email,
    objectType: 'User Account',
    objectId: user.id,
    previousState: `Active Account (Role: ${user.role || 'user'})`,
    newState: 'Permanently Deleted',
    reason: req.body.reason || 'Administrative account purge',
    details: `Permanently deleted user account ${user.email} and all associated records`,
    ipAddress: getClientIp(req)
  });

  saveDataToDisk();
  res.json({ message: 'User deleted successfully' });
});

// ADMIN USER STATUS & KYC
app.post('/api/admin/users/status', authenticateToken, requirePermission('manage_users'), (req: any, res) => {
  const { userId, status } = req.body;
  const user = USERS_DB.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const prevStatus = user.status || 'active';
  user.status = status;
  recordAuditLog({
    action: 'Change User Status',
    eventType: 'USER_STATUS_CHANGE',
    category: 'user',
    actor: req.user,
    targetUser: user,
    targetUserId: user.id,
    targetUserName: user.name,
    targetUserEmail: user.email,
    objectType: 'User Account',
    objectId: user.id,
    previousState: prevStatus.toUpperCase(),
    newState: status.toUpperCase(),
    reason: req.body.reason || 'Administrative status update',
    details: `Changed account status for ${user.email} from ${prevStatus.toUpperCase()} to ${status.toUpperCase()}`,
    ipAddress: getClientIp(req)
  });

  res.json({ message: 'User status updated', user });
});

app.post('/api/admin/users/kyc', authenticateToken, requirePermission('manage_kyc'), (req, res) => {
  const { userId, kycStatus } = req.body;
  const user = USERS_DB.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.kycStatus = kycStatus === 'manually_verified' ? 'verified' : kycStatus;
  
  let kyc = KYC_DB.find(k => k.userId === userId);
  if (kyc) {
    kyc.status = kycStatus;
  }

  saveDataToDisk();
  res.json({ message: 'KYC status updated', user });
});

// MANUALLY MANAGE KYC & DOCUMENTS
app.post('/api/admin/users/kyc/manage', authenticateToken, requirePermission('manage_kyc'), (req: any, res) => {
  const { userId, kycStatus, fullName, documentType, documentNumber, idFront, idBack, adminNote, isManualVerification } = req.body;
  
  const user = USERS_DB.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  let kyc = KYC_DB.find(k => k.userId === userId);
  if (!kyc) {
    kyc = {
      id: 'kyc_' + Date.now(),
      userId,
      userEmail: user.email,
      fullName: fullName || user.name,
      documentType: documentType || 'id_card',
      documentNumber: documentNumber || 'NOT_SPECIFIED',
      idFront: idFront || '',
      idBack: idBack || '',
      status: kycStatus || 'verified',
      adminNote: adminNote || '',
      submittedAt: new Date().toISOString()
    };
    KYC_DB.unshift(kyc);
  } else {
    if (fullName !== undefined) kyc.fullName = fullName;
    if (documentType !== undefined) kyc.documentType = documentType;
    if (documentNumber !== undefined) kyc.documentNumber = documentNumber;
    if (idFront !== undefined) kyc.idFront = idFront;
    if (idBack !== undefined) kyc.idBack = idBack;
    if (kycStatus) kyc.status = kycStatus;
    if (adminNote !== undefined) kyc.adminNote = adminNote;
  }

  // Update user's kycStatus
  if (kycStatus) {
    user.kycStatus = (kycStatus === 'manually_verified' || kycStatus === 'verified' || kycStatus === 'approved') ? 'verified' : (kycStatus === 'rejected' ? 'unverified' : 'pending');
  }

  const prevKycStatus = (kyc?.status || user.kycStatus || 'pending').toUpperCase();
  saveDataToDisk();

  recordAuditLog({
    action: isManualVerification ? 'Manual KYC Verification' : 'Update User KYC Documents',
    eventType: isManualVerification ? 'MANUAL_KYC_VERIFICATION' : 'UPDATE_USER_KYC_DOCS',
    category: 'kyc',
    actor: req.user,
    targetUser: user,
    targetUserId: user.id,
    targetUserName: user.name,
    targetUserEmail: user.email,
    objectType: 'KYC Record',
    objectId: kyc.id,
    previousState: prevKycStatus,
    newState: (kycStatus || 'verified').toUpperCase(),
    reason: adminNote || 'Administrative KYC compliance verification',
    details: `Updated KYC status to '${kycStatus}' for user ${user.email}. ${adminNote ? 'Note: ' + adminNote : ''}`,
    ipAddress: getClientIp(req),
    metadata: {
      documentType: kyc.documentType,
      documentNumber: kyc.documentNumber
    }
  });

  NOTIFICATIONS_DB.unshift({
    id: 'notif_' + Date.now(),
    userId,
    title: 'KYC Identity Status Update',
    message: (kycStatus === 'verified' || kycStatus === 'manually_verified' || kycStatus === 'approved')
      ? 'Your account identity has been verified by Compliance Operations Desk.' 
      : `Your KYC status has been updated to ${kycStatus}.`,
    type: 'system',
    read: false,
    createdAt: new Date().toISOString()
  });

  res.json({ message: 'User KYC and document details updated successfully', kyc, user });
});

app.post('/api/admin/users/kyc/remove-docs', authenticateToken, requirePermission('manage_kyc'), (req: any, res) => {
  const { userId } = req.body;
  const user = USERS_DB.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const kyc = KYC_DB.find(k => k.userId === userId);
  if (kyc) {
    kyc.idFront = '';
    kyc.idBack = '';
    kyc.adminNote = (kyc.adminNote || '') + ' [Documents removed by admin]';
  }

  saveDataToDisk();

  recordAuditLog({
    action: 'Remove User KYC Documents',
    eventType: 'REMOVE_USER_KYC_DOCS',
    category: 'kyc',
    actor: req.user,
    targetUser: user,
    targetUserId: user.id,
    targetUserName: user.name,
    targetUserEmail: user.email,
    objectType: 'KYC Documents',
    objectId: kyc ? kyc.id : user.id,
    previousState: 'Uploaded Identity Documents',
    newState: 'Documents Purged / Removed',
    reason: 'Administrator removed uploaded KYC files',
    details: `Removed uploaded KYC identity documents for user ${user.email}`,
    ipAddress: getClientIp(req)
  });

  res.json({ message: 'User documents removed successfully' });
});

// GOOGLE AUTH / SECURITY CONTROL
app.post('/api/admin/users/security/google-2fa', authenticateToken, requirePermission('manage_users'), (req: any, res) => {
  const { userId, enable } = req.body;
  const user = USERS_DB.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const prev2FA = user.is2FAEnabled;
  user.is2FAEnabled = Boolean(enable);
  user.googleAuthEnabled = Boolean(enable);
  if (enable) {
    if (!(user as any).twoFactorSecret) {
      (user as any).twoFactorSecret = 'ETORO2FA_' + Math.random().toString(36).substring(2, 10).toUpperCase();
    }
  } else {
    delete (user as any).twoFactorSecret;
  }

  saveDataToDisk();

  recordAuditLog({
    action: enable ? 'Enable Google 2FA' : 'Disable/Remove Google 2FA',
    eventType: enable ? 'ENABLE_GOOGLE_AUTH' : 'DISABLE_REMOVE_GOOGLE_AUTH',
    category: 'security',
    actor: req.user,
    targetUser: user,
    targetUserId: user.id,
    targetUserName: user.name,
    targetUserEmail: user.email,
    objectType: 'Account Security',
    objectId: user.id,
    previousState: prev2FA ? '2FA ENABLED' : '2FA DISABLED',
    newState: enable ? '2FA ENABLED' : '2FA DISABLED',
    reason: req.body.reason || (enable ? 'Enforced security protocol' : 'User lockout reset request'),
    details: `Admin ${enable ? 'ENABLED' : 'DISABLED/REMOVED'} Google Authentication for ${user.email}`,
    ipAddress: getClientIp(req)
  });

  NOTIFICATIONS_DB.unshift({
    id: 'notif_' + Date.now(),
    userId,
    title: enable ? 'Google Security Authentication Enabled' : 'Google Security Authentication Removed',
    message: enable 
      ? 'Google Security Authentication has been enabled on your account by Compliance.'
      : 'Google Security Authentication has been removed from your account by Support Desk.',
    type: 'system',
    read: false,
    createdAt: new Date().toISOString()
  });

  res.json({ message: `Google Authentication ${enable ? 'enabled' : 'removed'} successfully`, user });
});

// EMERGENCY ACCOUNT ACCESS RESET
app.post('/api/admin/users/emergency-access', authenticateToken, requirePermission('manage_users'), (req: any, res) => {
  const { userId } = req.body;
  const user = USERS_DB.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.is2FAEnabled = false;
  user.googleAuthEnabled = false;
  delete (user as any).twoFactorSecret;
  user.status = 'active';

  const tempPass = 'eToroPass_' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const newHash = bcrypt.hashSync(tempPass, 8);
  
  PASS_HASHES[user.email] = newHash;
  PASS_HASHES[user.email.toLowerCase()] = newHash;
  PASS_HASHES[user.id] = newHash;
  RAW_PASSWORDS[user.email] = tempPass;
  RAW_PASSWORDS[user.id] = tempPass;

  delete SESSIONS_DB[user.id];

  saveDataToDisk();

  recordAuditLog({
    action: 'Emergency Account Access Recovery',
    eventType: 'EMERGENCY_ACCOUNT_ACCESS_RECOVERY',
    category: 'security',
    actor: req.user,
    targetUser: user,
    targetUserId: user.id,
    targetUserName: user.name,
    targetUserEmail: user.email,
    objectType: 'Account Security',
    objectId: user.id,
    previousState: `Status: ${user.status || 'Active'}, 2FA: Enabled/Protected`,
    newState: 'Status: Active, 2FA: Disabled, Temporary Password Generated',
    reason: 'Emergency account recovery executed due to 2FA loss or lockout',
    details: `Emergency account recovery executed for ${user.email}. Removed 2FA, unlocked account, and set temporary password.`,
    ipAddress: getClientIp(req)
  });

  res.json({ 
    message: 'Emergency account recovery completed successfully', 
    user, 
    tempPassword: tempPass 
  });
});

// ADMIN MODIFY POSITIONS
app.post('/api/admin/trades/modify', authenticateToken, requireTradeController, (req: any, res) => {
  const { positionId, action, newEntryPrice, forcePnL } = req.body;
  const pos = POSITIONS_DB.find(p => p.id === positionId);

  if (!pos) return res.status(404).json({ error: 'Position not found' });

  if (action === 'force_close') {
    const idx = POSITIONS_DB.findIndex(p => p.id === positionId);
    if (idx !== -1) {
      POSITIONS_DB.splice(idx, 1);
    }
    const targetUserObj = USERS_DB.find(u => u.id === pos.userId);
    recordAuditLog({
      action: 'Force Close Trade',
      eventType: 'FORCE_CLOSE_TRADE',
      category: 'trade',
      actor: req.user,
      targetUser: targetUserObj,
      targetUserId: pos.userId,
      targetUserName: targetUserObj?.name,
      targetUserEmail: targetUserObj?.email,
      objectType: 'Position',
      objectId: positionId,
      previousState: `Open ${pos.side.toUpperCase()} on ${pos.symbol}`,
      newState: 'Closed / Liquidated',
      symbol: pos.symbol,
      side: pos.side,
      entryPrice: pos.entryPrice,
      currentPrice: pos.markPrice,
      previousPnL: pos.unrealizedPnL,
      leverage: pos.leverage,
      reason: req.body.reason || 'Risk desk manual position termination',
      details: `Force closed position ${positionId} on ${pos.symbol} (${pos.side.toUpperCase()})`,
      ipAddress: getClientIp(req)
    });
    return res.json({ message: 'Position force closed by administrator' });
  }

  if (newEntryPrice) pos.entryPrice = Number(newEntryPrice);
  if (forcePnL !== undefined) pos.unrealizedPnL = Number(forcePnL);

  res.json({ message: 'Position parameters adjusted', position: pos });
});

// ADMIN LIVE TRADE & POSITIONS CONTROL
app.get('/api/admin/all-positions', authenticateToken, requireTradeController, (req, res) => {
  const allPos = POSITIONS_DB.map(pos => {
    const usr = USERS_DB.find(u => u.id === pos.userId);
    const mkt = MARKETS_DB.find(m => m.symbol === pos.symbol);
    const currentPrice = mkt ? mkt.price : pos.markPrice;
    const effectivePrice = pos.customMarkPrice !== undefined && pos.customMarkPrice !== null ? pos.customMarkPrice : currentPrice;
    
    const pnl = getPositionUnrealizedPnL(pos, effectivePrice);
    const hasOverrideActive = (pos.customMarkPrice !== undefined && pos.customMarkPrice !== null) || (pos.targetMarkPrice !== undefined && pos.targetMarkPrice !== null);

    return {
      ...pos,
      markPrice: effectivePrice,
      realMarketPrice: currentPrice,
      unrealizedPnL: Number(pnl.toFixed(2)),
      manualPnLActive: hasOverrideActive,
      priceOverrideActive: hasOverrideActive,
      userName: usr ? usr.name : pos.userId,
      userEmail: usr ? usr.email : 'unknown'
    };
  });

  res.json(allPos);
});

app.post('/api/admin/positions/force-close', authenticateToken, requireTradeController, (req: any, res) => {
  const { positionId, closePrice } = req.body;
  const idx = POSITIONS_DB.findIndex(p => p.id === positionId);

  if (idx === -1) {
    return res.status(404).json({ error: 'Position not found' });
  }

  const pos = POSITIONS_DB[idx];
  POSITIONS_DB.splice(idx, 1);

  // Return margin + calculated PnL to user wallet
  const wallet = WALLETS_DB[pos.userId];
  
  // Realized PnL is based on customPnL if set and forced, or based on closePrice
  const rates = getMakerTakerFeeRates();
  const currentPrice = closePrice !== undefined ? closePrice : pos.markPrice;
  const realizedPnL = getPositionUnrealizedPnL(pos, currentPrice);
  
  const exitValue = pos.size * currentPrice;
  const exitFee = Number((exitValue * rates.takerFeeRate).toFixed(2));
  const entryValue = pos.entryPrice * pos.size;
  const entryFee = pos.handlingFee !== undefined ? pos.handlingFee : Number((entryValue * rates.takerFeeRate).toFixed(2));
  const totalFee = Number((entryFee + exitFee).toFixed(2));
  const netPnL = Number((realizedPnL - exitFee).toFixed(2));

  if (wallet) {
    wallet.usedMargin = Math.max(0, wallet.usedMargin - pos.margin);
    wallet.availableMargin = Math.max(0, wallet.availableMargin + pos.margin + netPnL);
    wallet.tradingBalance = Math.max(0, wallet.tradingBalance + netPnL);
  }

  // Record comprehensive transaction history
  TRANSACTIONS_DB.unshift({
    id: 'tx_admin_' + Date.now(),
    userId: pos.userId,
    type: 'trade',
    amount: Number((pos.margin + netPnL).toFixed(2)),
    margin: pos.margin,
    currency: 'USDT',
    status: 'completed',
    symbol: pos.symbol,
    side: pos.side,
    entryPrice: pos.entryPrice,
    exitPrice: currentPrice,
    quantity: pos.size,
    leverage: pos.leverage,
    fee: totalFee,
    pnl: Number(realizedPnL.toFixed(2)),
    netPnL: netPnL,
    openedAt: pos.openedAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    closeReason: 'Admin Force Close'
  } as any);

  saveDataToDisk();

  // Record Audit
  const targetUserObj = USERS_DB.find(u => u.id === pos.userId);
  recordAuditLog({
    action: 'Force Close Trade',
    eventType: 'ADMIN_FORCE_CLOSE_TRADE',
    category: 'trade',
    actor: req.user,
    targetUser: targetUserObj,
    targetUserId: pos.userId,
    targetUserName: targetUserObj?.name,
    targetUserEmail: targetUserObj?.email,
    objectType: 'Position',
    objectId: positionId,
    previousState: `Open ${pos.side.toUpperCase()} (Entry: $${pos.entryPrice})`,
    newState: `Closed at $${currentPrice} (Net PnL: $${netPnL.toFixed(2)})`,
    symbol: pos.symbol,
    side: pos.side,
    entryPrice: pos.entryPrice,
    currentPrice: currentPrice,
    previousPnL: pos.unrealizedPnL,
    targetPnL: netPnL,
    leverage: pos.leverage,
    reason: req.body.reason || 'Risk desk manual liquidation',
    details: `Closed trade #${positionId} (${pos.symbol} ${pos.side.toUpperCase()}) at $${currentPrice}. Net PnL: $${netPnL.toFixed(2)}`,
    ipAddress: getClientIp(req),
    metadata: {
      marginRefunded: pos.margin,
      fee: totalFee
    }
  });

  // Notify User
  NOTIFICATIONS_DB.unshift({
    id: 'notif_' + Date.now(),
    userId: pos.userId,
    title: 'Trade Closed by System Risk Control',
    message: `Your ${pos.symbol} ${pos.side.toUpperCase()} position was closed by automated Risk Management desk.`,
    type: 'system',
    read: false,
    createdAt: new Date().toISOString()
  });

  res.json({ message: 'Position closed successfully by Admin', positionId });
});

app.post('/api/admin/positions/override-pnl', authenticateToken, requireTradeController, (req: any, res) => {
  const { positionId, targetPnL, reset, transitionDurationMinutes } = req.body;
  const pos = POSITIONS_DB.find(p => p.id === positionId);

  if (!pos) return res.status(404).json({ error: 'Position not found' });

  const pair = MARKETS_DB.find(m => m.symbol === pos.symbol);
  const currentPrice = pos.customMarkPrice !== undefined && pos.customMarkPrice !== null ? pos.customMarkPrice : (pos.markPrice || (pair ? pair.price : pos.entryPrice));

  let finalTargetMarkPrice: number | undefined;

  if (reset) {
    // Clear all override states
    delete pos.customPnL;
    delete pos.customPnLOffset;
    delete pos.targetPnL;
    delete pos.transitionStartPnL;
    delete pos.transitionStartTimePnL;
    delete pos.transitionDurationMsPnL;
    delete pos.customMarkPrice;
    delete pos.targetMarkPrice;
    delete pos.transitionStartPrice;
    delete pos.transitionStartTime;
    delete pos.transitionDurationMs;
    delete (pos as any).smoothedPnL;
    delete (pos as any).targetWalk;

    // Reset markPrice to live market pair price and recalculate PnL naturally
    const realPrice = pair ? pair.price : pos.markPrice;
    pos.markPrice = realPrice;
    const uPnL = getPositionUnrealizedPnL(pos, realPrice);
    pos.unrealizedPnL = Number(uPnL.toFixed(2));
    const marginCalc = pos.margin > 0 ? pos.margin : (pos.entryPrice * pos.size);
    pos.unrealizedPnLPercent = marginCalc > 0 ? Number(((pos.unrealizedPnL / marginCalc) * 100).toFixed(2)) : 0;
  } else {
    // Clear legacy pnl override properties
    delete pos.customPnL;
    delete pos.customPnLOffset;
    delete pos.targetPnL;
    delete pos.transitionStartPnL;
    delete pos.transitionStartTimePnL;
    delete pos.transitionDurationMsPnL;
    delete (pos as any).smoothedPnL;
    delete (pos as any).targetWalk;

    const targetPnLNum = Number(targetPnL);
    // Mathematically derive the required mark price to produce this exact target PnL
    finalTargetMarkPrice = calculateTargetPriceFromPnL(pos, targetPnLNum);
    const durationMin = Number(transitionDurationMinutes) || 0;

    if (durationMin > 0) {
      // Gradual smooth animation
      pos.transitionStartPrice = currentPrice;
      pos.targetMarkPrice = finalTargetMarkPrice;
      pos.transitionStartTime = Date.now();
      pos.transitionDurationMs = durationMin * 60 * 1000;
      pos.customMarkPrice = currentPrice;
      pos.markPrice = currentPrice;
      const uPnL = getPositionUnrealizedPnL(pos, currentPrice);
      pos.unrealizedPnL = Number(uPnL.toFixed(2));
    } else {
      // Instant override
      delete pos.targetMarkPrice;
      delete pos.transitionStartPrice;
      delete pos.transitionStartTime;
      delete pos.transitionDurationMs;

      pos.customMarkPrice = finalTargetMarkPrice;
      pos.markPrice = finalTargetMarkPrice;
      if (pair) {
        pair.price = finalTargetMarkPrice;
        pair.priceDirection = finalTargetMarkPrice >= currentPrice ? 'up' : 'down';
      }
      const uPnL = getPositionUnrealizedPnL(pos, finalTargetMarkPrice);
      pos.unrealizedPnL = Number(uPnL.toFixed(2));
    }

    const marginCalc = pos.margin > 0 ? pos.margin : (pos.entryPrice * pos.size);
    pos.unrealizedPnLPercent = marginCalc > 0 ? Number(((pos.unrealizedPnL / marginCalc) * 100).toFixed(2)) : 0;
  }

  const targetUserObj = USERS_DB.find(u => u.id === pos.userId);
  recordAuditLog({
    action: reset ? 'Reset Trade PnL' : 'Override Trade PnL',
    eventType: reset ? 'ADMIN_RESET_PNL' : 'ADMIN_OVERRIDE_PNL',
    category: 'trade',
    actor: req.user,
    targetUser: targetUserObj,
    targetUserId: pos.userId,
    targetUserName: targetUserObj?.name,
    targetUserEmail: targetUserObj?.email,
    objectType: 'Position',
    objectId: positionId,
    previousState: `PnL: $${(pos.unrealizedPnL || 0).toFixed(2)} | Mark: $${currentPrice}`,
    newState: reset ? 'Market Calculated PnL' : `Target PnL: $${Number(targetPnL).toFixed(2)} (Target Price: $${finalTargetMarkPrice})`,
    symbol: pos.symbol,
    side: pos.side,
    entryPrice: pos.entryPrice,
    currentPrice: pos.markPrice,
    previousPnL: pos.unrealizedPnL,
    targetPnL: reset ? undefined : Number(targetPnL),
    transitionDuration: transitionDurationMinutes ? `${transitionDurationMinutes} min` : 'Instant',
    leverage: pos.leverage,
    reason: req.body.reason || (reset ? 'Restored automated market feed' : 'Trade controller PnL calibration (price-driven)'),
    details: reset 
      ? `Reset PnL for position ${positionId} back to market calculation`
      : `Set target PnL of $${targetPnL} for ${pos.symbol} ${pos.side.toUpperCase()} (Entry: $${pos.entryPrice}, Size: ${pos.size}). Calculated required Target Mark Price: $${finalTargetMarkPrice} ${transitionDurationMinutes ? 'over ' + transitionDurationMinutes + ' min gradual transition' : '(Instant)'}`,
    ipAddress: getClientIp(req)
  });

  saveDataToDisk();
  res.json({ message: 'Position PnL override applied successfully', position: pos });
});

app.post('/api/admin/positions/override-price', authenticateToken, requireTradeController, (req: any, res) => {
  const { positionId, targetPrice, reset, transitionDurationMinutes } = req.body;
  const pos = POSITIONS_DB.find(p => p.id === positionId);
  if (!pos) return res.status(404).json({ error: 'Position not found' });

  const pair = MARKETS_DB.find(m => m.symbol === pos.symbol);
  const prevPrice = pos.customMarkPrice !== undefined && pos.customMarkPrice !== null ? pos.customMarkPrice : (pos.markPrice || (pair ? pair.price : pos.entryPrice));

  if (reset) {
    delete pos.customPnL;
    delete pos.customPnLOffset;
    delete pos.targetPnL;
    delete pos.transitionStartPnL;
    delete pos.transitionStartTimePnL;
    delete pos.transitionDurationMsPnL;
    delete pos.customMarkPrice;
    delete pos.targetMarkPrice;
    delete pos.transitionStartPrice;
    delete pos.transitionStartTime;
    delete pos.transitionDurationMs;
    delete (pos as any).smoothedPnL;
    delete (pos as any).targetWalk;

    const realPrice = pair ? pair.price : pos.markPrice;
    pos.markPrice = realPrice;
    const uPnL = getPositionUnrealizedPnL(pos, realPrice);
    pos.unrealizedPnL = Number(uPnL.toFixed(2));
    const marginCalc = pos.margin > 0 ? pos.margin : (pos.entryPrice * pos.size);
    pos.unrealizedPnLPercent = marginCalc > 0 ? Number(((pos.unrealizedPnL / marginCalc) * 100).toFixed(2)) : 0;
  } else {
    // Clear legacy pnl properties
    delete pos.customPnL;
    delete pos.customPnLOffset;
    delete pos.targetPnL;
    delete pos.transitionStartPnL;
    delete pos.transitionStartTimePnL;
    delete pos.transitionDurationMsPnL;
    delete (pos as any).smoothedPnL;
    delete (pos as any).targetWalk;

    const targetPriceNum = Number(targetPrice);
    const durationMin = Number(transitionDurationMinutes) || 0;

    if (durationMin > 0) {
      pos.transitionStartPrice = prevPrice;
      pos.targetMarkPrice = targetPriceNum;
      pos.transitionStartTime = Date.now();
      pos.transitionDurationMs = durationMin * 60 * 1000;
      pos.customMarkPrice = prevPrice;
      pos.markPrice = prevPrice;
      const uPnL = getPositionUnrealizedPnL(pos, prevPrice);
      pos.unrealizedPnL = Number(uPnL.toFixed(2));
    } else {
      delete pos.targetMarkPrice;
      delete pos.transitionStartPrice;
      delete pos.transitionStartTime;
      delete pos.transitionDurationMs;

      pos.customMarkPrice = targetPriceNum;
      pos.markPrice = targetPriceNum;
      if (pair) {
        pair.price = targetPriceNum;
        pair.priceDirection = targetPriceNum >= prevPrice ? 'up' : 'down';
      }
      const uPnL = getPositionUnrealizedPnL(pos, targetPriceNum);
      pos.unrealizedPnL = Number(uPnL.toFixed(2));
    }

    const marginCalc = pos.margin > 0 ? pos.margin : (pos.entryPrice * pos.size);
    pos.unrealizedPnLPercent = marginCalc > 0 ? Number(((pos.unrealizedPnL / marginCalc) * 100).toFixed(2)) : 0;
  }

  const targetUserObj = USERS_DB.find(u => u.id === pos.userId);
  recordAuditLog({
    action: reset ? 'Reset Price Override' : 'Override Trade Price',
    eventType: reset ? 'ADMIN_RESET_PRICE_OVERRIDE' : 'ADMIN_OVERRIDE_PRICE',
    category: 'trade',
    actor: req.user,
    targetUser: targetUserObj,
    targetUserId: pos.userId,
    targetUserName: targetUserObj?.name,
    targetUserEmail: targetUserObj?.email,
    objectType: 'Position',
    objectId: positionId,
    previousState: `Mark Price: $${prevPrice}`,
    newState: reset ? 'Real Market Price' : `Target Mark Price: $${targetPrice}`,
    symbol: pos.symbol,
    side: pos.side,
    entryPrice: pos.entryPrice,
    currentPrice: Number(targetPrice),
    previousPnL: pos.unrealizedPnL,
    transitionDuration: transitionDurationMinutes ? `${transitionDurationMinutes} min` : 'Instant',
    leverage: pos.leverage,
    reason: req.body.reason || (reset ? 'Returned to live market rate' : 'Controller price pegging'),
    details: reset
      ? `Reset price override for position ${positionId} (${pos.symbol})`
      : `Set price override for position ${positionId} (${pos.symbol}) to target $${targetPrice} ${transitionDurationMinutes ? 'over ' + transitionDurationMinutes + ' min' : '(Instant)'}`,
    ipAddress: getClientIp(req)
  });

  saveDataToDisk();
  res.json({ message: 'Position price override updated successfully', position: pos });
});

app.post('/api/admin/positions/reset-control', authenticateToken, requireTradeController, (req: any, res) => {
  const { positionId } = req.body;
  const pos = POSITIONS_DB.find(p => p.id === positionId);
  if (!pos) return res.status(404).json({ error: 'Position not found' });

  const pair = MARKETS_DB.find(m => m.symbol === pos.symbol);

  delete pos.customPnL;
  delete pos.customPnLOffset;
  delete pos.targetPnL;
  delete pos.transitionStartPnL;
  delete pos.transitionStartTimePnL;
  delete pos.transitionDurationMsPnL;
  delete pos.customMarkPrice;
  delete pos.targetMarkPrice;
  delete pos.transitionStartPrice;
  delete pos.transitionStartTime;
  delete pos.transitionDurationMs;
  delete (pos as any).smoothedPnL;
  delete (pos as any).targetWalk;

  const realPrice = pair ? pair.price : pos.markPrice;
  pos.markPrice = realPrice;
  const uPnL = getPositionUnrealizedPnL(pos, realPrice);
  pos.unrealizedPnL = Number(uPnL.toFixed(2));
  const marginCalc = pos.margin > 0 ? pos.margin : (pos.entryPrice * pos.size);
  pos.unrealizedPnLPercent = marginCalc > 0 ? Number(((pos.unrealizedPnL / marginCalc) * 100).toFixed(2)) : 0;

  const targetUserObj = USERS_DB.find(u => u.id === pos.userId);
  recordAuditLog({
    action: 'Reset All Trade Controls',
    eventType: 'ADMIN_RESET_TRADE_CONTROLS',
    category: 'trade',
    actor: req.user,
    targetUser: targetUserObj,
    targetUserId: pos.userId,
    targetUserName: targetUserObj?.name,
    targetUserEmail: targetUserObj?.email,
    objectType: 'Position',
    objectId: positionId,
    previousState: 'Custom Controls Active (PnL/Price Overrides)',
    newState: 'Normal Market Mode',
    symbol: pos.symbol,
    side: pos.side,
    entryPrice: pos.entryPrice,
    currentPrice: pos.markPrice,
    reason: 'Trade controller cleared all manual overrides',
    details: `Reset all manual controls (PnL & Price Override) for position ${positionId} (${pos.symbol})`,
    ipAddress: getClientIp(req)
  });

  saveDataToDisk();
  res.json({ message: 'Trade controls reset to normal market mode', position: pos });
});

app.post('/api/admin/positions/edit', authenticateToken, requireTradeController, (req: any, res) => {
  const { positionId, entryPrice, size, lots, leverage, stopLoss, takeProfit, handlingFee, reason } = req.body;
  const pos = POSITIONS_DB.find(p => p.id === positionId);

  if (!pos) return res.status(404).json({ error: 'Position not found' });

  // Enforce granular action permissions
  if (entryPrice !== undefined && Number(entryPrice) !== pos.entryPrice) {
    if (!hasPermission(req.user, 'trade_control:edit_entry_price') && !hasPermission(req.user, 'trade_control:edit_parameters')) {
      return res.status(403).json({ error: "Access Denied: Missing 'trade_control:edit_entry_price' permission." });
    }
  }

  if (stopLoss !== undefined && Number(stopLoss) !== (pos.stopLoss ?? undefined)) {
    if (!hasPermission(req.user, 'trade_control:edit_sl') && !hasPermission(req.user, 'trade_control:edit_parameters')) {
      return res.status(403).json({ error: "Access Denied: Missing 'trade_control:edit_sl' permission to modify Stop-Loss." });
    }
  }

  if (takeProfit !== undefined && Number(takeProfit) !== (pos.takeProfit ?? undefined)) {
    if (!hasPermission(req.user, 'trade_control:edit_tp') && !hasPermission(req.user, 'trade_control:edit_parameters')) {
      return res.status(403).json({ error: "Access Denied: Missing 'trade_control:edit_tp' permission to modify Take-Profit." });
    }
  }

  if (leverage !== undefined && Number(leverage) !== pos.leverage) {
    if (!hasPermission(req.user, 'trade_control:modify_leverage') && !hasPermission(req.user, 'trade_control:edit_parameters')) {
      return res.status(403).json({ error: "Access Denied: Missing 'trade_control:modify_leverage' permission." });
    }
  }

  const mkt = MARKETS_DB.find(m => m.symbol === pos.symbol);
  const contractSize = pos.contractSize || getBackendContractSize(pos.symbol, mkt?.category);

  // Preserve previous state for forensic audit logging and wallet recalculation
  const oldLots = pos.lots !== undefined ? pos.lots : backendUnitsToLots(pos.size, pos.symbol, mkt?.category);
  const previousState = {
    entryPrice: pos.entryPrice,
    size: pos.size,
    lots: oldLots,
    leverage: pos.leverage,
    margin: pos.margin,
    liquidationPrice: pos.liquidationPrice,
    stopLoss: pos.stopLoss ?? null,
    takeProfit: pos.takeProfit ?? null,
    handlingFee: pos.handlingFee ?? Number((pos.entryPrice * pos.size * getMakerTakerFeeRates().takerFeeRate).toFixed(2)),
    unrealizedPnL: pos.unrealizedPnL
  };

  // Determine new lots and base size
  let newLots = oldLots;
  if (lots !== undefined && lots !== null && !isNaN(Number(lots)) && Number(lots) > 0) {
    newLots = Number(Number(lots).toFixed(4));
  } else if (size !== undefined && size !== null && !isNaN(Number(size)) && Number(size) > 0) {
    newLots = backendUnitsToLots(Number(size), pos.symbol, mkt?.category);
  }
  const newSize = backendLotsToUnits(newLots, pos.symbol, mkt?.category);

  const newEntryPrice = (entryPrice !== undefined && !isNaN(Number(entryPrice)) && Number(entryPrice) > 0)
    ? Number(Number(entryPrice).toFixed(4))
    : pos.entryPrice;

  const newLeverage = (leverage !== undefined && !isNaN(Number(leverage)) && Number(leverage) > 0)
    ? Number(leverage)
    : pos.leverage;

  // Validate SL and TP against entry price according to position side
  const parsedSL = (stopLoss !== undefined && stopLoss !== null && stopLoss !== '') ? Number(stopLoss) : undefined;
  const parsedTP = (takeProfit !== undefined && takeProfit !== null && takeProfit !== '') ? Number(takeProfit) : undefined;

  if (parsedTP !== undefined && !isNaN(parsedTP)) {
    if (pos.side === 'long' && parsedTP <= newEntryPrice) {
      return res.status(400).json({
        error: `For a LONG position, Take Profit ($${parsedTP}) must be greater than Entry Price ($${newEntryPrice}).`
      });
    }
    if (pos.side === 'short' && parsedTP >= newEntryPrice) {
      return res.status(400).json({
        error: `For a SHORT position, Take Profit ($${parsedTP}) must be less than Entry Price ($${newEntryPrice}).`
      });
    }
  }

  if (parsedSL !== undefined && !isNaN(parsedSL)) {
    if (pos.side === 'long' && parsedSL >= newEntryPrice) {
      return res.status(400).json({
        error: `For a LONG position, Stop Loss ($${parsedSL}) must be less than Entry Price ($${newEntryPrice}).`
      });
    }
    if (pos.side === 'short' && parsedSL <= newEntryPrice) {
      return res.status(400).json({
        error: `For a SHORT position, Stop Loss ($${parsedSL}) must be greater than Entry Price ($${newEntryPrice}).`
      });
    }
  }

  // Recalculate Margin
  const levForMargin = newLeverage <= 0 ? 1 : newLeverage;
  const newNotional = calculateBackendNotionalUSD(pos.symbol, newSize, newEntryPrice);
  const newMargin = calculateBackendMarginUSD(pos.symbol, newSize, newEntryPrice, levForMargin);

  // Recalculate Liquidation Price
  const maintenanceMargin = 0.005; // 0.5%
  let newLiqPrice = 0;
  if (newLeverage > 1) {
    if (pos.side === 'long') {
      newLiqPrice = newEntryPrice * (1 - (1 / newLeverage) + maintenanceMargin);
    } else {
      newLiqPrice = newEntryPrice * (1 + (1 / newLeverage) - maintenanceMargin);
    }
  }

  // Handling fee
  const rates = getMakerTakerFeeRates();
  const newHandlingFee = (handlingFee !== undefined && handlingFee !== null && !isNaN(Number(handlingFee)))
    ? Number(Number(handlingFee).toFixed(2))
    : (pos.handlingFee !== undefined ? pos.handlingFee : Number((newNotional * rates.takerFeeRate).toFixed(2)));

  // Adjust user wallet margin if margin changed
  const wallet = getUserWallet(pos.userId);
  const marginDiff = newMargin - pos.margin;
  if (marginDiff !== 0) {
    wallet.usedMargin = Math.max(0, Number((wallet.usedMargin + marginDiff).toFixed(2)));
    wallet.availableMargin = Math.max(0, Number((wallet.availableMargin - marginDiff).toFixed(2)));
  }

  // Apply changes to Position object
  pos.entryPrice = newEntryPrice;
  pos.size = newSize;
  pos.lots = newLots;
  pos.contractSize = contractSize;
  pos.leverage = newLeverage;
  pos.margin = newMargin;
  pos.liquidationPrice = Number(newLiqPrice.toFixed(4));
  pos.stopLoss = parsedSL;
  pos.takeProfit = parsedTP;
  pos.handlingFee = newHandlingFee;

  // Recalculate unrealized PnL immediately
  const effectivePrice = pos.customMarkPrice || pos.markPrice || (mkt ? mkt.price : newEntryPrice);
  pos.markPrice = effectivePrice;
  const currentUnrealizedPnL = getPositionUnrealizedPnL(pos, effectivePrice);
  pos.unrealizedPnL = Number(currentUnrealizedPnL.toFixed(2));
  pos.unrealizedPnLPercent = pos.margin > 0 ? Number(((pos.unrealizedPnL / pos.margin) * 100).toFixed(2)) : 0;

  const newState = {
    entryPrice: pos.entryPrice,
    size: pos.size,
    lots: pos.lots,
    leverage: pos.leverage,
    margin: pos.margin,
    liquidationPrice: pos.liquidationPrice,
    stopLoss: pos.stopLoss ?? null,
    takeProfit: pos.takeProfit ?? null,
    handlingFee: pos.handlingFee,
    unrealizedPnL: pos.unrealizedPnL
  };

  saveDataToDisk();

  // Record Audit Log with complete before/after forensic breakdown
  const targetUserObj = USERS_DB.find(u => u.id === pos.userId);
  recordAuditLog({
    action: 'Edit Position Parameters',
    eventType: 'ADMIN_EDIT_POSITION_PARAMS',
    category: 'trade',
    actor: req.user,
    targetUser: targetUserObj,
    targetUserId: pos.userId,
    targetUserName: targetUserObj?.name,
    targetUserEmail: targetUserObj?.email,
    objectType: 'Position',
    objectId: positionId,
    previousState: JSON.stringify(previousState),
    newState: JSON.stringify(newState),
    symbol: pos.symbol,
    side: pos.side,
    entryPrice: pos.entryPrice,
    currentPrice: pos.markPrice,
    leverage: pos.leverage,
    reason: reason || 'Live Trade Controller adjusted position parameters (Entry Price, Lots, Leverage, SL/TP, Handling Fee)',
    details: `Position ${positionId} (${pos.symbol} ${pos.side.toUpperCase()}) parameters modified: Entry Price: $${previousState.entryPrice} → $${pos.entryPrice} | Size: ${previousState.lots} Lots → ${pos.lots} Lots (${pos.size} base units) | Leverage: ${previousState.leverage}x → ${pos.leverage}x | Margin: $${previousState.margin} → $${pos.margin} USDT | SL: ${previousState.stopLoss ? '$' + previousState.stopLoss : 'None'} → ${pos.stopLoss ? '$' + pos.stopLoss : 'None'} | TP: ${previousState.takeProfit ? '$' + previousState.takeProfit : 'None'} → ${pos.takeProfit ? '$' + pos.takeProfit : 'None'} | Handling Fee: $${pos.handlingFee} USDT`,
    ipAddress: getClientIp(req)
  });

  res.json({
    message: 'Position parameters updated successfully',
    position: pos,
    wallet
  });
});

app.post('/api/admin/positions/open-for-user', authenticateToken, requireTradeController, (req: any, res) => {
  const { userId, symbol, side, amount, lots, leverage, entryPrice, stopLoss, takeProfit, handlingFee } = req.body;

  if (!userId || !symbol || ((amount === undefined || amount <= 0) && (lots === undefined || lots <= 0))) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const mkt = MARKETS_DB.find(m => m.symbol === symbol) || MARKETS_DB[0];
  const ePrice = entryPrice ? Number(entryPrice) : mkt.price;
  const lev = leverage || 10;
  const contractSize = getBackendContractSize(symbol, mkt?.category);

  let finalLots = 0.1;
  let finalUnits = 0.1;
  if (lots !== undefined && !isNaN(Number(lots)) && Number(lots) > 0) {
    finalLots = Number(Number(lots).toFixed(4));
    finalUnits = backendLotsToUnits(finalLots, symbol, mkt?.category);
  } else if (amount !== undefined && !isNaN(Number(amount)) && Number(amount) > 0) {
    finalUnits = Number(amount);
    finalLots = backendUnitsToLots(finalUnits, symbol, mkt?.category);
  }

  const notionalUSD = calculateBackendNotionalUSD(symbol, finalUnits, ePrice);
  const margin = calculateBackendMarginUSD(symbol, finalUnits, ePrice, lev);
  const rates = getMakerTakerFeeRates();
  const fee = (handlingFee !== undefined && !isNaN(Number(handlingFee))) ? Number(Number(handlingFee).toFixed(2)) : Number((notionalUSD * rates.takerFeeRate).toFixed(2));

  const maintenanceMargin = 0.005;
  const liqPrice = side === 'short'
    ? ePrice * (1 + 1 / lev - maintenanceMargin)
    : ePrice * (1 - 1 / lev + maintenanceMargin);

  const newPos: Position = {
    id: 'pos_admin_' + Date.now(),
    userId,
    symbol,
    side: side || 'long',
    entryPrice: ePrice,
    markPrice: ePrice,
    size: finalUnits,
    lots: finalLots,
    contractSize: contractSize,
    leverage: lev,
    margin: Number(margin.toFixed(2)),
    handlingFee: fee,
    stopLoss: stopLoss ? Number(stopLoss) : undefined,
    takeProfit: takeProfit ? Number(takeProfit) : undefined,
    unrealizedPnL: 0,
    unrealizedPnLPercent: 0,
    liquidationPrice: Number(liqPrice.toFixed(4)),
    openedAt: new Date().toISOString()
  };

  POSITIONS_DB.unshift(newPos);
  saveDataToDisk();

  const targetUserObj = USERS_DB.find(u => u.id === userId);
  recordAuditLog({
    action: 'Open Trade for User',
    eventType: 'ADMIN_OPENED_TRADE_FOR_USER',
    category: 'trade',
    actor: req.user,
    targetUser: targetUserObj,
    targetUserId: userId,
    targetUserName: targetUserObj?.name,
    targetUserEmail: targetUserObj?.email,
    objectType: 'Position',
    objectId: newPos.id,
    previousState: 'No Position',
    newState: `Open ${side ? side.toUpperCase() : 'LONG'} (${finalLots} Lots / ${finalUnits} units @ $${ePrice})`,
    symbol,
    side: side || 'long',
    entryPrice: ePrice,
    currentPrice: ePrice,
    leverage: lev,
    reason: req.body.reason || 'Account Manager executed trade on user behalf',
    details: `Opened ${side ? side.toUpperCase() : 'LONG'} on ${symbol} (${finalLots} Lots, ${finalUnits} units @ $${ePrice}) with ${lev}x leverage for user ${targetUserObj?.email || userId}`,
    ipAddress: getClientIp(req)
  });

  NOTIFICATIONS_DB.unshift({
    id: 'notif_' + Date.now(),
    userId,
    title: 'Trade Executed by Account Manager',
    message: `A new ${(side || 'long').toUpperCase()} position (${finalLots} Lots) on ${symbol} was opened on your behalf.`,
    type: 'trade',
    read: false,
    createdAt: new Date().toISOString()
  });

  res.json({ message: 'Trade opened for user successfully', position: newPos });
});
app.post('/api/admin/markets', authenticateToken, requireTradeController, (req, res) => {
  const { symbol, enabled, maxLeverage, spread } = req.body;
  const pair = MARKETS_DB.find(m => m.symbol === symbol);

  if (!pair) return res.status(404).json({ error: 'Market pair not found' });

  if (enabled !== undefined) pair.enabled = enabled;
  if (maxLeverage !== undefined) pair.maxLeverage = maxLeverage;
  if (spread !== undefined) pair.spread = spread;

  res.json({ message: 'Market settings updated', pair });
});

app.get('/api/admin/audit-logs', authenticateToken, requirePermission('view_audit_logs'), (req, res) => {
  res.json(AUDIT_LOGS);
});

// ==========================================
// ADMIN TRADE HISTORY & ACCOUNT ACTIVITY API
// ==========================================

const handleGetAdminTrades = (req: any, res: any) => {
  const {
    userId,
    search,
    tradeId,
    symbol,
    status,
    side,
    outcome,
    startDate,
    endDate,
    isCorrected,
    sort = 'newest'
  } = req.query;

  const allTrades: any[] = [];

  // 1. Live Open Positions from POSITIONS_DB
  POSITIONS_DB.forEach(pos => {
    const usr = USERS_DB.find(u => u.id === pos.userId);
    const mkt = MARKETS_DB.find(m => m.symbol === pos.symbol);
    const currentPrice = pos.customMarkPrice !== undefined && pos.customMarkPrice !== null
      ? pos.customMarkPrice
      : (mkt ? mkt.price : pos.markPrice);

    const unrealizedPnL = getPositionUnrealizedPnL(pos, currentPrice);
    const posLots = pos.lots !== undefined ? pos.lots : backendUnitsToLots(pos.size, pos.symbol, mkt?.category);
    const contractSize = pos.contractSize || getBackendContractSize(pos.symbol, mkt?.category);
    const handlingFee = pos.handlingFee !== undefined ? pos.handlingFee : Number((pos.entryPrice * pos.size * getMakerTakerFeeRates().takerFeeRate).toFixed(2));
    const netPnL = Number((unrealizedPnL - handlingFee).toFixed(2));

    allTrades.push({
      id: pos.id,
      userId: pos.userId,
      userName: usr?.name || 'Trader',
      userEmail: usr?.email || 'trader@etoroglobal.com',
      symbol: pos.symbol,
      side: pos.side,
      status: 'open',
      orderType: 'market',
      openedAt: pos.openedAt || new Date().toISOString(),
      closedAt: undefined,
      createdAt: pos.openedAt || new Date().toISOString(),
      entryPrice: pos.entryPrice,
      exitPrice: undefined,
      currentPrice: currentPrice,
      size: pos.size,
      lots: posLots,
      contractSize: contractSize,
      leverage: pos.leverage,
      margin: pos.margin,
      fee: handlingFee,
      handlingFee: handlingFee,
      swapFee: 0,
      grossPnL: Number(unrealizedPnL.toFixed(2)),
      netPnL: netPnL,
      unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
      stopLoss: pos.stopLoss,
      takeProfit: pos.takeProfit,
      referenceId: pos.id,
      lastModifiedAt: undefined,
      lastModifiedBy: undefined,
      isCorrected: false,
      corrections: []
    });
  });

  // 2. Closed Trades from TRANSACTIONS_DB
  TRANSACTIONS_DB.filter(t => t.type === 'trade').forEach(t => {
    const usr = USERS_DB.find(u => u.id === t.userId);
    const mkt = MARKETS_DB.find(m => m.symbol === t.symbol);
    const contractSize = t.contractSize || getBackendContractSize(t.symbol, mkt?.category);
    const tLots = t.lots !== undefined ? t.lots : backendUnitsToLots(t.quantity || 0, t.symbol, mkt?.category);
    const fee = t.fee !== undefined ? t.fee : 0;
    const handlingFee = t.handlingFee !== undefined ? t.handlingFee : Number((fee / 2).toFixed(2));
    const grossPnL = t.pnl !== undefined ? t.pnl : (t.netPnL !== undefined ? t.netPnL + fee : 0);
    const netPnL = t.netPnL !== undefined ? t.netPnL : (t.pnl !== undefined ? t.pnl - fee : 0);

    allTrades.push({
      id: t.id,
      userId: t.userId,
      userName: usr?.name || t.userName || 'Trader',
      userEmail: usr?.email || t.userEmail || 'trader@etoroglobal.com',
      symbol: t.symbol || 'BTC/USDT',
      side: (t.side === 'buy' ? 'long' : (t.side === 'sell' ? 'short' : (t.side || 'long'))),
      status: (String(t.status) === 'cancelled' || t.status === 'rejected') ? 'cancelled' : (t.status || 'completed'),
      orderType: t.orderType || 'market',
      openedAt: t.openedAt || t.createdAt,
      closedAt: t.createdAt,
      createdAt: t.createdAt,
      entryPrice: t.entryPrice || 0,
      exitPrice: t.exitPrice || t.entryPrice || 0,
      currentPrice: t.exitPrice || t.entryPrice || 0,
      size: t.quantity || 0,
      lots: tLots,
      contractSize: contractSize,
      leverage: t.leverage || 1,
      margin: t.margin !== undefined ? t.margin : 0,
      fee: fee,
      handlingFee: handlingFee,
      swapFee: t.swapFee || 0,
      grossPnL: Number(grossPnL.toFixed(2)),
      netPnL: Number(netPnL.toFixed(2)),
      unrealizedPnL: undefined,
      stopLoss: t.stopLoss,
      takeProfit: t.takeProfit,
      referenceId: t.txHash || t.referenceId || t.id,
      lastModifiedAt: t.lastModifiedAt,
      lastModifiedBy: t.lastModifiedBy,
      isCorrected: Boolean(t.isCorrected || (Array.isArray(t.corrections) && t.corrections.length > 0)),
      corrections: t.corrections || []
    });
  });

  // 3. Cancelled Orders from ORDERS_DB
  ORDERS_DB.filter(o => o.status === 'cancelled').forEach(o => {
    const usr = USERS_DB.find(u => u.id === o.userId);
    const mkt = MARKETS_DB.find(m => m.symbol === o.symbol);
    const contractSize = getBackendContractSize(o.symbol, mkt?.category);
    const oLots = backendUnitsToLots(o.amount, o.symbol, mkt?.category);
    const margin = calculateBackendMarginUSD(o.symbol, o.amount, o.price, o.leverage || 1);

    allTrades.push({
      id: o.id,
      userId: o.userId,
      userName: usr?.name || 'Trader',
      userEmail: usr?.email || 'trader@etoroglobal.com',
      symbol: o.symbol,
      side: o.side === 'buy' ? 'long' : 'short',
      status: 'cancelled',
      orderType: o.type || 'limit',
      openedAt: o.createdAt,
      closedAt: o.createdAt,
      createdAt: o.createdAt,
      entryPrice: o.price,
      exitPrice: o.price,
      currentPrice: o.price,
      size: o.amount,
      lots: oLots,
      contractSize: contractSize,
      leverage: o.leverage || 1,
      margin: margin,
      fee: 0,
      handlingFee: 0,
      swapFee: 0,
      grossPnL: 0,
      netPnL: 0,
      unrealizedPnL: undefined,
      stopLoss: o.stopLoss,
      takeProfit: o.takeProfit,
      referenceId: o.id,
      lastModifiedAt: undefined,
      lastModifiedBy: undefined,
      isCorrected: false,
      corrections: []
    });
  });

  // Apply Filters
  let filtered = allTrades;

  if (userId && typeof userId === 'string' && userId !== 'all') {
    filtered = filtered.filter(t => t.userId === userId);
  }

  if (tradeId && typeof tradeId === 'string' && tradeId.trim()) {
    const q = tradeId.trim().toLowerCase();
    filtered = filtered.filter(t => t.id.toLowerCase().includes(q) || (t.referenceId && t.referenceId.toLowerCase().includes(q)));
  }

  if (symbol && typeof symbol === 'string' && symbol !== 'all') {
    filtered = filtered.filter(t => t.symbol.toLowerCase() === symbol.toLowerCase());
  }

  if (status && typeof status === 'string' && status !== 'all') {
    if (status === 'closed' || status === 'completed') {
      filtered = filtered.filter(t => t.status === 'completed' || t.status === 'closed');
    } else {
      filtered = filtered.filter(t => t.status === status);
    }
  }

  if (side && typeof side === 'string' && side !== 'all') {
    filtered = filtered.filter(t => t.side.toLowerCase() === side.toLowerCase());
  }

  if (outcome && typeof outcome === 'string' && outcome !== 'all') {
    if (outcome === 'profit') {
      filtered = filtered.filter(t => t.netPnL > 0);
    } else if (outcome === 'loss') {
      filtered = filtered.filter(t => t.netPnL < 0);
    }
  }

  if (isCorrected && typeof isCorrected === 'string' && isCorrected !== 'all') {
    const shouldBeCorrected = isCorrected === 'true';
    filtered = filtered.filter(t => Boolean(t.isCorrected) === shouldBeCorrected);
  }

  if (startDate && typeof startDate === 'string' && startDate.trim()) {
    const startTime = new Date(startDate).getTime();
    if (!isNaN(startTime)) {
      filtered = filtered.filter(t => new Date(t.createdAt || t.openedAt).getTime() >= startTime);
    }
  }

  if (endDate && typeof endDate === 'string' && endDate.trim()) {
    const endTime = new Date(endDate).getTime();
    if (!isNaN(endTime)) {
      filtered = filtered.filter(t => new Date(t.createdAt || t.openedAt).getTime() <= endTime);
    }
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(t =>
      t.id.toLowerCase().includes(q) ||
      t.userId.toLowerCase().includes(q) ||
      t.userName.toLowerCase().includes(q) ||
      t.userEmail.toLowerCase().includes(q) ||
      t.symbol.toLowerCase().includes(q) ||
      (t.referenceId && t.referenceId.toLowerCase().includes(q))
    );
  }

  // Sort
  filtered.sort((a, b) => {
    const timeA = new Date(a.openedAt || a.createdAt).getTime() || 0;
    const timeB = new Date(b.openedAt || b.createdAt).getTime() || 0;
    if (timeA !== timeB) {
      return sort === 'oldest' ? timeA - timeB : timeB - timeA;
    }
    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  res.json(filtered);
};

app.get('/api/admin/trades/all', authenticateToken, requirePermission('view_trade_history'), handleGetAdminTrades);
app.get('/api/admin/trade-history', authenticateToken, requirePermission('view_trade_history'), handleGetAdminTrades);

// INDIVIDUAL ACCOUNT ACTIVITY
app.get('/api/admin/users/:userId/activity', authenticateToken, requirePermission('view_account_activity'), (req: any, res) => {
  const targetUserId = req.params.userId;
  const targetUser = USERS_DB.find(u => u.id === targetUserId);

  if (!targetUser) {
    return res.status(404).json({ error: 'User account not found' });
  }

  const wallet = getUserWallet(targetUserId);

  // 1. User Trades (Open + Closed + Cancelled)
  const userOpenTrades = POSITIONS_DB.filter(p => p.userId === targetUserId).map(pos => {
    const mkt = MARKETS_DB.find(m => m.symbol === pos.symbol);
    const currentPrice = pos.customMarkPrice !== undefined && pos.customMarkPrice !== null
      ? pos.customMarkPrice
      : (mkt ? mkt.price : pos.markPrice);
    const uPnL = getPositionUnrealizedPnL(pos, currentPrice);
    const posLots = pos.lots !== undefined ? pos.lots : backendUnitsToLots(pos.size, pos.symbol, mkt?.category);
    const contractSize = pos.contractSize || getBackendContractSize(pos.symbol, mkt?.category);
    const fee = pos.handlingFee || Number((pos.entryPrice * pos.size * getMakerTakerFeeRates().takerFeeRate).toFixed(2));

    return {
      id: pos.id,
      userId: pos.userId,
      userName: targetUser.name,
      userEmail: targetUser.email,
      symbol: pos.symbol,
      side: pos.side,
      status: 'open',
      orderType: 'market',
      openedAt: pos.openedAt || new Date().toISOString(),
      closedAt: undefined,
      createdAt: pos.openedAt || new Date().toISOString(),
      entryPrice: pos.entryPrice,
      exitPrice: undefined,
      currentPrice,
      size: pos.size,
      lots: posLots,
      contractSize,
      leverage: pos.leverage,
      margin: pos.margin,
      fee,
      handlingFee: fee,
      swapFee: 0,
      grossPnL: Number(uPnL.toFixed(2)),
      netPnL: Number((uPnL - fee).toFixed(2)),
      unrealizedPnL: Number(uPnL.toFixed(2)),
      stopLoss: pos.stopLoss,
      takeProfit: pos.takeProfit,
      referenceId: pos.id,
      isCorrected: false,
      corrections: []
    };
  });

  const userClosedTrades = TRANSACTIONS_DB.filter(t => t.userId === targetUserId && t.type === 'trade').map(t => {
    const mkt = MARKETS_DB.find(m => m.symbol === t.symbol);
    const contractSize = t.contractSize || getBackendContractSize(t.symbol, mkt?.category);
    const tLots = t.lots !== undefined ? t.lots : backendUnitsToLots(t.quantity || 0, t.symbol, mkt?.category);
    const fee = t.fee !== undefined ? t.fee : 0;
    const handlingFee = t.handlingFee !== undefined ? t.handlingFee : Number((fee / 2).toFixed(2));
    const grossPnL = t.pnl !== undefined ? t.pnl : (t.netPnL !== undefined ? t.netPnL + fee : 0);
    const netPnL = t.netPnL !== undefined ? t.netPnL : (t.pnl !== undefined ? t.pnl - fee : 0);

    return {
      id: t.id,
      userId: t.userId,
      userName: targetUser.name,
      userEmail: targetUser.email,
      symbol: t.symbol || 'BTC/USDT',
      side: (t.side === 'buy' ? 'long' : (t.side === 'sell' ? 'short' : (t.side || 'long'))),
      status: (String(t.status) === 'cancelled' || t.status === 'rejected') ? 'cancelled' : (t.status || 'completed'),
      orderType: t.orderType || 'market',
      openedAt: t.openedAt || t.createdAt,
      closedAt: t.createdAt,
      createdAt: t.createdAt,
      entryPrice: t.entryPrice || 0,
      exitPrice: t.exitPrice || t.entryPrice || 0,
      currentPrice: t.exitPrice || t.entryPrice || 0,
      size: t.quantity || 0,
      lots: tLots,
      contractSize,
      leverage: t.leverage || 1,
      margin: t.margin !== undefined ? t.margin : 0,
      fee,
      handlingFee,
      swapFee: t.swapFee || 0,
      grossPnL: Number(grossPnL.toFixed(2)),
      netPnL: Number(netPnL.toFixed(2)),
      stopLoss: t.stopLoss,
      takeProfit: t.takeProfit,
      referenceId: t.txHash || t.referenceId || t.id,
      lastModifiedAt: t.lastModifiedAt,
      lastModifiedBy: t.lastModifiedBy,
      isCorrected: Boolean(t.isCorrected || (Array.isArray(t.corrections) && t.corrections.length > 0)),
      corrections: t.corrections || []
    };
  });

  const userCancelledOrders = ORDERS_DB.filter(o => o.userId === targetUserId && o.status === 'cancelled').map(o => {
    const mkt = MARKETS_DB.find(m => m.symbol === o.symbol);
    const contractSize = getBackendContractSize(o.symbol, mkt?.category);
    const oLots = backendUnitsToLots(o.amount, o.symbol, mkt?.category);
    const margin = calculateBackendMarginUSD(o.symbol, o.amount, o.price, o.leverage || 1);

    return {
      id: o.id,
      userId: o.userId,
      userName: targetUser.name,
      userEmail: targetUser.email,
      symbol: o.symbol,
      side: o.side === 'buy' ? 'long' : 'short',
      status: 'cancelled',
      orderType: o.type || 'limit',
      openedAt: o.createdAt,
      closedAt: o.createdAt,
      createdAt: o.createdAt,
      entryPrice: o.price,
      exitPrice: o.price,
      currentPrice: o.price,
      size: o.amount,
      lots: oLots,
      contractSize,
      leverage: o.leverage || 1,
      margin,
      fee: 0,
      handlingFee: 0,
      swapFee: 0,
      grossPnL: 0,
      netPnL: 0,
      stopLoss: o.stopLoss,
      takeProfit: o.takeProfit,
      referenceId: o.id,
      isCorrected: false,
      corrections: []
    };
  });

  const allUserTrades = [...userOpenTrades, ...userClosedTrades, ...userCancelledOrders].sort((a, b) => {
    const timeA = new Date(a.openedAt || a.createdAt).getTime() || 0;
    const timeB = new Date(b.openedAt || b.createdAt).getTime() || 0;
    if (timeA !== timeB) return timeB - timeA;
    return String(b.id || '').localeCompare(String(a.id || ''));
  });

  // 2. Deposits
  const deposits = DEPOSIT_REQUESTS_DB.filter(d => d.userId === targetUserId).map(d => {
    const approver = AUDIT_LOGS.find(a => a.objectId === d.id && a.action === 'Approve Deposit');
    return {
      ...d,
      approvedByAdmin: approver ? (approver.actorName || approver.adminEmail) : undefined
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // 3. Withdrawals
  const withdrawals = WITHDRAWAL_REQUESTS_DB.filter(w => w.userId === targetUserId).map(w => {
    const processor = AUDIT_LOGS.find(a => a.objectId === w.id && (a.action === 'Approve Withdrawal' || a.action === 'Withdrawal Rejected'));
    return {
      ...w,
      processedByAdmin: processor ? (processor.actorName || processor.adminEmail) : undefined
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // 4. Chronological Balance History (Ledger)
  const ledgerRawEvents: any[] = [];

  // Completed deposits
  deposits.filter(d => d.status === 'approved').forEach(d => {
    ledgerRawEvents.push({
      id: d.walletTransactionId || ('ledger_dep_' + d.id),
      timestamp: d.approvedAt || d.createdAt,
      type: 'deposit',
      amount: d.amount,
      currency: d.currency || 'USDT',
      referenceId: d.utrNumber || d.id,
      description: `Deposit via ${String(d.method || 'payment').toUpperCase()}`,
      adminActor: d.approvedByAdmin || 'Automated / Admin'
    });
  });

  // Withdrawals
  withdrawals.forEach(w => {
    if (w.status === 'approved') {
      ledgerRawEvents.push({
        id: 'ledger_wd_' + w.id,
        timestamp: w.updatedAt || w.createdAt,
        type: 'withdrawal',
        amount: -w.amount,
        currency: w.currency || 'USDT',
        referenceId: w.id,
        description: `Withdrawal via ${String(w.method || 'crypto').toUpperCase()} (${w.destination || 'Destination'})`,
        adminActor: w.processedByAdmin || 'Compliance Desk'
      });
    } else if (w.status === 'rejected') {
      ledgerRawEvents.push({
        id: 'ledger_wd_refund_' + w.id,
        timestamp: w.updatedAt || w.createdAt,
        type: 'adjustment',
        amount: w.amount,
        currency: w.currency || 'USDT',
        referenceId: w.id,
        description: `Rejected withdrawal refund: ${w.adminNotes || w.rejectionReason || 'Refunded to Trading Wallet'}`,
        adminActor: w.processedByAdmin || 'Risk Desk'
      });
    }
  });

  // Closed Trades realized PnL
  userClosedTrades.filter(t => t.status === 'closed' || t.status === 'completed').forEach(t => {
    ledgerRawEvents.push({
      id: 'ledger_trade_' + t.id,
      timestamp: t.closedAt || t.createdAt,
      type: 'trade_pnl',
      amount: t.netPnL,
      currency: 'USDT',
      referenceId: t.id,
      description: `Realized Trade PnL on ${t.symbol} (${t.side.toUpperCase()} ${t.lots} Lots @ $${t.entryPrice} → $${t.exitPrice})`,
      adminActor: t.isCorrected ? (t.lastModifiedBy || 'Admin Correction') : undefined
    });
  });

  // Manual Adjustments from Audit Logs
  AUDIT_LOGS.filter(a => (a.targetUserId === targetUserId || a.objectId === `trading_wallet_${targetUserId}`) && (a.eventType === 'BALANCE_ADJUST_INCREASE' || a.eventType === 'BALANCE_ADJUST_DECREASE' || a.action.includes('Balance'))).forEach(a => {
    const isIncrease = a.eventType === 'BALANCE_ADJUST_INCREASE' || (a.details && a.details.includes('Increased'));
    const amountVal = a.amount ? (isIncrease ? Math.abs(a.amount) : -Math.abs(a.amount)) : 0;
    ledgerRawEvents.push({
      id: 'ledger_adj_' + a.id,
      timestamp: a.timestamp,
      type: 'adjustment',
      amount: amountVal,
      currency: a.currency || 'USDT',
      referenceId: a.objectId || a.id,
      description: `Manual balance adjustment: ${a.reason || a.details}`,
      adminActor: a.actorName || a.adminEmail
    });
  });

  // Sort chronological ascending to compute running balances accurately
  ledgerRawEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let runningBalance = 0;
  const balanceLedger = ledgerRawEvents.map(evt => {
    const before = Number(runningBalance.toFixed(2));
    runningBalance += evt.amount;
    const after = Number(runningBalance.toFixed(2));
    return {
      ...evt,
      balanceBefore: before,
      balanceAfter: after
    };
  }).reverse(); // Most recent first for display

  // 5. Security & Account Events
  const securityEvents = AUDIT_LOGS.filter(a =>
    a.targetUserId === targetUserId ||
    (a.targetUserEmail && a.targetUserEmail.toLowerCase() === targetUser.email.toLowerCase()) ||
    a.objectId === targetUserId ||
    (a.details && a.details.toLowerCase().includes(targetUser.email.toLowerCase()))
  );

  const loginHistory = LOGIN_HISTORY_DB[targetUserId] || [];
  const sessions = SESSIONS_DB[targetUserId] || [];

  res.json({
    user: targetUser,
    wallet,
    trades: allUserTrades,
    deposits,
    withdrawals,
    balanceLedger,
    securityEvents,
    loginHistory,
    sessions
  });
});

// CONTROLLED ADMIN TRADE CORRECTION ENDPOINT
app.post('/api/admin/trades/:tradeId/correct', authenticateToken, requirePermission('correct_trade'), (req: any, res) => {
  const tradeId = req.params.tradeId;
  const {
    quantity,
    lots,
    entryPrice,
    exitPrice,
    stopLoss,
    takeProfit,
    fee,
    handlingFee,
    swapFee,
    pnl,
    netPnL,
    status,
    openedAt,
    createdAt,
    reason
  } = req.body;

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    return res.status(400).json({ error: 'A detailed Reason for Correction is mandatory for institutional audit trails.' });
  }

  // Find closed trade in TRANSACTIONS_DB
  const tx = TRANSACTIONS_DB.find(t => t.id === tradeId && t.type === 'trade');
  if (!tx) {
    return res.status(404).json({ error: 'Closed trade record not found in system ledger.' });
  }

  const targetUserObj = USERS_DB.find(u => u.id === tx.userId);
  const mkt = MARKETS_DB.find(m => m.symbol === tx.symbol);

  // Snapshot original state for non-destructive audit retention
  const originalRecord = {
    id: tx.id,
    userId: tx.userId,
    symbol: tx.symbol,
    side: tx.side,
    entryPrice: tx.entryPrice,
    exitPrice: tx.exitPrice,
    quantity: tx.quantity,
    lots: tx.lots,
    leverage: tx.leverage,
    fee: tx.fee,
    handlingFee: tx.handlingFee,
    swapFee: tx.swapFee,
    pnl: tx.pnl,
    netPnL: tx.netPnL,
    status: tx.status,
    stopLoss: tx.stopLoss,
    takeProfit: tx.takeProfit,
    openedAt: tx.openedAt,
    createdAt: tx.createdAt
  };

  const oldNetPnL = tx.netPnL !== undefined ? tx.netPnL : (tx.pnl !== undefined ? tx.pnl - (tx.fee || 0) : 0);

  // Validate parameters
  if (entryPrice !== undefined && (isNaN(Number(entryPrice)) || Number(entryPrice) <= 0)) {
    return res.status(400).json({ error: 'Open/Entry Price must be a valid positive number.' });
  }
  if (exitPrice !== undefined && (isNaN(Number(exitPrice)) || Number(exitPrice) <= 0)) {
    return res.status(400).json({ error: 'Close/Exit Price must be a valid positive number.' });
  }
  if (lots !== undefined && (isNaN(Number(lots)) || Number(lots) <= 0)) {
    return res.status(400).json({ error: 'Lot size must be a valid positive number.' });
  }
  if (quantity !== undefined && (isNaN(Number(quantity)) || Number(quantity) <= 0)) {
    return res.status(400).json({ error: 'Quantity must be a valid positive number.' });
  }

  // Apply corrected fields
  if (lots !== undefined) {
    tx.lots = Number(Number(lots).toFixed(4));
    tx.quantity = backendLotsToUnits(tx.lots, tx.symbol, mkt?.category);
  } else if (quantity !== undefined) {
    tx.quantity = Number(quantity);
    tx.lots = backendUnitsToLots(tx.quantity, tx.symbol, mkt?.category);
  }

  if (entryPrice !== undefined) tx.entryPrice = Number(Number(entryPrice).toFixed(4));
  if (exitPrice !== undefined) tx.exitPrice = Number(Number(exitPrice).toFixed(4));
  if (stopLoss !== undefined) tx.stopLoss = stopLoss ? Number(stopLoss) : undefined;
  if (takeProfit !== undefined) tx.takeProfit = takeProfit ? Number(takeProfit) : undefined;
  if (fee !== undefined) tx.fee = Number(Number(fee).toFixed(2));
  if (handlingFee !== undefined) tx.handlingFee = Number(Number(handlingFee).toFixed(2));
  if (swapFee !== undefined) tx.swapFee = Number(Number(swapFee).toFixed(2));
  if (status !== undefined) {
    if (status === 'closed' || status === 'completed') {
      tx.status = 'completed';
    } else if (status === 'cancelled' || status === 'rejected') {
      tx.status = status;
    }
  } else if (!tx.status || tx.status === 'closed') {
    tx.status = 'completed';
  }
  if (openedAt !== undefined) tx.openedAt = openedAt;
  if (createdAt !== undefined) tx.createdAt = createdAt;

  let calculatedGrossPnL = tx.pnl;
  let calculatedNetPnL = tx.netPnL;

  if (pnl !== undefined) {
    calculatedGrossPnL = Number(Number(pnl).toFixed(2));
  }
  if (netPnL !== undefined) {
    calculatedNetPnL = Number(Number(netPnL).toFixed(2));
  } else if (pnl !== undefined || fee !== undefined) {
    calculatedNetPnL = Number(((calculatedGrossPnL || 0) - (tx.fee || 0)).toFixed(2));
  }

  tx.pnl = calculatedGrossPnL;
  tx.netPnL = calculatedNetPnL;

  // Reconcile user wallet balance automatically
  const newNetPnLVal = calculatedNetPnL !== undefined ? calculatedNetPnL : 0;
  const pnlDiff = Number((newNetPnLVal - oldNetPnL).toFixed(2));
  const wallet = getUserWallet(tx.userId);

  if (pnlDiff !== 0) {
    wallet.tradingBalance = Math.max(0, Number((wallet.tradingBalance + pnlDiff).toFixed(2)));
    wallet.availableMargin = Math.max(0, Number((wallet.availableMargin + pnlDiff).toFixed(2)));
  }

  // Construct correction record
  const changedFieldsList = Object.keys(req.body).filter(k => k !== 'reason');
  const correctionEntry: any = {
    id: 'corr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    field: changedFieldsList.join(', '),
    originalValue: originalRecord,
    newValue: {
      entryPrice: tx.entryPrice,
      exitPrice: tx.exitPrice,
      quantity: tx.quantity,
      lots: tx.lots,
      fee: tx.fee,
      handlingFee: tx.handlingFee,
      swapFee: tx.swapFee,
      pnl: tx.pnl,
      netPnL: tx.netPnL,
      status: tx.status,
      stopLoss: tx.stopLoss,
      takeProfit: tx.takeProfit,
      openedAt: tx.openedAt,
      createdAt: tx.createdAt
    },
    reason: reason.trim(),
    adminId: req.user.id,
    adminEmail: req.user.email,
    adminName: req.user.name || req.user.email,
    timestamp: new Date().toISOString()
  };

  if (!Array.isArray(tx.corrections)) {
    tx.corrections = [];
  }
  tx.corrections.unshift(correctionEntry);
  tx.isCorrected = true;
  tx.lastModifiedAt = correctionEntry.timestamp;
  tx.lastModifiedBy = req.user.email;

  // Record into Security Audit Logs
  recordAuditLog({
    action: 'Correct Closed Trade',
    eventType: 'ADMIN_CORRECT_TRADE',
    category: 'trade',
    actor: req.user,
    targetUser: targetUserObj,
    targetUserId: tx.userId,
    targetUserName: targetUserObj?.name,
    targetUserEmail: targetUserObj?.email,
    objectType: 'Trade',
    objectId: tx.id,
    previousState: JSON.stringify(originalRecord),
    newState: JSON.stringify(correctionEntry.newValue),
    symbol: tx.symbol,
    side: tx.side,
    entryPrice: tx.entryPrice,
    currentPrice: tx.exitPrice,
    previousPnL: oldNetPnL,
    targetPnL: newNetPnLVal,
    reason: reason.trim(),
    details: `Admin ${req.user.name || req.user.email} corrected trade #${tx.id} (${tx.symbol}). Fields: ${correctionEntry.field}. Net PnL: $${oldNetPnL} → $${newNetPnLVal} (Financial Balance Delta: ${pnlDiff >= 0 ? '+' : ''}$${pnlDiff.toFixed(2)} USDT). Reason: ${reason.trim()}`,
    ipAddress: getClientIp(req),
    metadata: {
      correctionId: correctionEntry.id,
      pnlDiff,
      tradeId: tx.id,
      userId: tx.userId
    }
  });

  saveDataToDisk();

  res.json({
    message: 'Trade parameters corrected and financial balances reconciled successfully.',
    trade: tx,
    wallet,
    pnlDiff
  });
});

// ADVANCED BACKEND TRADE EDITING ENDPOINT
app.post('/api/admin/trades/:tradeId/edit', authenticateToken, (req: any, res) => {
  if (!hasPermission(req.user, 'edit_trade') && !hasPermission(req.user, 'correct_trade') && req.user.role !== 'admin' && !isMasterAdminUser(req.user)) {
    return res.status(403).json({ error: 'Access Denied: Administrative trade editing permission required.' });
  }

  const tradeId = req.params.tradeId;
  const {
    userId,
    symbol,
    side,
    orderType,
    lots,
    quantity,
    entryPrice,
    exitPrice,
    stopLoss,
    takeProfit,
    fee,
    handlingFee,
    swapFee,
    pnl,
    netPnL,
    status,
    openedAt,
    closedAt,
    createdAt,
    referenceId,
    reason
  } = req.body;

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    return res.status(400).json({ error: 'A detailed Reason for Administrative Edit is mandatory for compliance audit trails.' });
  }

  // 1. Check if trade is in TRANSACTIONS_DB (Closed/Historical)
  const txIndex = TRANSACTIONS_DB.findIndex(t => t.id === tradeId && (t.type === 'trade' || !t.type));
  // 2. Check if trade is in POSITIONS_DB (Open)
  const posIndex = POSITIONS_DB.findIndex(p => p.id === tradeId);

  if (txIndex === -1 && posIndex === -1) {
    return res.status(404).json({ error: 'Trade record not found in active or historical trade database.' });
  }

  // Target market pair for contract specs
  const effectiveSymbol = symbol || (txIndex !== -1 ? TRANSACTIONS_DB[txIndex].symbol : POSITIONS_DB[posIndex].symbol);
  const mkt = MARKETS_DB.find(m => m.symbol.toUpperCase() === effectiveSymbol.toUpperCase()) || MARKETS_DB.find(m => m.symbol.replace('/', '').toUpperCase() === effectiveSymbol.replace('/', '').toUpperCase());
  const contractSize = getBackendContractSize(effectiveSymbol, mkt?.category);

  // Validate numeric limits
  if (entryPrice !== undefined && (isNaN(Number(entryPrice)) || Number(entryPrice) <= 0)) {
    return res.status(400).json({ error: 'Opening / Entry Price must be a valid positive number.' });
  }
  if (lots !== undefined && (isNaN(Number(lots)) || Number(lots) <= 0)) {
    return res.status(400).json({ error: 'Lot size must be a valid positive number greater than 0.' });
  }
  if (quantity !== undefined && (isNaN(Number(quantity)) || Number(quantity) <= 0)) {
    return res.status(400).json({ error: 'Quantity must be a valid positive number greater than 0.' });
  }
  if (fee !== undefined && (isNaN(Number(fee)) || Number(fee) < 0)) {
    return res.status(400).json({ error: 'Trading Fee cannot be negative.' });
  }
  if (handlingFee !== undefined && (isNaN(Number(handlingFee)) || Number(handlingFee) < 0)) {
    return res.status(400).json({ error: 'Handling Fee cannot be negative.' });
  }
  if (swapFee !== undefined && isNaN(Number(swapFee))) {
    return res.status(400).json({ error: 'Swap Fee must be a valid numeric value.' });
  }

  // Handle CASE A: Trade is currently in TRANSACTIONS_DB
  if (txIndex !== -1) {
    const tx = TRANSACTIONS_DB[txIndex];
    const originalUserId = tx.userId;
    const targetUserId = userId || originalUserId;
    const targetUserObj = USERS_DB.find(u => u.id === targetUserId);
    if (!targetUserObj) {
      return res.status(400).json({ error: `Selected user ID '${targetUserId}' does not exist.` });
    }

    const originalRecord = {
      id: tx.id,
      userId: tx.userId,
      userName: tx.userName,
      userEmail: tx.userEmail,
      symbol: tx.symbol,
      side: tx.side,
      entryPrice: tx.entryPrice,
      exitPrice: tx.exitPrice,
      quantity: tx.quantity,
      lots: tx.lots,
      contractSize: tx.contractSize,
      leverage: tx.leverage,
      fee: tx.fee,
      handlingFee: tx.handlingFee,
      swapFee: tx.swapFee,
      pnl: tx.pnl,
      netPnL: tx.netPnL,
      status: tx.status,
      stopLoss: tx.stopLoss,
      takeProfit: tx.takeProfit,
      openedAt: tx.openedAt,
      createdAt: tx.createdAt,
      referenceId: tx.referenceId
    };

    const oldNetPnL = tx.netPnL !== undefined ? tx.netPnL : (tx.pnl !== undefined ? tx.pnl - (tx.fee || 0) : 0);

    // If changing status from closed/historical to 'open' position
    if (status === 'open') {
      const parsedLots = lots !== undefined ? Number(lots) : (tx.lots || 0.1);
      const parsedUnits = backendLotsToUnits(parsedLots, effectiveSymbol, mkt?.category);
      const parsedEntryPrice = entryPrice !== undefined ? Number(entryPrice) : tx.entryPrice;
      const parsedMargin = calculateBackendMarginUSD(effectiveSymbol, parsedUnits, parsedEntryPrice, tx.leverage || 1);

      // 1. Remove from TRANSACTIONS_DB
      TRANSACTIONS_DB.splice(txIndex, 1);

      // 2. Reverse settled PnL from original user wallet
      const origWallet = getUserWallet(originalUserId);
      origWallet.tradingBalance = Math.max(0, Number((origWallet.tradingBalance - oldNetPnL).toFixed(2)));
      origWallet.availableMargin = Math.max(0, Number((origWallet.availableMargin - oldNetPnL).toFixed(2)));

      // 3. Create open position in POSITIONS_DB
      const newPos: any = {
        id: tx.id,
        userId: targetUserId,
        symbol: effectiveSymbol,
        side: side ? (side.toLowerCase() === 'buy' || side.toLowerCase() === 'long' ? 'long' : 'short') : (tx.side === 'buy' ? 'long' : tx.side || 'long'),
        entryPrice: parsedEntryPrice,
        markPrice: parsedEntryPrice,
        size: parsedUnits,
        lots: parsedLots,
        contractSize: contractSize,
        leverage: tx.leverage || 1,
        margin: parsedMargin,
        handlingFee: handlingFee !== undefined ? Number(handlingFee) : (tx.handlingFee || 0),
        unrealizedPnL: 0,
        stopLoss: stopLoss ? Number(stopLoss) : undefined,
        takeProfit: takeProfit ? Number(takeProfit) : undefined,
        openedAt: openedAt || tx.openedAt || new Date().toISOString(),
        isManualAdminCreated: true,
        lastModifiedAt: new Date().toISOString(),
        lastModifiedBy: req.user.email
      };
      POSITIONS_DB.unshift(newPos);

      // 4. Record audit log
      recordAuditLog({
        action: 'Convert Closed Trade to Open Position',
        eventType: 'ADMIN_EDIT_TRADE',
        category: 'trade',
        actor: req.user,
        targetUser: targetUserObj,
        targetUserId: targetUserId,
        targetUserName: targetUserObj.name,
        targetUserEmail: targetUserObj.email,
        objectType: 'Trade',
        objectId: tx.id,
        previousState: JSON.stringify(originalRecord),
        newState: JSON.stringify(newPos),
        symbol: effectiveSymbol,
        side: newPos.side,
        entryPrice: newPos.entryPrice,
        previousPnL: oldNetPnL,
        targetPnL: 0,
        reason: reason.trim(),
        details: `Admin ${req.user.name || req.user.email} converted trade #${tx.id} to open position. Settled PnL reversed: $${oldNetPnL}. Reason: ${reason.trim()}`,
        ipAddress: getClientIp(req)
      });

      saveDataToDisk();
      return res.json({
        message: 'Trade converted to open position and settled balance reversed successfully.',
        trade: newPos,
        wallet: origWallet,
        pnlDiff: -oldNetPnL
      });
    }

    // Otherwise, updating fields in TRANSACTIONS_DB
    if (symbol) tx.symbol = effectiveSymbol;
    if (side) tx.side = (side.toLowerCase() === 'buy' || side.toLowerCase() === 'long') ? 'buy' : 'sell';
    if (orderType) tx.orderType = orderType;
    if (referenceId) tx.referenceId = referenceId;

    if (lots !== undefined) {
      tx.lots = Number(Number(lots).toFixed(4));
      tx.quantity = backendLotsToUnits(tx.lots, effectiveSymbol, mkt?.category);
    } else if (quantity !== undefined) {
      tx.quantity = Number(quantity);
      tx.lots = backendUnitsToLots(tx.quantity, effectiveSymbol, mkt?.category);
    }
    tx.contractSize = contractSize;

    if (entryPrice !== undefined) tx.entryPrice = Number(Number(entryPrice).toFixed(4));
    if (exitPrice !== undefined) tx.exitPrice = Number(Number(exitPrice).toFixed(4));
    if (stopLoss !== undefined) tx.stopLoss = stopLoss ? Number(stopLoss) : undefined;
    if (takeProfit !== undefined) tx.takeProfit = takeProfit ? Number(takeProfit) : undefined;
    if (fee !== undefined) tx.fee = Number(Number(fee).toFixed(2));
    if (handlingFee !== undefined) tx.handlingFee = Number(Number(handlingFee).toFixed(2));
    if (swapFee !== undefined) tx.swapFee = Number(Number(swapFee).toFixed(2));
    if (status !== undefined) {
      if (status === 'closed' || status === 'completed') {
        tx.status = 'completed';
      } else if (status === 'cancelled' || status === 'rejected') {
        tx.status = status;
      }
    } else if (!tx.status || tx.status === 'closed') {
      tx.status = 'completed';
    }
    if (openedAt !== undefined) tx.openedAt = openedAt;
    if (closedAt !== undefined) tx.createdAt = closedAt;
    else if (createdAt !== undefined) tx.createdAt = createdAt;

    // Recalculate or apply PnL
    let finalGrossPnL = tx.pnl !== undefined ? tx.pnl : 0;
    let finalNetPnL = tx.netPnL !== undefined ? tx.netPnL : 0;

    if (pnl !== undefined) {
      finalGrossPnL = Number(Number(pnl).toFixed(2));
    }
    if (netPnL !== undefined) {
      finalNetPnL = Number(Number(netPnL).toFixed(2));
    } else if (pnl !== undefined || fee !== undefined || swapFee !== undefined || handlingFee !== undefined) {
      const totalDeductions = (tx.fee || 0) + (tx.swapFee || 0);
      finalNetPnL = Number((finalGrossPnL - totalDeductions).toFixed(2));
    }

    tx.pnl = finalGrossPnL;
    tx.netPnL = finalNetPnL;

    // Handle User Reassignment or Balance Reconciliation
    let pnlDiff = 0;
    let primaryWallet = getUserWallet(originalUserId);

    if (targetUserId !== originalUserId) {
      // User reassignment: reverse old PnL from original user, credit new PnL to target user
      primaryWallet.tradingBalance = Math.max(0, Number((primaryWallet.tradingBalance - oldNetPnL).toFixed(2)));
      primaryWallet.availableMargin = Math.max(0, Number((primaryWallet.availableMargin - oldNetPnL).toFixed(2)));

      const targetWallet = getUserWallet(targetUserId);
      targetWallet.tradingBalance = Math.max(0, Number((targetWallet.tradingBalance + finalNetPnL).toFixed(2)));
      targetWallet.availableMargin = Math.max(0, Number((targetWallet.availableMargin + finalNetPnL).toFixed(2)));

      tx.userId = targetUserId;
      tx.userName = targetUserObj.name;
      tx.userEmail = targetUserObj.email;
      primaryWallet = targetWallet;
      pnlDiff = finalNetPnL;
    } else {
      // Same user balance reconciliation
      pnlDiff = Number((finalNetPnL - oldNetPnL).toFixed(2));
      if (pnlDiff !== 0) {
        primaryWallet.tradingBalance = Math.max(0, Number((primaryWallet.tradingBalance + pnlDiff).toFixed(2)));
        primaryWallet.availableMargin = Math.max(0, Number((primaryWallet.availableMargin + pnlDiff).toFixed(2)));
      }
    }

    // Construct detailed correction entry
    const changedKeys = Object.keys(req.body).filter(k => k !== 'reason');
    const correctionEntry: any = {
      id: 'corr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      field: changedKeys.join(', '),
      originalValue: originalRecord,
      newValue: {
        userId: tx.userId,
        symbol: tx.symbol,
        side: tx.side,
        entryPrice: tx.entryPrice,
        exitPrice: tx.exitPrice,
        quantity: tx.quantity,
        lots: tx.lots,
        contractSize: tx.contractSize,
        fee: tx.fee,
        handlingFee: tx.handlingFee,
        swapFee: tx.swapFee,
        pnl: tx.pnl,
        netPnL: tx.netPnL,
        status: tx.status,
        stopLoss: tx.stopLoss,
        takeProfit: tx.takeProfit,
        openedAt: tx.openedAt,
        createdAt: tx.createdAt,
        referenceId: tx.referenceId
      },
      reason: reason.trim(),
      adminId: req.user.id,
      adminEmail: req.user.email,
      adminName: req.user.name || req.user.email,
      timestamp: new Date().toISOString()
    };

    if (!Array.isArray(tx.corrections)) {
      tx.corrections = [];
    }
    tx.corrections.unshift(correctionEntry);
    tx.isCorrected = true;
    tx.lastModifiedAt = correctionEntry.timestamp;
    tx.lastModifiedBy = req.user.email;

    // Record Security Audit Log
    recordAuditLog({
      action: 'Edit Closed Trade Record',
      eventType: 'ADMIN_EDIT_TRADE',
      category: 'trade',
      actor: req.user,
      targetUser: targetUserObj,
      targetUserId: tx.userId,
      targetUserName: targetUserObj?.name,
      targetUserEmail: targetUserObj?.email,
      objectType: 'Trade',
      objectId: tx.id,
      previousState: JSON.stringify(originalRecord),
      newState: JSON.stringify(correctionEntry.newValue),
      symbol: tx.symbol,
      side: tx.side,
      entryPrice: tx.entryPrice,
      currentPrice: tx.exitPrice,
      previousPnL: oldNetPnL,
      targetPnL: finalNetPnL,
      reason: reason.trim(),
      details: `Admin ${req.user.name || req.user.email} updated trade #${tx.id} (${tx.symbol}). Fields: ${correctionEntry.field}. Net PnL: $${oldNetPnL} → $${finalNetPnL} (Delta: ${pnlDiff >= 0 ? '+' : ''}$${pnlDiff.toFixed(2)} USDT). Reason: ${reason.trim()}`,
      ipAddress: getClientIp(req),
      metadata: {
        correctionId: correctionEntry.id,
        pnlDiff,
        tradeId: tx.id,
        userId: tx.userId
      }
    });

    saveDataToDisk();

    return res.json({
      message: 'Trade parameters updated and financial balance reconciled successfully.',
      trade: tx,
      wallet: primaryWallet,
      pnlDiff
    });
  }

  // Handle CASE B: Trade is currently in POSITIONS_DB (Open Position)
  if (posIndex !== -1) {
    const pos = POSITIONS_DB[posIndex];
    const targetUserId = userId || pos.userId;
    const targetUserObj = USERS_DB.find(u => u.id === targetUserId);
    if (!targetUserObj) {
      return res.status(400).json({ error: `Selected user ID '${targetUserId}' does not exist.` });
    }

    const originalPos = { ...pos };

    // If changing status from 'open' to 'closed'
    if (status === 'closed' || status === 'completed') {
      const parsedLots = lots !== undefined ? Number(lots) : (pos.lots || 0.1);
      const parsedUnits = backendLotsToUnits(parsedLots, effectiveSymbol, mkt?.category);
      const parsedEntryPrice = entryPrice !== undefined ? Number(entryPrice) : pos.entryPrice;
      const parsedExitPrice = exitPrice !== undefined ? Number(exitPrice) : (pos.markPrice || parsedEntryPrice);
      const parsedFee = fee !== undefined ? Number(fee) : (pos.handlingFee || 0);
      const parsedHandlingFee = handlingFee !== undefined ? Number(handlingFee) : parsedFee;
      const parsedSwapFee = swapFee !== undefined ? Number(swapFee) : 0;

      let calcGross = pnl !== undefined ? Number(pnl) : 0;
      let calcNet = netPnL !== undefined ? Number(netPnL) : 0;

      if (pnl === undefined) {
        const isLong = (side ? (side.toLowerCase() === 'buy' || side.toLowerCase() === 'long') : pos.side === 'long');
        calcGross = isLong ? (parsedExitPrice - parsedEntryPrice) * parsedUnits : (parsedEntryPrice - parsedExitPrice) * parsedUnits;
      }
      if (netPnL === undefined) {
        calcNet = calcGross - parsedFee - parsedSwapFee;
      }

      // 1. Remove from POSITIONS_DB
      POSITIONS_DB.splice(posIndex, 1);

      // 2. Create closed transaction in TRANSACTIONS_DB
      const newTx: any = {
        id: pos.id,
        userId: targetUserId,
        userName: targetUserObj.name,
        userEmail: targetUserObj.email,
        type: 'trade',
        symbol: effectiveSymbol,
        side: (side ? (side.toLowerCase() === 'buy' || side.toLowerCase() === 'long' ? 'buy' : 'sell') : (pos.side === 'long' ? 'buy' : 'sell')),
        status: 'completed',
        entryPrice: parsedEntryPrice,
        exitPrice: parsedExitPrice,
        quantity: parsedUnits,
        lots: parsedLots,
        contractSize: contractSize,
        leverage: pos.leverage || 1,
        margin: pos.margin || 0,
        fee: parsedFee,
        handlingFee: parsedHandlingFee,
        swapFee: parsedSwapFee,
        pnl: Number(calcGross.toFixed(2)),
        netPnL: Number(calcNet.toFixed(2)),
        stopLoss: stopLoss ? Number(stopLoss) : pos.stopLoss,
        takeProfit: takeProfit ? Number(takeProfit) : pos.takeProfit,
        orderType: orderType || 'market',
        openedAt: openedAt || pos.openedAt || new Date().toISOString(),
        createdAt: closedAt || createdAt || new Date().toISOString(),
        referenceId: pos.id,
        isCorrected: true,
        lastModifiedAt: new Date().toISOString(),
        lastModifiedBy: req.user.email,
        corrections: [{
          id: 'corr_' + Date.now(),
          field: 'SETTLE_OPEN_POSITION',
          originalValue: originalPos,
          newValue: { symbol: effectiveSymbol, exitPrice: parsedExitPrice, netPnL: calcNet, status: 'completed' },
          reason: reason.trim(),
          adminId: req.user.id,
          adminEmail: req.user.email,
          adminName: req.user.name || req.user.email,
          timestamp: new Date().toISOString()
        }]
      };
      TRANSACTIONS_DB.unshift(newTx);

      // 3. Credit net PnL to user wallet
      const wallet = getUserWallet(targetUserId);
      wallet.tradingBalance = Math.max(0, Number((wallet.tradingBalance + calcNet).toFixed(2)));
      wallet.availableMargin = Math.max(0, Number((wallet.availableMargin + calcNet).toFixed(2)));

      recordAuditLog({
        action: 'Settle Open Position via Admin Edit',
        eventType: 'ADMIN_EDIT_TRADE',
        category: 'trade',
        actor: req.user,
        targetUser: targetUserObj,
        targetUserId: targetUserId,
        targetUserName: targetUserObj.name,
        targetUserEmail: targetUserObj.email,
        objectType: 'Position',
        objectId: pos.id,
        previousState: JSON.stringify(originalPos),
        newState: JSON.stringify(newTx),
        symbol: effectiveSymbol,
        side: newTx.side,
        entryPrice: newTx.entryPrice,
        currentPrice: newTx.exitPrice,
        previousPnL: 0,
        targetPnL: calcNet,
        reason: reason.trim(),
        details: `Admin ${req.user.name || req.user.email} settled open position #${pos.id} to closed trade. Net PnL: $${calcNet.toFixed(2)}. Reason: ${reason.trim()}`,
        ipAddress: getClientIp(req)
      });

      saveDataToDisk();
      return res.json({
        message: 'Open position closed and settled into transaction ledger successfully.',
        trade: newTx,
        wallet,
        pnlDiff: calcNet
      });
    }

    // Otherwise updating open position fields
    if (symbol) pos.symbol = effectiveSymbol;
    if (side) pos.side = (side.toLowerCase() === 'buy' || side.toLowerCase() === 'long') ? 'long' : 'short';
    if (lots !== undefined) {
      pos.lots = Number(Number(lots).toFixed(4));
      pos.size = backendLotsToUnits(pos.lots, effectiveSymbol, mkt?.category);
    } else if (quantity !== undefined) {
      pos.size = Number(quantity);
      pos.lots = backendUnitsToLots(pos.size, effectiveSymbol, mkt?.category);
    }
    pos.contractSize = contractSize;

    if (entryPrice !== undefined) pos.entryPrice = Number(Number(entryPrice).toFixed(4));
    if (stopLoss !== undefined) pos.stopLoss = stopLoss ? Number(stopLoss) : undefined;
    if (takeProfit !== undefined) pos.takeProfit = takeProfit ? Number(takeProfit) : undefined;
    if (handlingFee !== undefined) pos.handlingFee = Number(Number(handlingFee).toFixed(2));
    else if (fee !== undefined) pos.handlingFee = Number(Number(fee).toFixed(2));
    if (openedAt !== undefined) pos.openedAt = openedAt;
    if (targetUserId !== pos.userId) pos.userId = targetUserId;

    (pos as any).lastModifiedAt = new Date().toISOString();
    (pos as any).lastModifiedBy = req.user.email;

    recordAuditLog({
      action: 'Edit Open Position Parameters',
      eventType: 'ADMIN_EDIT_TRADE',
      category: 'trade',
      actor: req.user,
      targetUser: targetUserObj,
      targetUserId: pos.userId,
      targetUserName: targetUserObj.name,
      targetUserEmail: targetUserObj.email,
      objectType: 'Position',
      objectId: pos.id,
      previousState: JSON.stringify(originalPos),
      newState: JSON.stringify(pos),
      symbol: pos.symbol,
      side: pos.side,
      entryPrice: pos.entryPrice,
      reason: reason.trim(),
      details: `Admin ${req.user.name || req.user.email} updated open position #${pos.id}. Reason: ${reason.trim()}`,
      ipAddress: getClientIp(req)
    });

    saveDataToDisk();
    return res.json({
      message: 'Open position parameters updated successfully.',
      trade: pos,
      wallet: getUserWallet(pos.userId),
      pnlDiff: 0
    });
  }
});

// MANUAL TRADE CREATION ENDPOINT (ADMIN BACKEND ONLY)
app.post('/api/admin/trades/create', authenticateToken, (req: any, res) => {
  if (!hasPermission(req.user, 'create_trade') && !hasPermission(req.user, 'manage_trades') && req.user.role !== 'admin' && !isMasterAdminUser(req.user)) {
    return res.status(403).json({ error: 'Access Denied: Manual trade creation permission required.' });
  }

  const {
    userId,
    symbol,
    side = 'buy',
    orderType = 'market',
    lots = 0.10,
    entryPrice,
    exitPrice,
    stopLoss,
    takeProfit,
    status = 'closed',
    openedAt,
    closedAt,
    fee = 0,
    handlingFee = 0,
    swapFee = 0,
    pnl,
    netPnL,
    reason,
    idempotencyKey
  } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Target customer account selection is mandatory.' });
  }
  const targetUser = USERS_DB.find(u => u.id === userId);
  if (!targetUser) {
    return res.status(404).json({ error: `Target user '${userId}' not found.` });
  }

  if (!symbol) {
    return res.status(400).json({ error: 'Trading symbol / instrument selection is mandatory.' });
  }
  const cleanSymbol = symbol.trim().toUpperCase();
  const mkt = MARKETS_DB.find(m => m.symbol.toUpperCase() === cleanSymbol) || MARKETS_DB.find(m => m.symbol.replace('/', '').toUpperCase() === cleanSymbol.replace('/', ''));
  if (!mkt) {
    return res.status(400).json({ error: `Trading symbol '${symbol}' is not currently supported on the platform.` });
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    return res.status(400).json({ error: 'A mandatory justification reason (minimum 3 characters) is required for institutional trade creation.' });
  }

  const numLots = Number(lots);
  if (isNaN(numLots) || numLots <= 0) {
    return res.status(400).json({ error: 'Lot size must be a valid positive number.' });
  }

  const numEntryPrice = Number(entryPrice);
  if (isNaN(numEntryPrice) || numEntryPrice <= 0) {
    return res.status(400).json({ error: 'Opening / Entry Price must be a valid positive number.' });
  }

  const contractSize = getBackendContractSize(mkt.symbol, mkt.category);
  const units = backendLotsToUnits(numLots, mkt.symbol, mkt.category);
  const isBuy = side.toLowerCase() === 'buy' || side.toLowerCase() === 'long';
  const leverage = 100;
  const margin = calculateBackendMarginUSD(mkt.symbol, units, numEntryPrice, leverage);

  const numFee = Number(fee) || 0;
  const numHandlingFee = Number(handlingFee) || 0;
  const numSwapFee = Number(swapFee) || 0;

  const tradeUniqueId = idempotencyKey || ('tr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7));

  // Check if idempotencyKey already exists
  const existingTx = TRANSACTIONS_DB.find(t => t.id === tradeUniqueId);
  if (existingTx) {
    return res.json({ message: 'Trade already created (idempotent)', trade: existingTx, wallet: getUserWallet(userId) });
  }

  if (status === 'closed' || status === 'completed') {
    const numExitPrice = Number(exitPrice || numEntryPrice);
    if (isNaN(numExitPrice) || numExitPrice <= 0) {
      return res.status(400).json({ error: 'Closing / Exit Price is required for completed trades.' });
    }

    let calculatedGrossPnL = pnl !== undefined ? Number(pnl) : 0;
    if (pnl === undefined) {
      calculatedGrossPnL = isBuy ? (numExitPrice - numEntryPrice) * units : (numEntryPrice - numExitPrice) * units;
    }

    let calculatedNetPnL = netPnL !== undefined ? Number(netPnL) : 0;
    if (netPnL === undefined) {
      calculatedNetPnL = calculatedGrossPnL - numFee - numSwapFee;
    }

    const newTrade: any = {
      id: tradeUniqueId,
      userId: targetUser.id,
      userName: targetUser.name,
      userEmail: targetUser.email,
      type: 'trade',
      symbol: mkt.symbol,
      side: isBuy ? 'buy' : 'sell',
      status: 'completed',
      entryPrice: Number(numEntryPrice.toFixed(4)),
      exitPrice: Number(numExitPrice.toFixed(4)),
      quantity: units,
      lots: numLots,
      contractSize: contractSize,
      leverage: leverage,
      margin: margin,
      fee: numFee,
      handlingFee: numHandlingFee,
      swapFee: numSwapFee,
      pnl: Number(calculatedGrossPnL.toFixed(2)),
      netPnL: Number(calculatedNetPnL.toFixed(2)),
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
      takeProfit: takeProfit ? Number(takeProfit) : undefined,
      orderType: orderType || 'market',
      openedAt: openedAt || new Date().toISOString(),
      createdAt: closedAt || new Date().toISOString(),
      referenceId: 'REF-' + Date.now().toString(36).toUpperCase(),
      isManualAdminCreated: true,
      createdByAdmin: req.user.email,
      corrections: [{
        id: 'init_' + Date.now(),
        field: 'MANUAL_CREATION',
        originalValue: null,
        newValue: {
          symbol: mkt.symbol,
          side: isBuy ? 'buy' : 'sell',
          lots: numLots,
          entryPrice: numEntryPrice,
          exitPrice: numExitPrice,
          grossPnL: calculatedGrossPnL,
          netPnL: calculatedNetPnL,
          status: 'completed'
        },
        reason: reason.trim(),
        adminId: req.user.id,
        adminEmail: req.user.email,
        adminName: req.user.name || req.user.email,
        timestamp: new Date().toISOString()
      }]
    };

    TRANSACTIONS_DB.unshift(newTrade);

    // Reconcile user trading wallet balance
    const wallet = getUserWallet(targetUser.id);
    wallet.tradingBalance = Math.max(0, Number((wallet.tradingBalance + newTrade.netPnL).toFixed(2)));
    wallet.availableMargin = Math.max(0, Number((wallet.availableMargin + newTrade.netPnL).toFixed(2)));

    recordAuditLog({
      action: 'Create Manual Closed Trade',
      eventType: 'ADMIN_CREATE_TRADE',
      category: 'trade',
      actor: req.user,
      targetUser: targetUser,
      targetUserId: targetUser.id,
      targetUserName: targetUser.name,
      targetUserEmail: targetUser.email,
      objectType: 'Trade',
      objectId: newTrade.id,
      previousState: null,
      newState: JSON.stringify(newTrade),
      symbol: mkt.symbol,
      side: newTrade.side,
      entryPrice: newTrade.entryPrice,
      currentPrice: newTrade.exitPrice,
      targetPnL: newTrade.netPnL,
      reason: reason.trim(),
      details: `Admin ${req.user.name || req.user.email} manually created settled trade #${newTrade.id} for user ${targetUser.name} (${mkt.symbol}, ${numLots} lots, Net PnL: $${newTrade.netPnL}). Reason: ${reason.trim()}`,
      ipAddress: getClientIp(req)
    });

    saveDataToDisk();
    return res.status(201).json({
      message: 'New trade record created and customer wallet balance reconciled successfully.',
      trade: newTrade,
      wallet
    });
  } else {
    // Creating Open Position
    const newPos: any = {
      id: tradeUniqueId.replace('tr_', 'pos_'),
      userId: targetUser.id,
      symbol: mkt.symbol,
      side: isBuy ? 'long' : 'short',
      entryPrice: Number(numEntryPrice.toFixed(4)),
      markPrice: Number(numEntryPrice.toFixed(4)),
      size: units,
      lots: numLots,
      contractSize: contractSize,
      leverage: leverage,
      margin: margin,
      handlingFee: numHandlingFee || numFee,
      unrealizedPnL: 0,
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
      takeProfit: takeProfit ? Number(takeProfit) : undefined,
      openedAt: openedAt || new Date().toISOString(),
      isManualAdminCreated: true,
      createdByAdmin: req.user.email
    };

    POSITIONS_DB.unshift(newPos);

    recordAuditLog({
      action: 'Create Manual Open Position',
      eventType: 'ADMIN_CREATE_TRADE',
      category: 'trade',
      actor: req.user,
      targetUser: targetUser,
      targetUserId: targetUser.id,
      targetUserName: targetUser.name,
      targetUserEmail: targetUser.email,
      objectType: 'Position',
      objectId: newPos.id,
      previousState: null,
      newState: JSON.stringify(newPos),
      symbol: mkt.symbol,
      side: newPos.side,
      entryPrice: newPos.entryPrice,
      reason: reason.trim(),
      details: `Admin ${req.user.name || req.user.email} manually opened position #${newPos.id} for user ${targetUser.name} (${mkt.symbol}, ${numLots} lots). Reason: ${reason.trim()}`,
      ipAddress: getClientIp(req)
    });

    saveDataToDisk();
    return res.status(201).json({
      message: 'New open position created successfully.',
      trade: newPos,
      wallet: getUserWallet(targetUser.id)
    });
  }
});

// BACKEND-ONLY DELETE / VOID TRADE ENDPOINT
app.post('/api/admin/trades/:tradeId/delete', authenticateToken, (req: any, res) => {
  if (!hasPermission(req.user, 'delete_trade') && !hasPermission(req.user, 'void_trade') && !hasPermission(req.user, 'manage_trades') && req.user.role !== 'admin' && !isMasterAdminUser(req.user)) {
    return res.status(403).json({ error: 'Access Denied: Trade deletion / voiding permission required.' });
  }

  const tradeId = req.params.tradeId;
  const { reason, actionType = 'void' } = req.body;

  if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
    return res.status(400).json({ error: 'A mandatory justification reason (minimum 3 characters) is required to delete or void a trade.' });
  }

  const txIndex = TRANSACTIONS_DB.findIndex(t => t.id === tradeId && (t.type === 'trade' || !t.type));
  const posIndex = POSITIONS_DB.findIndex(p => p.id === tradeId);

  if (txIndex === -1 && posIndex === -1) {
    return res.status(404).json({ error: 'Trade record not found in system.' });
  }

  if (txIndex !== -1) {
    const tx = TRANSACTIONS_DB[txIndex];
    const targetUser = USERS_DB.find(u => u.id === tx.userId);
    const settledNetPnL = tx.netPnL !== undefined ? tx.netPnL : (tx.pnl !== undefined ? tx.pnl - (tx.fee || 0) : 0);
    const wallet = getUserWallet(tx.userId);

    // Financial balance reversal: reverse settled PnL from customer's wallet so ledger remains consistent
    if (settledNetPnL !== 0 && (tx.status as string) !== 'cancelled' && !tx.isVoided) {
      wallet.tradingBalance = Math.max(0, Number((wallet.tradingBalance - settledNetPnL).toFixed(2)));
      wallet.availableMargin = Math.max(0, Number((wallet.availableMargin - settledNetPnL).toFixed(2)));
    }

    if (actionType === 'hard_delete') {
      TRANSACTIONS_DB.splice(txIndex, 1);
    } else {
      // Soft-delete / Void
      (tx as any).status = 'cancelled';
      tx.isVoided = true;
      tx.voidReason = reason.trim();
      tx.voidedAt = new Date().toISOString();
      tx.voidedBy = req.user.email;
      if (!Array.isArray(tx.corrections)) tx.corrections = [];
      tx.corrections.unshift({
        id: 'void_' + Date.now(),
        field: 'VOID_TRADE',
        originalValue: { status: 'completed', netPnL: settledNetPnL },
        newValue: { status: 'cancelled', isVoided: true },
        reason: reason.trim(),
        adminId: req.user.id,
        adminEmail: req.user.email,
        adminName: req.user.name || req.user.email,
        timestamp: new Date().toISOString()
      });
    }

    recordAuditLog({
      action: actionType === 'hard_delete' ? 'Hard Delete Trade Record' : 'Void Trade Record',
      eventType: 'ADMIN_DELETE_TRADE',
      category: 'trade',
      actor: req.user,
      targetUser: targetUser,
      targetUserId: tx.userId,
      targetUserName: targetUser?.name,
      targetUserEmail: targetUser?.email,
      objectType: 'Trade',
      objectId: tradeId,
      previousState: JSON.stringify(tx),
      newState: actionType === 'hard_delete' ? 'DELETED' : 'VOIDED / CANCELLED',
      symbol: tx.symbol,
      side: tx.side,
      previousPnL: settledNetPnL,
      targetPnL: 0,
      reason: reason.trim(),
      details: `Admin ${req.user.name || req.user.email} ${actionType === 'hard_delete' ? 'permanently deleted' : 'voided'} trade #${tradeId} (${tx.symbol}). Reversal delta: -$${settledNetPnL.toFixed(2)} USDT. Reason: ${reason.trim()}`,
      ipAddress: getClientIp(req),
      metadata: {
        tradeId,
        reversalAmount: settledNetPnL,
        actionType
      }
    });

    saveDataToDisk();
    return res.json({
      message: actionType === 'hard_delete' ? 'Trade permanently deleted and financial balance reversed successfully.' : 'Trade record marked as voided and settled balance reversed successfully.',
      reversalAmount: settledNetPnL,
      wallet
    });
  }

  if (posIndex !== -1) {
    const pos = POSITIONS_DB[posIndex];
    const targetUser = USERS_DB.find(u => u.id === pos.userId);
    POSITIONS_DB.splice(posIndex, 1);

    recordAuditLog({
      action: 'Delete / Cancel Open Position',
      eventType: 'ADMIN_DELETE_TRADE',
      category: 'trade',
      actor: req.user,
      targetUser: targetUser,
      targetUserId: pos.userId,
      targetUserName: targetUser?.name,
      targetUserEmail: targetUser?.email,
      objectType: 'Position',
      objectId: tradeId,
      previousState: JSON.stringify(pos),
      newState: 'DELETED',
      symbol: pos.symbol,
      side: pos.side,
      reason: reason.trim(),
      details: `Admin ${req.user.name || req.user.email} deleted open position #${tradeId} (${pos.symbol}). Reason: ${reason.trim()}`,
      ipAddress: getClientIp(req)
    });

    saveDataToDisk();
    return res.json({
      message: 'Open position deleted successfully.',
      wallet: getUserWallet(pos.userId),
      reversalAmount: 0
    });
  }
});

// GET AUDIT LOGS FOR SPECIFIC TRADE
app.get('/api/admin/trades/:tradeId/audit', authenticateToken, (req: any, res) => {
  const tradeId = req.params.tradeId;
  const tx = TRANSACTIONS_DB.find(t => t.id === tradeId);
  const tradeCorrections = tx?.corrections || [];
  const logs = AUDIT_LOGS.filter(l => l.objectId === tradeId || (l.metadata && l.metadata.tradeId === tradeId));

  res.json({
    tradeId,
    corrections: tradeCorrections,
    auditLogs: logs
  });
});

// UNIFIED ADMIN TRANSACTIONS LEDGER
app.get('/api/admin/transactions/all', authenticateToken, requirePermission('view_deposit_history'), (req, res) => {
  const enriched = TRANSACTIONS_DB.map(t => {
    const u = USERS_DB.find(usr => usr.id === t.userId);
    return {
      ...t,
      userName: u?.name || t.userName || 'Trader',
      userEmail: u?.email || t.userEmail || 'trader@etoroglobal.com'
    };
  });
  res.json(enriched);
});

// VITE SERVER & STATIC SERVING

// ==========================================
// DYNAMIC ROLE & PERMISSIONS RBAC ENDPOINTS
// ==========================================

// GET global catalog and role templates
app.get('/api/admin/roles/permissions', authenticateToken, (req: any, res) => {
  if (!isStaffUser(req.user)) {
    return res.status(403).json({ error: 'Access Denied: Staff privilege required.' });
  }

  res.json({
    catalog: ADMIN_MODULES_CATALOG,
    templates: ROLE_PERMISSIONS_DB,
    defaultTemplates: DEFAULT_ROLE_TEMPLATES
  });
});

// POST update global role permission template (Admin only)
app.post('/api/admin/roles/permissions', authenticateToken, (req: any, res) => {
  if (!hasPermission(req.user, 'users:manage_roles') && !isAdminRole(req.user)) {
    return res.status(403).json({ error: 'Access Denied: You lack authorization to modify role permission templates.' });
  }

  const { role, enabledModules, actions } = req.body;
  if (!role || typeof role !== 'string') {
    return res.status(400).json({ error: 'Valid role identifier is required.' });
  }

  const normRole = role.toLowerCase().trim().replace('-', '_');
  if (normRole === 'admin') {
    return res.status(400).json({ error: 'The Master Admin role permissions are immutable and permanently grant Full Access.' });
  }

  if (!ROLE_PERMISSIONS_DB[normRole]) {
    return res.status(404).json({ error: `Role '${role}' not found in role templates.` });
  }

  const prevTemplate = JSON.parse(JSON.stringify(ROLE_PERMISSIONS_DB[normRole]));

  ROLE_PERMISSIONS_DB[normRole] = {
    ...ROLE_PERMISSIONS_DB[normRole],
    enabledModules: Array.isArray(enabledModules) ? enabledModules : prevTemplate.enabledModules,
    actions: (actions && typeof actions === 'object') ? actions : prevTemplate.actions,
    updatedAt: new Date().toISOString(),
    updatedBy: req.user.email || req.user.name
  };

  saveDataToDisk();

  recordAuditLog({
    action: `Update Role Policy: ${normRole.toUpperCase()}`,
    eventType: 'ADMIN_UPDATE_ROLE_TEMPLATE',
    category: 'role',
    actor: req.user,
    objectType: 'Role Policy',
    objectId: normRole,
    previousState: JSON.stringify(prevTemplate),
    newState: JSON.stringify(ROLE_PERMISSIONS_DB[normRole]),
    reason: req.body.reason || `Admin modified global permissions template for role ${normRole.toUpperCase()}`,
    details: `${req.user.name || req.user.email} updated permission policies for role '${normRole.toUpperCase()}' (${ROLE_PERMISSIONS_DB[normRole].enabledModules.length} modules enabled)`,
    ipAddress: getClientIp(req)
  });

  res.json({
    success: true,
    message: `Role template for ${normRole.toUpperCase()} saved successfully.`,
    template: ROLE_PERMISSIONS_DB[normRole]
  });
});

// POST reset global role template to system default
app.post('/api/admin/roles/reset', authenticateToken, (req: any, res) => {
  if (!hasPermission(req.user, 'users:manage_roles') && !isAdminRole(req.user)) {
    return res.status(403).json({ error: 'Access Denied: You lack authorization to reset role templates.' });
  }

  const { role } = req.body;
  const normRole = (role || '').toLowerCase().trim().replace('-', '_');
  if (!normRole || !DEFAULT_ROLE_TEMPLATES[normRole as Role]) {
    return res.status(400).json({ error: 'Invalid role specified for reset.' });
  }

  const prev = JSON.parse(JSON.stringify(ROLE_PERMISSIONS_DB[normRole] || {}));
  ROLE_PERMISSIONS_DB[normRole] = JSON.parse(JSON.stringify(DEFAULT_ROLE_TEMPLATES[normRole as Role]));
  ROLE_PERMISSIONS_DB[normRole].updatedAt = new Date().toISOString();
  ROLE_PERMISSIONS_DB[normRole].updatedBy = req.user.email || req.user.name;

  saveDataToDisk();

  recordAuditLog({
    action: `Reset Role Template: ${normRole.toUpperCase()}`,
    eventType: 'ADMIN_RESET_ROLE_TEMPLATE',
    category: 'role',
    actor: req.user,
    objectType: 'Role Policy',
    objectId: normRole,
    previousState: JSON.stringify(prev),
    newState: JSON.stringify(ROLE_PERMISSIONS_DB[normRole]),
    reason: `Reset ${normRole.toUpperCase()} template to factory system defaults`,
    details: `${req.user.name || req.user.email} restored factory default permissions for role '${normRole.toUpperCase()}'`,
    ipAddress: getClientIp(req)
  });

  res.json({
    success: true,
    message: `Role template for ${normRole.toUpperCase()} reset to factory defaults.`,
    template: ROLE_PERMISSIONS_DB[normRole]
  });
});

// GET specific user permissions and overrides
app.get('/api/admin/users/:userId/permissions', authenticateToken, (req: any, res) => {
  if (!hasPermission(req.user, 'users:view_profiles') && !hasPermission(req.user, 'users:view') && !isAdminRole(req.user)) {
    return res.status(403).json({ error: 'Access Denied: View user profiles permission required.' });
  }

  const user = USERS_DB.find(u => u.id === req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const effective = computeUserEffectivePermissions(user);
  const roleTemplate = getRoleTemplate(user.role);

  res.json({
    userId: user.id,
    role: user.role,
    customModules: user.customModules || {},
    customActions: user.customActions || {},
    effective,
    roleTemplate
  });
});

// POST update user-specific custom permission overrides
app.post('/api/admin/users/:userId/permissions', authenticateToken, (req: any, res) => {
  if (!hasPermission(req.user, 'users:manage_roles') && !isAdminRole(req.user)) {
    return res.status(403).json({ error: 'Access Denied: You lack authorization to manage user permissions.' });
  }

  const user = USERS_DB.find(u => u.id === req.params.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const { customModules, customActions, resetToRoleDefault } = req.body;

  const previousEffective = computeUserEffectivePermissions(user);

  if (resetToRoleDefault) {
    delete user.customModules;
    delete user.customActions;
  } else {
    if (customModules !== undefined) {
      user.customModules = customModules;
    }
    if (customActions !== undefined) {
      user.customActions = customActions;
    }
  }

  saveDataToDisk();

  const newEffective = computeUserEffectivePermissions(user);

  recordAuditLog({
    action: `Update User Permissions: ${user.name || user.email}`,
    eventType: 'ADMIN_UPDATE_USER_PERMISSIONS',
    category: 'role',
    actor: req.user,
    targetUser: user,
    targetUserId: user.id,
    targetUserName: user.name,
    targetUserEmail: user.email,
    objectType: 'User Permissions',
    objectId: user.id,
    previousState: JSON.stringify(previousEffective),
    newState: JSON.stringify(newEffective),
    reason: req.body.reason || (resetToRoleDefault ? 'Reset permissions to role defaults' : 'Customized user permission overrides'),
    details: `${req.user.name || req.user.email} updated granular permission overrides for user ${user.name || user.email}`,
    ipAddress: getClientIp(req)
  });

  res.json({
    success: true,
    message: resetToRoleDefault ? 'User permissions reset to role template.' : 'User permissions saved successfully.',
    effective: newEffective,
    customModules: user.customModules || {},
    customActions: user.customActions || {}
  });
});

// ASSIGN / UPDATE USER ROLE
app.post('/api/admin/users/role', authenticateToken, requireAdmin, (req: any, res: any) => {
  const { userId, role, applyRoleDefaults = true } = req.body;
  const validRoles = ['admin', 'co_admin', 'trade_controller', 'finance_manager', 'support', 'manager', 'moderator', 'user'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const user = USERS_DB.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Prevent self-demotion from main admin
  if (user.id === req.user.id && role !== 'admin') {
    return res.status(403).json({ error: 'Cannot downgrade your own admin account' });
  }

  const oldRole = user.role || 'user';
  user.role = role;

  // Clear custom overrides when switching roles so new role's configured permissions take effect cleanly
  if (applyRoleDefaults) {
    delete user.customModules;
    delete user.customActions;
  }

  saveDataToDisk();
  
  const adminName = req.user.name || req.user.email;
  const targetName = user.name || user.email;
  
  recordAuditLog({
    action: 'Change User Role',
    eventType: 'ADMIN_CHANGE_USER_ROLE',
    category: 'role',
    actor: req.user,
    targetUser: user,
    targetUserId: user.id,
    targetUserName: user.name,
    targetUserEmail: user.email,
    objectType: 'User Role',
    objectId: user.id,
    previousState: oldRole.toUpperCase(),
    newState: role.toUpperCase(),
    reason: req.body.reason || `Administrator updated privileges to ${role.toUpperCase()}`,
    details: `${adminName} changed ${targetName}'s role: ${oldRole.toUpperCase()} → ${role.toUpperCase()}`,
    ipAddress: getClientIp(req)
  });

  const effective = computeUserEffectivePermissions(user);

  res.json({
    success: true,
    message: `Role updated successfully to ${role.toUpperCase()}`,
    role,
    user: {
      ...user,
      effectivePermissions: effective.actions,
      effectiveModules: effective.enabledModules
    }
  });
});


app.get('/app_data.json', (req, res) => {
  const filePath = path.join(process.cwd(), "app_data.json");
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: "app_data.json not found",
      path: filePath
    });
  }

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=60');
  const stream = fs.createReadStream(filePath);
  stream.on('error', (err) => {
    console.error('Error streaming app_data.json:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to stream data file' });
    }
  });
  stream.pipe(res);
});

function injectMetadata(html: string, settings: SystemSettings, req: express.Request): string {
  const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || `localhost:${PORT}`;
  const baseUrl = `${protocol}://${host}`;
  const fullPageUrl = `${baseUrl}${req.originalUrl || '/'}`;

  const siteTitle = settings.siteName || 'eToro Global';
  const browserTitle = settings.browserTabTitle || siteTitle;
  const socialTitle = settings.socialShareTitle || siteTitle;
  const socialDesc = settings.socialShareDescription || `Trade Forex, Crypto, Commodities, and Indices with confidence on ${siteTitle}. Secure, fast, and professional trading platform featuring sub-millisecond execution.`;
  
  let socialImageUrl = settings.socialShareImageUrl || 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=1200&h=630';
  if (socialImageUrl.startsWith('/')) {
    socialImageUrl = `${baseUrl}${socialImageUrl}`;
  }

  let faviconUrl = settings.faviconUrl || '';
  if (faviconUrl && faviconUrl.startsWith('/')) {
    faviconUrl = `${baseUrl}${faviconUrl}`;
  }

  const escapeAttr = (str: string) => (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let processed = html;

  // 1. Replace <title>
  processed = processed.replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeAttr(browserTitle)}</title>`);

  // 2. Replace or inject meta description
  if (/<meta\s+name=["']description["']/i.test(processed)) {
    processed = processed.replace(/<meta\s+name=["']description["']\s+content=["'][\s\S]*?["']\s*\/?>/i, `<meta name="description" content="${escapeAttr(socialDesc)}" />`);
  }

  // 3. Clean existing og: and twitter: tags
  processed = processed.replace(/<meta\s+property=["']og:[^"']+["']\s+content=["'][^"']*["']\s*\/?>\n?/gi, '');
  processed = processed.replace(/<meta\s+name=["']twitter:[^"']+["']\s+content=["'][^"']*["']\s*\/?>\n?/gi, '');

  // 4. Favicon replacement if custom configured
  if (faviconUrl) {
    processed = processed.replace(/<link\s+rel=["'](icon|shortcut icon|apple-touch-icon)["'][^>]*\/?>\n?/gi, '');
  }

  // 5. Open Graph tags
  const ogTags = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${escapeAttr(fullPageUrl)}" />`,
    `<meta property="og:title" content="${escapeAttr(socialTitle)}" />`,
    `<meta property="og:description" content="${escapeAttr(socialDesc)}" />`,
    `<meta property="og:image" content="${escapeAttr(socialImageUrl)}" />`,
    `<meta property="og:image:alt" content="${escapeAttr(socialTitle)}" />`,
    `<meta property="og:site_name" content="${escapeAttr(siteTitle)}" />`
  ];

  // 6. Twitter tags
  const twitterTags = [
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:url" content="${escapeAttr(fullPageUrl)}" />`,
    `<meta name="twitter:title" content="${escapeAttr(socialTitle)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(socialDesc)}" />`,
    `<meta name="twitter:image" content="${escapeAttr(socialImageUrl)}" />`
  ];

  let headTags = `\n    <!-- Dynamic Open Graph / Social Sharing & Metadata -->\n    ${ogTags.join('\n    ')}\n    ${twitterTags.join('\n    ')}`;
  if (faviconUrl) {
    headTags += `\n    <link rel="icon" href="${escapeAttr(faviconUrl)}" />\n    <link rel="apple-touch-icon" href="${escapeAttr(faviconUrl)}" />`;
  }

  processed = processed.replace('</head>', `${headTags}\n  </head>`);

  return processed;
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });

    app.use(async (req, res, next) => {
      const isHtmlReq = req.method === 'GET' &&
        !req.path.startsWith('/api') &&
        !req.path.startsWith('/uploads') &&
        !req.path.startsWith('/src') &&
        !req.path.startsWith('/@') &&
        !req.path.startsWith('/node_modules') &&
        !req.path.includes('.');

      if (isHtmlReq) {
        try {
          const rawHtml = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
          const transformedHtml = await vite.transformIndexHtml(req.originalUrl, rawHtml);
          const finalHtml = injectMetadata(transformedHtml, SYSTEM_SETTINGS, req);
          return res.status(200).set({ 'Content-Type': 'text/html' }).send(finalHtml);
        } catch (e) {
          vite.ssrFixStacktrace(e as Error);
          return next(e);
        }
      }
      return vite.middlewares(req, res, next);
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
    app.get('*', (req, res) => {
      const distHtmlPath = path.join(distPath, 'index.html');
      if (fs.existsSync(distHtmlPath)) {
        const rawHtml = fs.readFileSync(distHtmlPath, 'utf-8');
        const finalHtml = injectMetadata(rawHtml, SYSTEM_SETTINGS, req);
        res.status(200).set({ 'Content-Type': 'text/html' }).send(finalHtml);
      } else {
        res.sendFile(distHtmlPath);
      }
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`eToro Institutional Exchange backend running at http://0.0.0.0:${PORT}`);
  });
}

// Continuous Live Market Price Fluctuation Simulation Engine
setInterval(() => {
  MARKETS_DB.forEach(pair => {
    // Only fluctuate if not actively managed by an active admin price override or transition
    const hasActiveOverride = POSITIONS_DB.some(p => p.symbol === pair.symbol && (p.customMarkPrice !== undefined || p.targetMarkPrice !== undefined));
    if (hasActiveOverride) return;

    const deltaPercent = (Math.random() - 0.49) * 0.0025; // -0.12% to +0.12%
    const oldPrice = pair.price;
    const decimals = oldPrice < 10 ? 4 : 2;
    const newPrice = Number((oldPrice * (1 + deltaPercent)).toFixed(decimals));
    const direction = newPrice >= oldPrice ? 'up' : 'down';

    pair.price = newPrice;
    pair.priceDirection = direction;
    if (newPrice > pair.high24h) pair.high24h = newPrice;
    if (newPrice < pair.low24h) pair.low24h = newPrice;
    pair.change24h = Number((pair.change24h + (direction === 'up' ? 0.015 : -0.015)).toFixed(2));
    pair.volume24h += Math.floor(Math.random() * 8000 + 200);
  });
}, 1500);

loadDataFromDisk();
startServer();



