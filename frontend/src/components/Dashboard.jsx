



import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid'; 
import { LogOut, User as UserIcon, Plus, MessageSquare, MoreHorizontal, Pencil, Trash2, Check, X, Menu } from 'lucide-react';import { useDispatch, useSelector } from 'react-redux';
import { setProfile, logoutSuccess, setLoading } from '../store/authSlice';
import api from '../api/axios';
import Loader from './Loder';
import ChatAgent from './ChatAgent';

const Dashboard = () => {
  const dispatch = useDispatch();
  const profile = useSelector((state) => state.auth.user);
  const isLoading = useSelector((state) => state.auth.isLoading);
  
  // States for Active Thread and History
  const [activeThreadId, setActiveThreadId] = useState(() => uuidv4());
  const [historyList, setHistoryList] = useState([]);

  // States for Dropdown Menu & Editing
  const [dropdownOpenId, setDropdownOpenId] = useState(null);
  const [editingThreadId, setEditingThreadId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
// State for Sidebar Toggle
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleNewChat = () => {
    setActiveThreadId(uuidv4());
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await api.get('/ai/history');
        if (data.success) {
          setHistoryList(data.threads);
        }
      } catch (error) {
        console.error("Failed to load history");
      }
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get('/auth/api/user/profile');
        dispatch(setProfile(data));
      } catch (error) {
        if (error.response?.status === 401) dispatch(logoutSuccess());
      } finally {
        dispatch(setLoading(false));
      }
    };
    if (!profile) fetchProfile();
  }, [dispatch, profile]);

  const handleLogout = async () => {
    dispatch(setLoading(true));
    try {
      await api.post('/auth/api/user/logout');
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      dispatch(logoutSuccess());
      dispatch(setLoading(false));
    }
  };

  // --- CRUD Functions for Chat History ---
  const handleDeleteChat = async (threadId, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/ai/history/${threadId}`);
      // Remove from UI instantly
      setHistoryList((prev) => prev.filter((t) => t.threadId !== threadId));
      // If we deleted the chat we are currently looking at, start a new chat
      if (activeThreadId === threadId) {
        handleNewChat();
      }
      setDropdownOpenId(null);
    } catch (error) {
      console.error("Failed to delete chat");
    }
  };

  const startEditing = (thread, e) => {
    e.stopPropagation();
    setEditingThreadId(thread.threadId);
    setEditTitle(thread.title);
    setDropdownOpenId(null); // Close the dropdown menu
  };

  const saveEdit = async (threadId, e) => {
    if (e) e.stopPropagation();
    if (!editTitle.trim()) return cancelEdit();
    
    try {
      await api.put(`/ai/history/${threadId}`, { title: editTitle });
      // Update UI instantly
      setHistoryList((prev) => 
        prev.map((t) => (t.threadId === threadId ? { ...t, title: editTitle } : t))
      );
      setEditingThreadId(null);
    } catch (error) {
      console.error("Failed to rename chat");
    }
  };

  const cancelEdit = (e) => {
    if (e) e.stopPropagation();
    setEditingThreadId(null);
    setEditTitle("");
  };

  if (isLoading || !profile) return <Loader />;

  return (
    <div className="flex h-screen bg-[#212121] text-white font-sans overflow-hidden">
      
      {/* LEFT SIDEBAR (Animated Width) */}
      <aside className={`bg-[#171717] flex flex-col justify-between flex-shrink-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-[260px]' : 'w-0'}`}>
        
        {/* Inner container with fixed width prevents content from squishing during animation */}
        <div className="w-[260px] flex flex-col h-full overflow-hidden">
          {/* Top: New Chat & History */}
          <div className="p-3 flex flex-col gap-4 overflow-y-auto custom-scrollbar pb-32"> 
            
            {/* TOGGLE BUTTON & NEW CHAT */}
            <div className="flex gap-2">
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-3 flex items-center justify-center bg-transparent hover:bg-white/10 border border-white/20 rounded-md text-gray-400 hover:text-white transition-colors"
                title="Close sidebar"
              >
                <Menu className="w-4 h-4 shrink-0" />
              </button>
              <button 
                onClick={handleNewChat}
                className="flex-1 flex items-center gap-2 p-3 bg-transparent hover:bg-white/10 border border-white/20 rounded-md text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4 shrink-0" />
                New chat
              </button>
            </div>

            {/* Dynamic Chat History */}
            <div className="flex flex-col gap-1 mt-2">
              <span className="text-xs font-semibold text-gray-500 px-2 pb-1">Previous Chats</span>
              
              {historyList.map((thread) => (
                <div 
                  key={thread.threadId}
                  className={`relative group flex items-center justify-between p-2 rounded-md text-sm transition-colors ${activeThreadId === thread.threadId ? 'bg-white/20 text-white' : 'hover:bg-white/10 text-gray-300'}`}
                >
                  {/* Left Side: Title OR Inline Edit Input */}
                  {editingThreadId === thread.threadId ? (
                    <div className="flex items-center gap-2 w-full">
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <input 
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(thread.threadId);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        className="flex-1 bg-black/50 border border-purple-500 rounded px-1 py-0.5 outline-none text-white text-sm min-w-0"
                      />
                      <button onClick={(e) => saveEdit(thread.threadId, e)} className="p-1 hover:text-green-400 shrink-0">
                        <Check className="w-3 h-3" />
                      </button>
                      <button onClick={cancelEdit} className="p-1 hover:text-red-400 shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setActiveThreadId(thread.threadId)}
                      className="flex items-center gap-2 flex-1 overflow-hidden text-left"
                    >
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span className="truncate">{thread.title}</span>
                    </button>
                  )}

                  {/* Right Side: 3-Dots Dropdown Menu */}
                  {!editingThreadId && (
                    <div className={`relative shrink-0 ${activeThreadId === thread.threadId || dropdownOpenId === thread.threadId ? 'block' : 'hidden group-hover:block'}`}>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setDropdownOpenId(dropdownOpenId === thread.threadId ? null : thread.threadId); 
                        }}
                        className="p-1 hover:bg-white/20 rounded text-gray-400 hover:text-white transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* The Dropdown Menu */}
                      {dropdownOpenId === thread.threadId && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={(e) => { e.stopPropagation(); setDropdownOpenId(null); }}
                          ></div>
                          
                          <div className="absolute right-0 top-full mt-1 w-32 bg-[#2f2f2f] border border-white/10 rounded-md shadow-xl z-50 py-1 text-gray-200">                          
                            <button 
                              onClick={(e) => startEditing(thread, e)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 flex items-center gap-2"
                            >
                              <Pencil className="w-3 h-3" /> Rename
                            </button>
                            <button 
                              onClick={(e) => handleDeleteChat(thread.threadId, e)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-red-500/20 text-red-400 flex items-center gap-2"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: Profile & Logout */}
          <div className="p-3 border-t border-white/10">
            <div className="flex items-center justify-between p-2 hover:bg-white/10 rounded-md cursor-pointer transition-colors group">
              <div className="flex items-center gap-3 overflow-hidden">
                {profile.picture ? (
                  <img src={profile.picture} alt="Profile" className="w-8 h-8 rounded-full shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4 text-purple-400" />
                  </div>
                )}
                <div className="flex flex-col truncate">
                  <span className="text-sm font-medium truncate text-gray-200">{profile.name || profile.data?.name}</span>
                  <span className="text-xs text-gray-500 truncate">Active Session</span>
                </div>
              </div>
              <button 
                onClick={handleLogout} 
                className="text-gray-500 hover:text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Logout"
              >
                <LogOut className="w-4 h-4 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN AREA: Chat Interface */}
      <main className="relative flex-1 flex flex-col min-w-0 bg-[#212121]">
        
        {/* Floating Menu Button (Shows only when sidebar is closed) */}
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-50 p-2 bg-transparent hover:bg-white/10 border border-white/10 rounded-md text-gray-400 hover:text-white transition-colors"
            title="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <ChatAgent threadId={activeThreadId} />
      </main>

    </div>
  );
};

export default Dashboard;