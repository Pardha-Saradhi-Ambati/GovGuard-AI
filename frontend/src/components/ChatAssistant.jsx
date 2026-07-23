import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Trash2, Copy, Sparkles, AlertCircle } from 'lucide-react';
import axios from 'axios';

const ChatAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem('govguard_chat_history');
    return saved ? JSON.parse(saved) : [
      {
        id: 'welcome',
        role: 'assistant',
        content: `### Welcome to GovGuard AI Assistant
I am your **Fraud Intelligence Assistant**. I can help you query dashboard statistics, explain risk factors, summarize investigations, and review alerts. 

How can I assist you with your audit desk duties today?`
      }
    ];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);

  // Save chat history
  useEffect(() => {
    sessionStorage.setItem('govguard_chat_history', JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await axios.post('/api/chat', { message: text });
      
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.data.answer
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat failed:', err);
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: 'AI Assistant is temporarily unavailable.'
      };
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    const welcomeMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `### Welcome to GovGuard AI Assistant
I am your **Fraud Intelligence Assistant**. I can help you query dashboard statistics, explain risk factors, summarize investigations, and review alerts. 

How can I assist you with your audit desk duties today?`
    };
    setMessages([welcomeMessage]);
    sessionStorage.removeItem('govguard_chat_history');
    setError(null);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Custom markdown formatter to parse bold, lists, headers and code
  const formatMessageContent = (text) => {
    if (!text) return '';
    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks
    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-950/80 p-2.5 rounded border border-gov-blue/20 text-xs font-mono my-2.5 overflow-x-auto text-emerald-400">$1</pre>');
    // Inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-slate-900/40 px-1 py-0.5 rounded font-mono text-[11px] text-gov-gold font-semibold">$1</code>');
    // Bold
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Headers (H3/H4)
    formatted = formatted.replace(/^###\s*(.+)$/gm, '<h4 class="font-extrabold text-slate-100 text-sm tracking-wide mt-3 mb-1 uppercase text-gov-gold">$1</h4>');
    formatted = formatted.replace(/^##\s*(.+)$/gm, '<h3 class="font-black text-slate-100 text-base tracking-wide mt-4 mb-2 border-b border-gov-blue/20 pb-0.5 uppercase text-gov-gold">$1</h3>');
    // Lists
    formatted = formatted.replace(/^\s*-\s+(.+)$/gm, '<li class="ml-4 list-disc text-slate-300 my-1">$1</li>');
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br />');

    return formatted;
  };

  const suggestedQuestions = [
    'Why was this record flagged?',
    'Summarize open investigations.',
    'Show high risk departments.',
    'Explain today\'s fraud alerts.',
    'Explain confidence score.'
  ];

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-gov-gold text-slate-950 hover:bg-gov-gold/90 transition-all shadow-lg hover:shadow-gov-gold/25 focus:outline-none z-50 flex items-center justify-center border border-gov-gold/40 cursor-pointer animate-pulse"
        title="Open Fraud Intelligence Assistant"
      >
        {isOpen ? <X size={22} /> : <Bot size={22} />}
      </button>

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[550px] z-50 flex flex-col glass-panel rounded-lg border border-gov-blue/20 bg-gov-slate/95 backdrop-blur-md shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gov-blue/25 bg-gov-navy/60">
            <div className="flex items-center space-x-2">
              <div className="p-1 rounded-full bg-gov-gold/15 text-gov-gold border border-gov-gold/20">
                <Bot size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-slate-200 uppercase tracking-wider">GovGuard AI Assistant</h3>
                <p className="text-[10px] text-emerald-400 font-semibold tracking-widest flex items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1 animate-ping"></span>
                  ONLINE
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <button 
                onClick={clearChat}
                className="p-1 text-slate-400 hover:text-gov-crimson rounded hover:bg-gov-blue/15 transition-colors"
                title="Clear Conversation"
              >
                <Trash2 size={15} />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-gov-blue/15 transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages List Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div key={m.id} className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[85%] rounded p-3 text-xs relative group ${
                    isAssistant 
                      ? 'bg-gov-navy/40 border border-gov-blue/10 text-slate-300' 
                      : 'bg-gov-accent/20 border border-gov-accent/25 text-slate-200'
                  }`}>
                    {/* Message Content formatted as HTML */}
                    <div 
                      dangerouslySetInnerHTML={{ __html: formatMessageContent(m.content) }} 
                      className="leading-relaxed break-words"
                    />

                    {/* Quick actions for Assistant messages */}
                    {isAssistant && m.content !== 'AI Assistant is temporarily unavailable.' && (
                      <button
                        onClick={() => copyToClipboard(m.content)}
                        className="absolute -top-2.5 -right-2 p-1 rounded bg-slate-900 border border-gov-blue/20 text-slate-400 hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Copy Answer"
                      >
                        <Copy size={10} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gov-navy/40 border border-gov-blue/10 rounded p-3 text-xs flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-gov-gold animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-gov-gold animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-gov-gold animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                  <span className="text-[10px] text-slate-400 tracking-wider">Evaluating Desk Data...</span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestions Shelf */}
          {messages.length === 1 && !loading && (
            <div className="px-4 py-2 border-t border-gov-blue/15 bg-gov-navy/20">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
                <Sparkles size={10} className="mr-1 text-gov-gold" /> Suggested Enquiries:
              </p>
              <div className="flex flex-wrap gap-1">
                {suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSendMessage(q)}
                    className="text-[10px] px-2 py-1 rounded bg-gov-blue/10 hover:bg-gov-blue/20 text-gov-accent border border-gov-blue/20 transition-all font-medium text-left cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message Input Form */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="p-3 border-t border-gov-blue/25 bg-gov-navy/35 flex items-center space-x-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about risk stats, case summaries..."
              className="flex-1 glass-input text-xs focus:border-gov-accent h-9"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 rounded bg-gov-gold text-slate-950 hover:bg-gov-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer border border-gov-gold/30"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;
