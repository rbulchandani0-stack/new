import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supportChatService } from '../services/supportChatService';
import { feedbackService } from '../services/feedbackService';
import { SupportMessage, SupportConversation } from '../types';
import { MessageSquare, X, Send, ShieldCheck, Headphones, Check, CheckCheck, Sparkles } from 'lucide-react';

export const CustomerSupportChat: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversation = async () => {
    if (!user) return;
    try {
      const res = await supportChatService.getMyConversation();
      setConversation(res.conversation);
      setMessages(res.messages || []);
      setUnreadCount(res.conversation.unreadUserCount || 0);
    } catch (e) {
      // Ignore
    }
  };

  useEffect(() => {
    if (user) {
      loadConversation();
    }
  }, [user]);

  // Real-time subscription
  useEffect(() => {
    const unsub = supportChatService.subscribe(({ type, payload }) => {
      if (type === 'NEW_MESSAGE') {
        const msg = payload.message as SupportMessage;
        if (conversation && msg.conversationId === conversation.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          if (msg.senderRole !== 'user') {
            if (isOpenRef.current) {
              // Automatically mark as read if chat is open
              supportChatService.markAsRead(conversation.id);
            } else {
              setUnreadCount((c) => c + 1);
              feedbackService.playSuccessChime();
              feedbackService.showToast({
                type: 'info',
                title: 'Support Desk Reply',
                message: msg.content
              });
            }
          }
          setTimeout(scrollToBottom, 50);
        }
      } else if (type === 'MESSAGES_READ') {
        if (conversation && payload.conversationId === conversation.id) {
          if (payload.readerRole === 'user') {
            setUnreadCount(0);
          } else {
            // Admin read our messages, update status
            setMessages((prev) =>
              prev.map((m) => (m.senderRole === 'user' ? { ...m, status: 'read' } : m))
            );
          }
        }
      }
    });

    return () => unsub();
  }, [conversation]);

  const handleOpen = async () => {
    setIsOpen(true);
    if (conversation) {
      setUnreadCount(0);
      try {
        await supportChatService.markAsRead(conversation.id);
      } catch (e) {
        // Ignore
      }
    }
    setTimeout(scrollToBottom, 100);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sending) return;

    const content = inputText.trim();
    setInputText('');
    setSending(true);

    const tempId = 'msg_user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const optimisticMsg: SupportMessage = {
      id: tempId,
      conversationId: conversation?.id || 'conv_' + (user?.id || 'demo'),
      senderId: user?.id || 'usr_trader_demo',
      senderName: user?.name || 'Alexander Vance',
      senderRole: 'user',
      content,
      status: 'unread',
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    try {
      const res = await supportChatService.sendMessage({
        conversationId: conversation?.id,
        content,
        tempId
      });
      if (res.conversation) {
        setConversation(res.conversation);
      }
    } catch (err: any) {
      feedbackService.showToast({ type: 'error', message: err.message || 'Failed to send message' });
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Support Button with Unread Badge */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-20 md:bottom-6 right-6 z-40 p-3.5 sm:p-4 rounded-full bg-gradient-to-tr from-[#00C853] to-[#00E676] text-black shadow-2xl shadow-[#00C853]/30 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center group"
          aria-label="Open 24/7 Live Support Chat"
        >
          <Headphones className="w-6 h-6 stroke-[2.2]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#FF3B30] text-white text-[11px] font-black flex items-center justify-center shadow-md animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div className="fixed bottom-4 md:bottom-6 right-4 md:right-6 z-50 w-[92vw] sm:w-[380px] h-[520px] max-h-[85vh] bg-[#121212] border border-[#282828] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white animate-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-4 bg-[#181818] border-b border-[#262626] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-[#00C853]/20 text-[#00C853] flex items-center justify-center font-bold">
                  <Headphones className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#00C853] border-2 border-[#181818]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center space-x-1.5">
                  <span>Apex Support Desk</span>
                  <ShieldCheck className="w-4 h-4 text-[#00C853]" />
                </h3>
                <div className="text-[11px] text-[#00C853] font-semibold">Live Institutional Assistance</div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-full bg-[#222222] hover:bg-[#2C2C2C] text-[#8A8A8A] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="px-4 py-2 bg-[#151515] border-b border-[#222222] flex space-x-2 overflow-x-auto no-scrollbar">
            {['Deposit Help', 'Withdrawal Status', 'Leverage & Margin', 'KYC Tier'].map((chip) => (
              <button
                key={chip}
                onClick={() => {
                  setInputText(chip);
                }}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-[#202020] hover:bg-[#282828] text-[11px] font-semibold text-[#CCCCCC] transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0E0E0E]">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-2 text-[#666666]">
                <Sparkles className="w-8 h-8 text-[#00C853]/40" />
                <p className="text-xs">
                  Welcome to Apex Trader Support. Our desk is ready 24/7 to assist with accounts, deposits, or trade execution.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.senderRole === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                        isMe
                          ? 'bg-[#00C853] text-black font-medium rounded-br-none shadow-md'
                          : 'bg-[#1C1C1C] text-white border border-[#2B2B2B] rounded-bl-none shadow-md'
                      }`}
                    >
                      {m.content}
                    </div>
                    <div className="flex items-center space-x-1 mt-1 px-1 text-[10px] text-[#666666]">
                      <span>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && (
                        <span>
                          {m.status === 'read' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-[#00C853]" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-[#888888]" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSend} className="p-3 bg-[#161616] border-t border-[#242424] flex items-center space-x-2">
            <input
              type="text"
              placeholder="Type your message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-[#1C1C1C] border border-[#2D2D2D] focus:border-[#00C853] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="p-2.5 rounded-xl bg-[#00C853] hover:bg-[#00E676] text-black font-bold disabled:opacity-40 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
