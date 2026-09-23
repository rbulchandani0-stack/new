import { SupportConversation, SupportMessage } from '../types';
import { apiService } from './api';
import { feedbackService } from './feedbackService';

type SupportEventListener = (event: { type: string; payload: any }) => void;

class SupportChatService {
  private eventSource: EventSource | null = null;
  private listeners = new Set<SupportEventListener>();
  private processedMessageIds = new Set<string>();
  private reconnectTimeout: any = null;
  private isConnecting = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initRealtimeStream();
    }
  }

  public initRealtimeStream() {
    if (typeof window === 'undefined' || this.isConnecting) return;
    if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) return;

    this.isConnecting = true;
    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      this.eventSource = new EventSource('/api/support/stream');

      this.eventSource.addEventListener('NEW_MESSAGE', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          const msg = data.message as SupportMessage;

          // Prevent duplicate triggers
          if (msg && msg.id) {
            if (this.processedMessageIds.has(msg.id)) {
              return;
            }
            this.processedMessageIds.add(msg.id);
            if (this.processedMessageIds.size > 1000) {
              const [first] = this.processedMessageIds;
              this.processedMessageIds.delete(first);
            }
          }

          this.notifyListeners('NEW_MESSAGE', data);
        } catch (err) {
          // Parsing error ignore
        }
      });

      this.eventSource.addEventListener('MESSAGES_READ', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.notifyListeners('MESSAGES_READ', data);
        } catch (err) {
          // Ignore
        }
      });

      this.eventSource.onopen = () => {
        this.isConnecting = false;
      };

      this.eventSource.onerror = () => {
        this.isConnecting = false;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.initRealtimeStream();
          }, 3000);
        }
      };
    } catch (e) {
      this.isConnecting = false;
    }
  }

  public subscribe(listener: SupportEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(type: string, payload: any) {
    this.listeners.forEach((listener) => {
      try {
        listener({ type, payload });
      } catch (e) {
        // Ignore listener error
      }
    });
  }

  // API Methods
  public async getConversations(): Promise<SupportConversation[]> {
    const res = await fetch('/api/support/conversations', {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch conversations');
    const data = await res.json();
    return data.conversations || [];
  }

  public async getMessages(conversationId: string): Promise<SupportMessage[]> {
    const res = await fetch(`/api/support/messages/${conversationId}`, {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch messages');
    const data = await res.json();
    return data.messages || [];
  }

  public async getMyConversation(): Promise<{ conversation: SupportConversation; messages: SupportMessage[] }> {
    const res = await fetch('/api/support/my-conversation', {
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch user conversation');
    return res.json();
  }

  public async sendMessage(params: {
    conversationId?: string;
    recipientUserId?: string;
    content: string;
    tempId?: string;
  }): Promise<{ message: SupportMessage; conversation: SupportConversation }> {
    const res = await fetch('/api/support/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders()
      },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to send message' }));
      throw new Error(err.error || 'Failed to send message');
    }

    const data = await res.json();
    if (data.message && data.message.id) {
      this.processedMessageIds.add(data.message.id);
    }
    return data;
  }

  public async markAsRead(conversationId: string): Promise<void> {
    const res = await fetch(`/api/support/conversations/${conversationId}/read`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to mark conversation as read');
  }

  private getAuthHeaders(): Record<string, string> {
    const token = apiService.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

export const supportChatService = new SupportChatService();
