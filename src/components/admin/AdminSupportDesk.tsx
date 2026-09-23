import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supportChatService } from '../../services/supportChatService';
import { feedbackService } from '../../services/feedbackService';
import { SupportConversation, SupportMessage } from '../../types';
import { 
  Headphones, 
  Search, 
  Send, 
  Check, 
  CheckCheck, 
  User, 
  ShieldCheck, 
  Wallet, 
  Clock, 
  Sparkles, 
  AlertCircle 
} from 'lucide-react';

export const AdminSupportDesk: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const selectedConvIdRef = useRef<string | null>(selectedConversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    selectedConvIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const convs = await supportChatService.getConversations();
      setConversations(convs);
      if (convs.length > 0 && !selectedConvIdRef.current) {
        setSelectedConversationId(convs[0].id);
      }
    } catch (e) {
      // Ignore
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      setLoading(true);
      const msgs = await supportChatService.getMessages(convId);
      setMessages(msgs);
      setTimeout(scrollToBottom, 50);

      // Mark messages as read in backend
      await supportChatService.markAsRead(convId);

      // Optimistically update local conversation unread count
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unreadAdminCount: 0 } : c))
      );
    } catch (e) {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversationId) {
      fetchMessages(selectedConversationId);
    }
  }, [selectedConversationId]);

  // Real-time Event Subscription
  useEffect(() => {
    const unsub = supportChatService.subscribe(({ type, payload }) => {
      if (type === 'NEW_MESSAGE') {
        const newMsg = payload.message as SupportMessage;
        const convId = payload.conversationId as string;
        const senderRole = payload.senderRole as string;
        const senderName = payload.senderName as string;

        // 1. Update conversations list & unread counters
        setConversations((prev) => {
          const index = prev.findIndex((c) => c.id === convId);
          if (index !== -1) {
            const updated = [...prev];
            const targetConv = { ...updated[index] };
            targetConv.lastMessage = newMsg.content;
            targetConv.lastMessageAt = newMsg.createdAt;
            targetConv.updatedAt = newMsg.createdAt;

            // If the active conversation is currently open, mark read immediately
            if (selectedConvIdRef.current === convId) {
              targetConv.unreadAdminCount = 0;
              supportChatService.markAsRead(convId);
            } else if (senderRole === 'user') {
              targetConv.unreadAdminCount = (targetConv.unreadAdminCount || 0) + 1;
            }

            updated.splice(index, 1);
            updated.unshift(targetConv);
            return updated;
          } else if (payload.conversation) {
            const newConv = { ...payload.conversation };
            if (selectedConvIdRef.current === convId) {
              newConv.unreadAdminCount = 0;
              supportChatService.markAsRead(convId);
            }
            return [newConv, ...prev];
          }
          return prev;
        });

        // 2. If it belongs to currently selected conversation, append message
        if (selectedConvIdRef.current === convId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(scrollToBottom, 50);
        }

        // 3. If from a customer and not in active view, trigger global notification & chime
        if (senderRole === 'user') {
          feedbackService.playSuccessChime();
          feedbackService.triggerVibration('warning');

          if (selectedConvIdRef.current !== convId) {
            feedbackService.showToast({
              type: 'info',
              title: `New Message from ${senderName}`,
              message: newMsg.content.length > 60 ? newMsg.content.substring(0, 60) + '...' : newMsg.content
            });
          }
        }
      } else if (type === 'MESSAGES_READ') {
        const convId = payload.conversationId;
        const readerRole = payload.readerRole;

        if (readerRole === 'admin') {
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, unreadAdminCount: 0 } : c))
          );
        } else {
          // Customer read support's replies
          if (selectedConvIdRef.current === convId) {
            setMessages((prev) =>
              prev.map((m) => (m.senderRole !== 'user' ? { ...m, status: 'read' } : m))
            );
          }
        }
      }
    });

    return () => unsub();
  }, []);

  const handleSelectConversation = (conv: SupportConversation) => {
    setSelectedConversationId(conv.id);
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sending || !selectedConversationId) return;

    const content = inputText.trim();
    setInputText('');
    setSending(true);

    const tempId = 'msg_admin_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const optimisticMsg: SupportMessage = {
      id: tempId,
      conversationId: selectedConversationId,
      senderId: user?.id || 'usr_admin_1',
      senderName: user?.name || 'Support Staff',
      senderRole: 'support',
      content,
      status: 'unread',
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(scrollToBottom, 50);

    try {
      await supportChatService.sendMessage({
        conversationId: selectedConversationId,
        content,
        tempId
      });
    } catch (err: any) {
      feedbackService.showToast({ type: 'error', message: err.message || 'Failed to send reply' });
    } finally {
      setSending(false);
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedConversationId);
  const filteredConvs = conversations.filter(
    (c) =>
      c.userName.toLowerCase().includes(search.toLowerCase()) ||
      c.userEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-[#121212] border border-[#222222] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[720px] max-h-[80vh]">
      {/* Left Conversations Sidebar (WhatsApp style) */}
      <div className="w-full md:w-80 lg:w-96 bg-[#161616] border-r border-[#242424] flex flex-col">
        {/* Search Header */}
        <div className="p-4 border-b border-[#242424] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Headphones className="w-5 h-5 text-[#00C853]" />
              <h3 className="font-extrabold text-sm text-white">Live Customer Inquiries</h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#202020] text-[#A0A0A0] font-mono">
              {conversations.length}
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#666666]" />
            <input
              type="text"
              placeholder="Search customer or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1C1C1C] border border-[#2A2A2A] focus:border-[#00C853] rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#1F1F1F]">
          {filteredConvs.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#666666]">
              No matching customer conversations found.
            </div>
          ) : (
            filteredConvs.map((conv) => {
              const isSelected = conv.id === selectedConversationId;
              const hasUnread = (conv.unreadAdminCount || 0) > 0;

              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`p-3.5 sm:p-4 flex items-center space-x-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#202020] border-l-4 border-[#00C853]'
                      : 'hover:bg-[#1A1A1A]'
                  }`}
                >
                  {/* User Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-2xl bg-[#242424] border border-[#333333] flex items-center justify-center font-bold text-white text-sm">
                      {conv.userName.charAt(0)}
                    </div>
                    {hasUnread && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#00C853] ring-2 ring-[#161616]" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white truncate">{conv.userName}</h4>
                      <span className="text-[10px] text-[#777777]">
                        {new Date(conv.lastMessageAt || conv.updatedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#8A8A8A] truncate mt-0.5">
                      {conv.lastMessage || 'Started conversation'}
                    </p>
                  </div>

                  {/* Unread WhatsApp-Style Badge */}
                  {hasUnread && (
                    <div className="shrink-0 min-w-[20px] h-[20px] px-1.5 rounded-full bg-[#00C853] text-black text-[11px] font-black flex items-center justify-center shadow-lg shadow-[#00C853]/30 animate-pulse">
                      {conv.unreadAdminCount}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Chat Thread Area */}
      {selectedConv ? (
        <div className="flex-1 flex flex-col bg-[#0F0F0F] min-w-0">
          {/* Thread Header */}
          <div className="p-4 bg-[#141414] border-b border-[#222222] flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#222222] border border-[#333333] flex items-center justify-center font-bold text-[#00C853] text-sm">
                {selectedConv.userName.charAt(0)}
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white flex items-center space-x-2">
                  <span>{selectedConv.userName}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00C853]/20 text-[#00C853]">
                    KYC Verified
                  </span>
                </h3>
                <div className="text-xs text-[#8A8A8A]">{selectedConv.userEmail}</div>
              </div>
            </div>

            <div className="hidden sm:flex items-center space-x-4 text-xs text-[#8A8A8A]">
              <div className="flex items-center space-x-1.5 bg-[#1C1C1C] px-3 py-1.5 rounded-xl border border-[#2A2A2A]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00C853]" />
                <span className="text-white font-medium">Priority Institutional Desk</span>
              </div>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#0A0A0A]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-[#666666]">
                Loading conversation stream...
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[#666666] space-y-2">
                <Sparkles className="w-8 h-8 text-[#00C853]/40" />
                <p className="text-xs">No message history yet for this customer.</p>
              </div>
            ) : (
              messages.map((m) => {
                const isSupport = m.senderRole === 'support' || m.senderRole === 'admin';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isSupport ? 'items-end' : 'items-start'}`}
                  >
                    <div className="text-[10px] text-[#666666] mb-1 px-1">
                      {isSupport ? 'Support Agent' : selectedConv.userName}
                    </div>
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                        isSupport
                          ? 'bg-[#00C853] text-black font-semibold rounded-br-none shadow-md'
                          : 'bg-[#181818] text-white border border-[#2B2B2B] rounded-bl-none shadow-md'
                      }`}
                    >
                      {m.content}
                    </div>
                    <div className="flex items-center space-x-1 mt-1 px-1 text-[10px] text-[#666666]">
                      <span>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isSupport && (
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

          {/* Quick Reply Bar */}
          <div className="px-4 py-2 bg-[#121212] border-t border-[#202020] flex space-x-2 overflow-x-auto no-scrollbar">
            {[
              'Your deposit has been verified and credited.',
              'Withdrawal request is being processed now.',
              'Please provide your 12-digit UTR receipt number.',
              'Thank you for reaching Apex Support. Have a great day!'
            ].map((quick) => (
              <button
                key={quick}
                onClick={() => setInputText(quick)}
                className="shrink-0 px-3 py-1 rounded-lg bg-[#1C1C1C] hover:bg-[#252525] text-[11px] text-[#AAAAAA] hover:text-white transition-colors"
              >
                {quick}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendReply} className="p-4 bg-[#141414] border-t border-[#222222] flex items-center space-x-3">
            <input
              type="text"
              placeholder="Reply to customer..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-[#1C1C1C] border border-[#2B2B2B] focus:border-[#00C853] rounded-2xl px-4 py-3 text-xs sm:text-sm text-white outline-none"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="py-3 px-5 rounded-2xl bg-[#00C853] hover:bg-[#00E676] text-black font-extrabold text-xs sm:text-sm flex items-center space-x-2 transition-all cursor-pointer shadow-lg shadow-[#00C853]/20 disabled:opacity-40"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center p-8 text-[#666666] text-xs">
          Select a customer from the left sidebar to open the chat thread.
        </div>
      )}
    </div>
  );
};
