import { ChatMessage, ChatTypingEvent, RealtimeEventPayload } from '../types';
import { apiService } from './api';
import { feedbackService } from './feedbackService';

type MessageListener = (msg: ChatMessage, autoReply?: ChatMessage | null) => void;
type ReadListener = (data: { userId: string; reader: 'admin' | 'user'; readAt: string; messageIds: string[] }) => void;
type TypingListener = (event: ChatTypingEvent) => void;
type ConnectionListener = (connected: boolean) => void;
type RealtimeEventListener = (event: RealtimeEventPayload) => void;

class RealtimeChatService {
  private eventSource: EventSource | null = null;
  private messageListeners = new Set<MessageListener>();
  private readListeners = new Set<ReadListener>();
  private typingListeners = new Set<TypingListener>();
  private connectionListeners = new Set<ConnectionListener>();
  private realtimeEventListeners = new Set<RealtimeEventListener>();
  private reconnectTimer: any = null;
  private isConnected = false;
  private typingTimeouts = new Map<string, any>();
  private lastTypingSent = 0;
  private audioCtx: (AudioContext | null) = null;

  constructor() {
    // Lazy connect when token is present
  }

  public connect() {
    const token = localStorage.getItem('etoro_auth_token');
    if (!token) return;

    if (this.eventSource) {
      if (this.eventSource.readyState === EventSource.OPEN) {
        return;
      }
      this.disconnect();
    }

    try {
      const url = `/api/chat/stream?token=${encodeURIComponent(token)}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.notifyConnection(true);
      };

      this.eventSource.onmessage = (event) => {
        try {
          if (!event.data) return;
          const data = JSON.parse(event.data);
          this.handleEvent(data);
        } catch (err) {
          console.warn('[REALTIME_CHAT] Failed to parse SSE event payload:', err);
        }
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        this.notifyConnection(false);
        this.disconnect();
        
        // Auto-reconnect with exponential-like delay
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 4000);
        }
      };
    } catch (err) {
      console.warn('[REALTIME_CHAT] SSE connection failed to initialize:', err);
    }
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    this.notifyConnection(false);
  }

  private handleEvent(data: any) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'message:new':
        if (data.message) {
          this.messageListeners.forEach(listener => listener(data.message, data.autoReply));
        }
        break;

      case 'message:read':
        this.readListeners.forEach(listener => listener({
          userId: data.userId,
          reader: data.reader,
          readAt: data.readAt,
          messageIds: data.messageIds || []
        }));
        break;

      case 'typing:update':
        this.typingListeners.forEach(listener => listener({
          userId: data.userId,
          sender: data.sender,
          userName: data.userName,
          isTyping: !!data.isTyping,
          timestamp: data.timestamp
        }));
        break;

      case 'connected':
        this.isConnected = true;
        this.notifyConnection(true);
        break;

      case 'event:realtime':
        if (data.event) {
          const eventPayload = data.event as RealtimeEventPayload;
          this.realtimeEventListeners.forEach(listener => listener(eventPayload));
          feedbackService.handleRealtimeEvent(eventPayload);
        }
        break;

      default:
        break;
    }
  }

  private notifyConnection(connected: boolean) {
    this.connectionListeners.forEach(cb => cb(connected));
  }

  // Subscribe to real-time transaction and system events
  public onRealtimeEvent(listener: RealtimeEventListener): () => void {
    this.realtimeEventListeners.add(listener);
    if (!this.isConnected && !this.eventSource) {
      this.connect();
    }
    return () => {
      this.realtimeEventListeners.delete(listener);
    };
  }

  // Subscribe to real-time events
  public onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    if (!this.isConnected && !this.eventSource) {
      this.connect();
    }
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  public onRead(listener: ReadListener): () => void {
    this.readListeners.add(listener);
    if (!this.isConnected && !this.eventSource) {
      this.connect();
    }
    return () => {
      this.readListeners.delete(listener);
    };
  }

  public onTyping(listener: TypingListener): () => void {
    this.typingListeners.add(listener);
    if (!this.isConnected && !this.eventSource) {
      this.connect();
    }
    return () => {
      this.typingListeners.delete(listener);
    };
  }

  public onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    listener(this.isConnected);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  // Send typing event with automatic debounce/throttle
  public sendTyping(isTyping: boolean, targetUserId?: string) {
    const key = targetUserId || 'self';
    const now = Date.now();

    // Clear existing auto-stop timer
    if (this.typingTimeouts.has(key)) {
      clearTimeout(this.typingTimeouts.get(key));
      this.typingTimeouts.delete(key);
    }

    if (isTyping) {
      // Throttle typing pings to at most once every 1200ms
      if (now - this.lastTypingSent > 1200) {
        this.lastTypingSent = now;
        apiService.sendChatTyping(true, targetUserId).catch(() => {});
      }

      // Auto-send false if no typing happens for 2.5s
      const timer = setTimeout(() => {
        this.typingTimeouts.delete(key);
        apiService.sendChatTyping(false, targetUserId).catch(() => {});
      }, 2500);
      this.typingTimeouts.set(key, timer);
    } else {
      this.lastTypingSent = 0;
      apiService.sendChatTyping(false, targetUserId).catch(() => {});
    }
  }

  // Play a soft, non-intrusive notification chime
  public playIncomingChime() {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Note 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.12, now + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Note 2: 880 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.08);
      gain2.gain.setValueAtTime(0, now + 0.08);
      gain2.gain.linearRampToValueAtTime(0.15, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.45);
    } catch (e) {
      // Audio playback safely ignored if audio context is blocked by browser policies
    }
  }
}

export const realtimeChat = new RealtimeChatService();
