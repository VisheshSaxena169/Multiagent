


import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Bot, User, Loader2, Code, FileText, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../api/axios';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ChatAgent = ({ threadId }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  const [activeAgent, setActiveAgent] = useState('auto'); // 'auto', 'chat', 'code', 'pdf'
  const messagesEndRef = useRef(null);
  const [previewCode, setPreviewCode] = useState(null);

  // 1. Clear messages whenever a new threadId is received
  useEffect(() => {
    setMessages([]);
    setInput('');
  }, [threadId]);

  // 2. Fetch history and clear screen whenever threadId changes
  useEffect(() => {
    const loadPastMessages = async () => {
      try {
        const { data } = await api.get(`/ai/history/${threadId}`);

        if (data.success && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          setMessages([]); // New blank thread
        }
      } catch (error) {
        console.error('Failed to load history:', error);
        setMessages([]);
      }
    };

    loadPastMessages();
    setInput('');
  }, [threadId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    // Prepend agent instruction if a specific agent is manually selected
    let finalPrompt = input.trim();
    if (activeAgent === 'pdf') finalPrompt = `[PDF INSTRUCTION: Generate a PDF for the following] ${finalPrompt}`;
    if (activeAgent === 'code') finalPrompt = `[CODE INSTRUCTION: Write code for the following] ${finalPrompt}`;

    const userMessage = input.trim();
    setInput('');
    setIsStreaming(true);

    setMessages(prev => [
      ...prev,
      { role: 'user', content: userMessage },
      { role: 'ai', content: '' }
    ]);

    try {
      // Force token refresh if expired
      await api.get('/auth/api/user/profile');

      const response = await fetch('http://localhost:3000/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ prompt: finalPrompt, threadId })
      });

      if (!response.ok) {
        if (response.status === 401) throw new Error("Session expired. Please refresh.");
        throw new Error('Network response was not ok');
      }

      // Setup the reader
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkString = decoder.decode(value, { stream: true });
        const events = chunkString.split('\n\n');

        for (const event of events) {
          if (event.startsWith('data: ')) {
            const dataStr = event.replace('data: ', '').trim();

            if (dataStr === '[DONE]') {
              setIsStreaming(false);
              break;
            }

            if (dataStr) {
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.chunk) {
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastIndex = newMessages.length - 1;

                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      content: newMessages[lastIndex].content + parsed.chunk
                    };

                    return newMessages;
                  });
                }
              } catch (err) {
                // console.error("Stream parse error", err);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error.message || "Failed to send message");
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#212121]">

      {/* LEFT COLUMN: Chat Area - ADDED min-w-0 FIX */}
      <div className={`relative flex flex-col h-full min-w-0 transition-all duration-300 ${previewCode ? 'w-1/2 border-r border-white/10' : 'w-full'}`}>

        {/* Top Header: Agent Selection */}
        <div className="w-full flex items-center justify-center p-3 border-b border-white/10 bg-[#212121] sticky top-0 z-10 shrink-0">
          <div className="flex bg-[#171717] rounded-lg p-1 border border-white/10 flex-wrap justify-center">
            <button
              onClick={() => setActiveAgent('auto')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeAgent === 'auto' ? 'bg-[#212121] text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              <Sparkles className="w-4 h-4" /> Auto
            </button>
            <button
              onClick={() => setActiveAgent('code')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeAgent === 'code' ? 'bg-[#212121] text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              <Code className="w-4 h-4" /> Code
            </button>
            <button
              onClick={() => setActiveAgent('pdf')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeAgent === 'pdf' ? 'bg-[#212121] text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="max-w-3xl mx-auto flex flex-col space-y-6 pb-24 mt-8">

            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center text-gray-500 mt-20">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                  <Bot className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-300 mb-2 text-center">How can I help you today??????</h2>
                <p className="text-sm text-center">Select an agent above or let the Supervisor decide.</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start max-w-[95%] sm:max-w-[85%] min-w-0 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'user' ? 'bg-blue-600 ml-4' : 'bg-green-600 mr-4'}`}>
                    {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                  </div>

                  {/* Message Bubble - ADDED overflow-x-auto and break-words FIX */}
                  <div className={`p-4 rounded-2xl min-w-0 overflow-x-auto ${msg.role === 'user' ? 'bg-[#2f2f2f] text-gray-100 rounded-tr-none' : 'text-gray-200 w-full'}`}>

                    {msg.role === 'ai' && isStreaming && msg.content === '' && idx === messages.length - 1 ? (
                      <div className="flex items-center gap-3 h-6 text-gray-400">
                        <Sparkles className="w-5 h-5 text-blue-400 animate-spin" style={{ animationDuration: '3s' }} />
                        <span className="text-sm font-medium animate-pulse">Agent working...</span>
                      </div>
                    ) : (
                      <>
                        <div className="prose prose-invert max-w-none break-words min-w-0">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code({ node, inline, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '');
                                const codeString = String(children).replace(/\n$/, '');

                                return !inline && match ? (
                                  <div className="rounded-md overflow-hidden my-4 border border-white/10 w-full min-w-0">
                                    <div className="bg-black/40 text-gray-400 text-xs px-4 py-2 border-b border-white/10 flex justify-between items-center">
                                      <span>{match[1]}</span>
                                      {match[1] === 'html' && (
                                        <button
                                          onClick={() => setPreviewCode(codeString)}
                                          className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded shadow transition-colors flex items-center gap-1 shrink-0"
                                        >
                                          ▶ Live Preview
                                        </button>
                                      )}
                                    </div>
                                    <SyntaxHighlighter
                                      style={vscDarkPlus}
                                      language={match[1]}
                                      PreTag="div"
                                      customStyle={{ margin: 0, padding: '1rem', background: 'transparent', overflowX: 'auto' }}
                                      {...props}
                                    >
                                      {codeString}
                                    </SyntaxHighlighter>
                                  </div>
                                ) : (
                                  <code className="bg-white/10 text-pink-300 px-1.5 py-0.5 rounded text-sm font-mono break-all" {...props}>
                                    {children}
                                  </code>
                                );
                              }
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                        {msg.role === 'ai' && isStreaming && idx === messages.length - 1 && (
                          <span className="inline-block w-2 h-4 bg-gray-400 ml-1 animate-pulse mt-1" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#212121] via-[#212121] to-transparent pt-6 pb-6 px-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSend} className="relative flex items-end bg-[#2f2f2f] rounded-2xl border border-white/10 shadow-lg overflow-hidden">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isStreaming}
                placeholder={isStreaming ? "Generating response..." : "Message Workspace AI..."}
                className="w-full bg-transparent text-white py-4 pl-4 pr-12 focus:outline-none resize-none max-h-32 disabled:opacity-50"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="absolute right-3 bottom-3 p-1.5 bg-white text-black hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-30 disabled:bg-gray-500 disabled:text-gray-300"
              >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
            <div className="text-center text-xs text-gray-500 mt-3">
              AI can make mistakes. Verify important information.
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Live Preview Panel - ADDED min-w-0 FIX */}
      {previewCode && (
        <div className="w-1/2 h-full flex flex-col bg-white border-l border-gray-300 min-w-0">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-100 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Code className="w-4 h-4 text-gray-600 shrink-0" />
              <span className="text-sm font-semibold text-gray-800 truncate">Live Preview</span>
            </div>
            <button
              onClick={() => setPreviewCode(null)}
              className="text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors shrink-0"
            >
              Close
            </button>
          </div>

          <iframe
            className="w-full flex-1 border-none bg-white"
            srcDoc={previewCode}
            sandbox="allow-scripts allow-modals allow-forms allow-popups"
            title="Live Preview"
          />
        </div>
      )}

    </div>
  );
};

export default ChatAgent;