export type ToastType = 'info' | 'success' | 'warning' | 'error' | 'trade' | 'transaction';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  createdAt: number;
}

export interface TransactionSuccessData {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount?: number | string;
  currency?: string;
  status?: string;
  referenceId?: string;
  customMessage?: string;
  autoCloseDuration?: number;
  createdAt: number;
}

type ToastListener = (toasts: ToastItem[]) => void;
type TransactionSuccessListener = (data: TransactionSuccessData | null) => void;

class FeedbackService {
  private audioCtx: AudioContext | null = null;
  private toasts: ToastItem[] = [];
  private toastListeners = new Set<ToastListener>();

  private activeTxSuccess: TransactionSuccessData | null = null;
  private txSuccessListeners = new Set<TransactionSuccessListener>();

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        try {
          if (!this.audioCtx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              this.audioCtx = new AudioContextClass();
            }
          }
          if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
          }
        } catch (e) {
          // Ignore
        }
      };
      window.addEventListener('click', unlockAudio, { once: true });
      window.addEventListener('touchstart', unlockAudio, { once: true });
    }
  }

  public playSuccessChime() {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc1 = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.15); // C6

      osc2.frequency.setValueAtTime(659.25, now + 0.05); // E5
      osc2.frequency.exponentialRampToValueAtTime(1318.5, now + 0.2); // E6

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc1.start(now);
      osc2.start(now + 0.05);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
    } catch (e) {
      // Audio playback non-critical
    }
  }

  public triggerVibration(pattern: 'success' | 'warning' | 'error' = 'success') {
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        if (pattern === 'success') navigator.vibrate([15, 40, 25]);
        else if (pattern === 'warning') navigator.vibrate([40, 30, 40]);
        else if (pattern === 'error') navigator.vibrate([60, 50, 60, 50, 60]);
      }
    } catch (e) {
      // Vibration not supported
    }
  }

  public showToast(options: { type?: ToastType; title?: string; message: string; duration?: number }) {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const toast: ToastItem = {
      id,
      type: options.type || 'info',
      title: options.title,
      message: options.message,
      duration: options.duration || 4000,
      createdAt: Date.now()
    };

    this.toasts = [toast, ...this.toasts.slice(0, 4)];
    this.notifyToastListeners();

    if (toast.type === 'success') {
      this.playSuccessChime();
      this.triggerVibration('success');
    } else if (toast.type === 'error') {
      this.triggerVibration('error');
    }

    setTimeout(() => {
      this.dismissToast(id);
    }, toast.duration);
  }

  public dismissToast(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notifyToastListeners();
  }

  public subscribeToasts(listener: ToastListener): () => void {
    this.toastListeners.add(listener);
    listener(this.toasts);
    return () => {
      this.toastListeners.delete(listener);
    };
  }

  private notifyToastListeners() {
    this.toastListeners.forEach(listener => listener(this.toasts));
  }

  public showTransactionSuccess(options: {
    type: 'deposit' | 'withdrawal';
    amount?: number | string;
    currency?: string;
    status?: string;
    referenceId?: string;
    customMessage?: string;
    autoCloseDuration?: number;
  }) {
    const id = 'tx_succ_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const data: TransactionSuccessData = {
      ...options,
      id,
      autoCloseDuration: options.autoCloseDuration ?? 4000,
      createdAt: Date.now()
    };
    this.activeTxSuccess = data;
    this.notifyTxSuccessListeners();

    this.playSuccessChime();
    this.triggerVibration('success');
  }

  public dismissTransactionSuccess(id?: string) {
    if (!id || this.activeTxSuccess?.id === id) {
      this.activeTxSuccess = null;
      this.notifyTxSuccessListeners();
    }
  }

  public subscribeTransactionSuccess(listener: TransactionSuccessListener): () => void {
    this.txSuccessListeners.add(listener);
    listener(this.activeTxSuccess);
    return () => {
      this.txSuccessListeners.delete(listener);
    };
  }

  private notifyTxSuccessListeners() {
    this.txSuccessListeners.forEach(listener => listener(this.activeTxSuccess));
  }
}

export const feedbackService = new FeedbackService();
