import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Search, 
  MessageSquare, 
  User, 
  UserPlus, 
  MoreVertical, 
  Phone, 
  Video, 
  Paperclip, 
  X, 
  Loader2,
  Inbox,
  Clock,
  Shield,
  Building2,
  Check,
  CheckCheck,
  Users,
  Megaphone,
  Radio,
  ArrowLeft,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  db, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  doc, 
  getDocs,
  setDoc,
  getDoc,
  deleteDoc,
  limitToLast
} from '../../../api/firebase';
import { UserProfile, UserRole } from '../../types';
import { cn } from '../../lib/utils';
import { User as FirebaseUser } from 'firebase/auth';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  readBy: string[];
  type: 'text' | 'image' | 'file';
}

interface Conversation {
  id: string;
  participants: string[];
  type: 'DIRECT' | 'GROUP' | 'SUPPORT' | 'CHANNEL';
  lastMessage?: string;
  lastMessageAt?: number;
  lastMessageSenderId?: string;
  lastMessageSenderName?: string;
  title?: string;
  updatedAt: number;
}

interface KChatModuleProps {
  user: FirebaseUser;
  profile: UserProfile | null;
}

export function KChatModule({ user, profile }: KChatModuleProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messageLimit, setMessageLimit] = useState<number | null>(30);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [viewMode, setViewMode] = useState<'CHAT' | 'MANAGE'>('CHAT');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  // Close options menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) {
        setShowOptions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync users for contact discovery
  useEffect(() => {
    if (!profile) return;
    const q = collection(db, 'users');
    const unsub = onSnapshot(q, (snap) => {
      const users = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
      setAllUsers(users);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users', user));
    return () => unsub();
  }, [profile]);

  // Sync conversations
  useEffect(() => {
    if (!profile) return;
    
    // Admins see all conversations, users see only theirs
    let q;
    const isKontrolAdmin = ['ADMINISTRATEUR_ERP', 'GESTIONNAIRE_ERP', 'ADMINISTRATEUR_KONTROL', 'GESTIONNAIRE_KONTROL', 'ADMIN'].includes(profile.role);
    
    if (isKontrolAdmin) {
      q = query(collection(db, 'conversations'), orderBy('updatedAt', 'desc'));
    } else {
      q = query(
        collection(db, 'conversations'), 
        where('participants', 'array-contains', user.uid),
        orderBy('updatedAt', 'desc')
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      const convs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
      setConversations(convs);
      setLoading(false);
    }, (err) => {
      console.error("Chat sync error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [profile, user.uid]);

  // Sync messages for active conversation
  useEffect(() => {
    if (!activeConversation) return;

    let q;
    if (messageLimit) {
      q = query(
        collection(db, 'messages'),
        where('conversationId', '==', activeConversation.id),
        orderBy('timestamp', 'asc'),
        limitToLast(messageLimit)
      );
    } else {
      q = query(
        collection(db, 'messages'),
        where('conversationId', '==', activeConversation.id),
        orderBy('timestamp', 'asc')
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'messages', user));

    return () => unsub();
  }, [activeConversation, messageLimit]);

  // Mark messages as read
  useEffect(() => {
    if (!activeConversation) return;
    setMessageLimit(30);
    setIsExpanded(false);
  }, [activeConversation?.id]);

  useEffect(() => {
    if (!activeConversation || messages.length === 0 || !user.uid) return;
    
    const unreadMessages = messages.filter(m => !m.readBy?.includes(user.uid));
    
    if (unreadMessages.length > 0) {
      unreadMessages.forEach(async (msg) => {
        try {
          const msgRef = doc(db, 'messages', msg.id);
          const updatedReadBy = Array.from(new Set([...(msg.readBy || []), user.uid]));
          await updateDoc(msgRef, {
            readBy: updatedReadBy
          });
        } catch (e) {
          console.error("Error marking message as read:", e);
        }
      });
    }
  }, [messages, activeConversation, user.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || !profile) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    try {
      const msgData = {
        conversationId: activeConversation.id,
        senderId: user.uid,
        senderName: profile.displayName || profile.email,
        content: msgText,
        timestamp: Date.now(),
        type: 'text',
        readBy: [user.uid]
      };

      await addDoc(collection(db, 'messages'), msgData);
      
      await updateDoc(doc(db, 'conversations', activeConversation.id), {
        lastMessage: msgText,
        lastMessageAt: Date.now(),
        lastMessageSenderId: user.uid,
        lastMessageSenderName: profile.displayName || profile.email,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error("Send message error:", error);
    }
  };

  const isKontrolAdmin = profile ? ['ADMINISTRATEUR_ERP', 'GESTIONNAIRE_ERP', 'ADMINISTRATEUR_KONTROL', 'GESTIONNAIRE_KONTROL', 'ADMIN'].includes(profile.role) : false;

  const getOtherParticipant = (participants: string[]) => {
    if (!participants || !Array.isArray(participants)) return undefined;
    const otherId = participants.find(p => p !== user.uid);
    return allUsers.find(u => u.uid === otherId);
  };

  const startConversation = async (otherUser: UserProfile) => {
    if (!profile) return;
    const existing = conversations.find(c => 
      c.type === 'DIRECT' && 
      c.participants?.includes(otherUser.uid) && 
      c.participants?.includes(user.uid)
    );
    if (existing) {
      setActiveConversation(existing);
      setIsSearching(false);
      setShowMobileChat(true);
      return;
    }
    try {
      const convData = {
        participants: [user.uid, otherUser.uid],
        type: 'DIRECT' as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        title: otherUser.displayName
      };
      const docRef = await addDoc(collection(db, 'conversations'), convData);
      setActiveConversation({ id: docRef.id, ...convData });
      setIsSearching(false);
      setShowMobileChat(true);
    } catch (error) {
      console.error("Start conversation error:", error);
    }
  };

  const filteredConversations = conversations.filter(c => {
    const other = getOtherParticipant(c.participants);
    if (c.type === 'GROUP') {
      return c.title?.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return other?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
           other?.email?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const createGroup = async () => {
    if (!profile || selectedParticipants.length === 0) return;
    try {
      const finalParticipants = Array.from(new Set([...selectedParticipants, user.uid]));
      const convData = {
        participants: finalParticipants,
        type: 'GROUP' as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        title: groupTitle || "Nouveau Groupe",
        lastMessage: "Groupe créé",
        lastMessageAt: Date.now(),
        lastMessageSenderId: user.uid
      };
      const docRef = await addDoc(collection(db, 'conversations'), convData);
      setActiveConversation({ id: docRef.id, ...convData });
      setIsCreatingGroup(false);
      setSelectedParticipants([]);
      setGroupTitle('');
      setShowMobileChat(true);
    } catch (error) {
      console.error("Create group error:", error);
    }
  };

  const createChannel = async () => {
    if (!profile || !groupTitle.trim()) return;
    try {
      // Channels might include everyone in the company by default or be opt-in
      // For now, let's just make it a group but with 'CHANNEL' type
      const finalParticipants = Array.from(new Set([...selectedParticipants, user.uid]));
      const convData = {
        participants: finalParticipants,
        type: 'CHANNEL' as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        title: groupTitle,
        lastMessage: "Canal de diffusion créé",
        lastMessageAt: Date.now(),
        lastMessageSenderId: user.uid
      };
      const docRef = await addDoc(collection(db, 'conversations'), convData);
      setActiveConversation({ id: docRef.id, ...convData });
      setIsCreatingChannel(false);
      setSelectedParticipants([]);
      setGroupTitle('');
      setShowMobileChat(true);
    } catch (error) {
      console.error("Create channel error:", error);
    }
  };

  const toggleParticipant = (uid: string) => {
    setSelectedParticipants(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const deleteConversation = async (convId: string) => {
    try {
      setDeletingId(convId);
      await deleteDoc(doc(db, 'conversations', convId));
      
      const msgsQuery = query(collection(db, 'messages'), where('conversationId', '==', convId));
      const msgsSnap = await getDocs(msgsQuery);
      for (const m of msgsSnap.docs) {
        await deleteDoc(doc(db, 'messages', m.id));
      }

      if (activeConversation?.id === convId) {
        setActiveConversation(null);
        setShowMobileChat(false);
      }
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const paginatedConversations = conversations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(conversations.length / itemsPerPage);

  const resetViews = () => {
    setIsSearching(false);
    setIsCreatingGroup(false);
    setIsCreatingChannel(false);
    setShowMobileChat(false);
    setViewMode('CHAT');
    setIsExpanded(false);
  };

  const clearChat = async () => {
    if (!activeConversation) return;
    if (confirm("Voulez-vous vraiment vider cette discussion ?")) {
      try {
        const q = query(collection(db, 'messages'), where('conversationId', '==', activeConversation.id));
        const snap = await getDocs(q);
        // In a real app we'd delete them, but for this demo let's just alert
        alert("Action non disponible dans cette version de démonstration (gestion des messages)");
      } catch (e) {
        console.error(e);
      }
    }
  };

  const searchContacts = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }
    const results = allUsers.filter(u => 
      u.uid !== user.uid && 
      (u.displayName?.toLowerCase().includes(term.toLowerCase()) || 
       u.email?.toLowerCase().includes(term.toLowerCase()))
    );
    setSearchResults(results);
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-[2rem] border border-kontrol-border overflow-hidden shadow-sm relative">
      {/* Sidebar */}
      <div className={cn(
        "w-full md:w-80 border-r border-kontrol-border flex flex-col bg-kontrol-bg/30 transition-all",
        isExpanded ? "hidden" : (showMobileChat || viewMode === 'MANAGE') ? "hidden md:flex" : "flex"
      )}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-kontrol-dark tracking-tight">K-Chat</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setViewMode(viewMode === 'MANAGE' ? 'CHAT' : 'MANAGE')}
                className={cn(
                  "p-2 bg-white border border-kontrol-border rounded-xl transition-all shadow-sm",
                  viewMode === 'MANAGE' ? "bg-kontrol-blue text-white" : "text-kontrol-blue hover:bg-kontrol-blue hover:text-white"
                )}
                title="Gérer les discussions"
              >
                <Shield size={18} />
              </button>
              <button 
                onClick={() => {
                  setIsCreatingChannel(true);
                  setIsCreatingGroup(false);
                  setIsSearching(false);
                  setViewMode('CHAT');
                }}
                className="p-2 bg-white border border-kontrol-border rounded-xl text-kontrol-blue hover:bg-kontrol-blue hover:text-white transition-all shadow-sm"
                title="Nouveau Canal"
              >
                <Megaphone size={18} />
              </button>
              <button 
                onClick={() => {
                  setIsCreatingGroup(true);
                  setIsCreatingChannel(false);
                  setIsSearching(false);
                }}
                className="p-2 bg-white border border-kontrol-border rounded-xl text-kontrol-blue hover:bg-kontrol-blue hover:text-white transition-all shadow-sm"
                title="Nouveau Groupe"
              >
                <Users size={18} />
              </button>
              <button 
                onClick={() => {
                  setIsSearching(!isSearching);
                  setIsCreatingGroup(false);
                  setIsCreatingChannel(false);
                }}
                className="p-2 bg-white border border-kontrol-border rounded-xl text-kontrol-blue hover:bg-kontrol-blue hover:text-white transition-all shadow-sm"
                title="Nouveau Contact"
              >
                <UserPlus size={18} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-kontrol-ink-muted" size={16} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-kontrol-border rounded-xl text-xs outline-none focus:border-kontrol-blue"
              value={searchTerm}
              onChange={(e) => searchContacts(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-6 custom-scrollbar relative">
          {(isCreatingGroup || isCreatingChannel || isSearching) && (
            <button 
              onClick={resetViews}
              className="absolute top-2 right-2 p-2 bg-white border border-kontrol-border rounded-xl text-kontrol-ink-muted hover:text-rose-500 hover:border-rose-200 transition-all shadow-sm z-10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
            >
              <ArrowLeft size={14} /> Retour
            </button>
          )}

          {(isCreatingGroup || isCreatingChannel) ? (
            <div className="space-y-4">
              <div className="px-3 py-4 bg-white border border-kontrol-border rounded-2xl space-y-3">
                <p className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest">
                  {isCreatingChannel ? "Créer un canal" : "Créer un groupe"}
                </p>
                <input 
                  type="text" 
                  placeholder={isCreatingChannel ? "Nom du canal..." : "Nom du groupe..."}
                  className="w-full p-2 bg-kontrol-bg border-none rounded-lg text-xs outline-none focus:ring-1 focus:ring-kontrol-blue"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                />
                <button 
                  disabled={isCreatingChannel ? !groupTitle.trim() : selectedParticipants.length === 0}
                  onClick={isCreatingChannel ? createChannel : createGroup}
                  className="w-full py-2 bg-kontrol-blue text-white rounded-lg text-[10px] font-bold uppercase tracking-widest disabled:opacity-50"
                >
                  {isCreatingChannel ? "Créer le canal" : `Créer le groupe (${selectedParticipants.length})`}
                </button>
              </div>
              <div className="space-y-1">
                <p className="px-3 text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest mb-2">
                  {isCreatingChannel ? "Ajouter des abonnés" : "Sélectionner les participants"}
                </p>
                {allUsers.filter(u => u.uid !== user.uid).map(u => (
                  <button 
                    key={u.uid}
                    onClick={() => toggleParticipant(u.uid)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-2xl transition-all border",
                      selectedParticipants.includes(u.uid) ? "bg-kontrol-blue/5 border-kontrol-blue" : "border-transparent hover:bg-white"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-kontrol-blue/10 flex items-center justify-center text-kontrol-blue font-bold text-xs">
                      {u.displayName?.charAt(0) || u.email[0]}
                    </div>
                    <div className="text-left overflow-hidden flex-1">
                      <p className="text-[12px] font-bold text-kontrol-dark truncate">{u.displayName}</p>
                    </div>
                    {selectedParticipants.includes(u.uid) && <Check size={14} className="text-kontrol-blue" />}
                  </button>
                ))}
              </div>
            </div>
          ) : isSearching ? (
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest mb-2">Résultats de recherche</p>
              {searchResults.map(u => (
                <button 
                  key={u.uid}
                  onClick={() => startConversation(u)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white rounded-2xl transition-all group border border-transparent hover:border-kontrol-border"
                >
                  <div className="w-10 h-10 rounded-xl bg-kontrol-blue/10 flex items-center justify-center text-kontrol-blue font-bold">
                    {u.displayName?.charAt(0) || u.email[0]}
                  </div>
                  <div className="text-left overflow-hidden">
                    <p className="text-[13px] font-bold text-kontrol-dark truncate">{u.displayName || 'Utilisateur'}</p>
                    <p className="text-[11px] text-kontrol-ink-muted truncate">{u.email}</p>
                    {u.companyName && <p className="text-[9px] font-bold text-kontrol-blue uppercase tracking-tighter">{u.companyName}</p>}
                  </div>
                </button>
              ))}
              {searchResults.length === 0 && searchTerm && (
                <p className="px-3 text-[11px] text-kontrol-ink-muted italic">Aucun contact trouvé</p>
              )}
            </div>
          ) : (
            <div className="space-y-6 mt-6">
              {/* Solo Conversations */}
              {filteredConversations.some(c => c.type === 'DIRECT') && (
                <div className="space-y-1">
                  <p className="px-3 text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest mb-2 flex items-center gap-2">
                    <User size={12} /> Privées
                  </p>
                  {filteredConversations.filter(c => c.type === 'DIRECT').map(conv => {
                    const other = getOtherParticipant(conv.participants);
                    const isActive = activeConversation?.id === conv.id;
                    const unreadCount = messages.filter(m => m.conversationId === conv.id && !m.readBy?.includes(user.uid)).length;

                    return (
                      <div 
                        key={conv.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setActiveConversation(conv);
                          setShowMobileChat(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setActiveConversation(conv);
                            setShowMobileChat(true);
                          }
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-2xl transition-all border group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-kontrol-blue",
                          isActive ? "bg-white border-kontrol-blue shadow-lg shadow-kontrol-blue/5" : "bg-transparent border-transparent hover:bg-white/50 hover:border-kontrol-border"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0",
                          isActive ? "bg-kontrol-blue text-white" : "bg-kontrol-blue/10 text-kontrol-blue"
                        )}>
                          {other?.displayName?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn("text-[13px] font-bold truncate", isActive ? "text-kontrol-blue" : "text-kontrol-dark")}>
                              {other?.displayName || 'Inconnu'}
                            </p>
                            <div className="flex items-center gap-2">
                              {conv.lastMessageAt && (
                                <span className="text-[10px] text-kontrol-ink-muted whitespace-nowrap">
                                  {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(conv.id);
                                }}
                                className="md:opacity-0 md:group-hover:opacity-100 p-1 hover:text-rose-500 transition-all disabled:opacity-50"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-kontrol-ink-muted truncate italic flex items-center gap-2">
                            {conv.lastMessageSenderId === user.uid && <CheckCheck size={10} className="text-kontrol-blue" />}
                            {conv.lastMessageSenderId === user.uid && "Moi: "}
                            {conv.lastMessage || 'Nouvelle discussion'}
                          </p>
                        </div>
                        {unreadCount > 0 && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-rose-500/20">
                            {unreadCount}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Group Conversations */}
              {filteredConversations.some(c => c.type === 'GROUP') && (
                <div className="space-y-1">
                  <p className="px-3 text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Users size={12} /> Groupes
                  </p>
                  {filteredConversations.filter(c => c.type === 'GROUP').map(conv => {
                    const isActive = activeConversation?.id === conv.id;
                    const unreadCount = messages.filter(m => m.conversationId === conv.id && !m.readBy?.includes(user.uid)).length;

                    return (
                      <div 
                        key={conv.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setActiveConversation(conv);
                          setShowMobileChat(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setActiveConversation(conv);
                            setShowMobileChat(true);
                          }
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-2xl transition-all border group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-kontrol-blue",
                          isActive ? "bg-white border-kontrol-blue shadow-lg shadow-kontrol-blue/5" : "bg-transparent border-transparent hover:bg-white/50 hover:border-kontrol-border"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0",
                          isActive ? "bg-kontrol-blue text-white" : "bg-kontrol-blue/10 text-kontrol-blue"
                        )}>
                          <Users size={20} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn("text-[13px] font-bold truncate", isActive ? "text-kontrol-blue" : "text-kontrol-dark")}>
                              {conv.title}
                            </p>
                            <div className="flex items-center gap-2">
                              {conv.lastMessageAt && (
                                <span className="text-[10px] text-kontrol-ink-muted whitespace-nowrap">
                                  {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(conv.id);
                                }}
                                className="md:opacity-0 md:group-hover:opacity-100 p-1 hover:text-rose-500 transition-all disabled:opacity-50"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-kontrol-ink-muted truncate italic flex items-center gap-2">
                            {conv.lastMessageSenderId === user.uid ? (
                              <>
                                <CheckCheck size={10} className="text-kontrol-blue" />
                                <span>Moi: </span>
                              </>
                            ) : (
                              conv.lastMessageSenderName && <span>{conv.lastMessageSenderName}: </span>
                            )}
                            {conv.lastMessage || 'Nouvelle discussion'}
                          </p>
                        </div>
                        {unreadCount > 0 && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-rose-500/20">
                            {unreadCount}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Channels */}
              {filteredConversations.some(c => c.type === 'CHANNEL') && (
                <div className="space-y-1">
                  <p className="px-3 text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Megaphone size={12} /> Canaux
                  </p>
                  {filteredConversations.filter(c => c.type === 'CHANNEL').map(conv => {
                    const isActive = activeConversation?.id === conv.id;
                    const unreadCount = messages.filter(m => m.conversationId === conv.id && !m.readBy?.includes(user.uid)).length;

                    return (
                      <div 
                        key={conv.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setActiveConversation(conv);
                          setShowMobileChat(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            setActiveConversation(conv);
                            setShowMobileChat(true);
                          }
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-2xl transition-all border group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-kontrol-blue",
                          isActive ? "bg-white border-kontrol-blue shadow-lg shadow-kontrol-blue/5" : "bg-transparent border-transparent hover:bg-white/50 hover:border-kontrol-border"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0",
                          isActive ? "bg-kontrol-blue text-white" : "bg-kontrol-blue/10 text-kontrol-blue"
                        )}>
                          <Radio size={20} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between gap-2">
                            <p className={cn("text-[13px] font-bold truncate", isActive ? "text-kontrol-blue" : "text-kontrol-dark")}>
                              {conv.title}
                            </p>
                            <div className="flex items-center gap-2">
                              {conv.lastMessageAt && (
                                <span className="text-[10px] text-kontrol-ink-muted whitespace-nowrap">
                                  {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(conv.id);
                                }}
                                className="md:opacity-0 md:group-hover:opacity-100 p-1 hover:text-rose-500 transition-all disabled:opacity-50"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-kontrol-ink-muted truncate italic flex items-center gap-2">
                            <Radio size={10} className="text-kontrol-blue" />
                            {conv.lastMessageSenderId === user.uid ? "Moi: " : (conv.lastMessageSenderName ? `${conv.lastMessageSenderName}: ` : "")}
                            {conv.lastMessage || 'Nouveau canal'}
                          </p>
                        </div>
                        {unreadCount > 0 && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-rose-500/20">
                            {unreadCount}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {filteredConversations.length === 0 && (
                <div className="p-12 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-kontrol-bg flex items-center justify-center text-kontrol-ink-muted mx-auto">
                    <Inbox size={24} />
                  </div>
                  <p className="text-[11px] text-kontrol-ink-muted font-bold uppercase">Aucune discussion</p>
                </div>
              )}
            </div>
          )}

          {/* Mobile Floating Action Button */}
          <button 
            onClick={() => setIsSearching(true)}
            className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-kontrol-blue text-white rounded-2xl shadow-xl shadow-kontrol-blue/40 flex items-center justify-center z-50 active:scale-95 transition-all"
          >
            <Plus size={24} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Chat Area / Manage View */}
      <div className={cn(
        "flex-1 flex flex-col bg-white transition-all",
        (!showMobileChat && viewMode !== 'MANAGE') && "hidden md:flex"
      )}>
        {viewMode === 'MANAGE' ? (
          <div className="flex-1 flex flex-col bg-kontrol-bg/10 p-4 md:p-8 overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-black text-kontrol-dark tracking-tight">Gestion des Discussions</h2>
                <p className="text-[13px] text-kontrol-ink-muted">Supprimez, triez et gérez toutes vos conversations.</p>
              </div>
              <button 
                onClick={() => setViewMode('CHAT')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-kontrol-border rounded-xl text-[12px] font-bold text-kontrol-dark hover:bg-kontrol-dark hover:text-white transition-all shadow-sm"
              >
                <ArrowLeft size={16} /> Retour au Chat
              </button>
            </div>

            <div className="flex-1 bg-white border border-kontrol-border rounded-[2rem] shadow-xl overflow-hidden flex flex-col">
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-kontrol-border bg-kontrol-bg/20">
                      <th className="px-6 py-4 text-[10px] font-black text-kontrol-ink-muted uppercase tracking-[0.2em]">Sujet / Destinataire</th>
                      <th className="px-6 py-4 text-[10px] font-black text-kontrol-ink-muted uppercase tracking-[0.2em]">Type</th>
                      <th className="px-6 py-4 text-[10px] font-black text-kontrol-ink-muted uppercase tracking-[0.2em]">Dernière Act.</th>
                      <th className="px-6 py-4 text-[10px] font-black text-kontrol-ink-muted uppercase tracking-[0.2em]">Membres</th>
                      <th className="px-6 py-4 text-[10px] font-black text-kontrol-ink-muted uppercase tracking-[0.2em] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-kontrol-border">
                    {paginatedConversations.map(conv => {
                      const other = getOtherParticipant(conv.participants);
                      return (
                        <tr key={conv.id} className="group hover:bg-kontrol-bg/30 transition-all cursor-default">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-kontrol-blue/10 flex items-center justify-center text-kontrol-blue font-bold text-xs">
                                {conv.type === 'DIRECT' ? (other?.displayName?.charAt(0) || '?') : <Users size={14} />}
                              </div>
                              <span className="text-[13px] font-bold text-kontrol-dark">
                                {conv.type === 'DIRECT' ? (other?.displayName || 'Privé') : conv.title}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                              conv.type === 'DIRECT' ? "bg-kontrol-blue/10 text-kontrol-blue" :
                              conv.type === 'GROUP' ? "bg-emerald-100 text-emerald-700" :
                              "bg-amber-100 text-amber-700"
                            )}>
                              {conv.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[12px] text-kontrol-ink-muted font-mono">
                            {conv.updatedAt ? new Date(conv.updatedAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 text-[12px] text-kontrol-ink-muted font-bold">
                            {conv.participants?.length || 0}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button 
                                onClick={() => {
                                  setActiveConversation(conv);
                                  setViewMode('CHAT');
                                  setShowMobileChat(true);
                                }}
                                className="p-2 text-kontrol-blue hover:bg-kontrol-blue hover:text-white rounded-lg"
                                title="Ouvrir"
                              >
                                <MessageSquare size={16} />
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmId(conv.id)}
                                className="p-2 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all disabled:opacity-50"
                                title="Supprimer"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-kontrol-border bg-kontrol-bg/10 flex items-center justify-between">
                <p className="text-[11px] text-kontrol-ink-muted">
                  Page <strong>{currentPage}</strong> sur <strong>{totalPages || 1}</strong>
                </p>
                <div className="flex gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                    className="p-2 bg-white border border-kontrol-border rounded-xl text-kontrol-dark disabled:opacity-30 hover:bg-kontrol-bg transition-all"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage(p => p + 1)}
                    className="p-2 bg-white border border-kontrol-border rounded-xl text-kontrol-dark disabled:opacity-30 hover:bg-kontrol-bg transition-all"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : activeConversation ? (
          <>
            {/* Header */}
            <div className="h-16 border-b border-kontrol-border px-4 md:px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 md:gap-4">
                <button 
                  onClick={() => setShowMobileChat(false)}
                  className="md:hidden p-2 -ml-2 text-kontrol-ink-muted hover:bg-kontrol-bg rounded-lg"
                >
                  <Inbox size={20} />
                </button>
                <div className="w-10 h-10 rounded-xl bg-kontrol-blue/5 border border-kontrol-blue/10 flex items-center justify-center text-kontrol-blue">
                  {activeConversation.type === 'GROUP' ? <Users size={20} /> : activeConversation.type === 'CHANNEL' ? <Megaphone size={20} /> : <User size={20} />}
                </div>
                <div>
                  <h3 className="text-[14px] font-extrabold text-kontrol-dark tracking-tight">
                    {activeConversation.type === 'DIRECT' ? (getOtherParticipant(activeConversation.participants)?.displayName || 'Discussion') : activeConversation.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-kontrol-ink-muted font-bold uppercase tracking-wider">
                      {activeConversation.type === 'DIRECT' ? "En ligne" : `${activeConversation.participants?.length || 0} membres`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2 relative" ref={optionsRef}>
                <button 
                  onClick={() => {
                    setIsExpanded(!isExpanded);
                    if (!isExpanded) setMessageLimit(null);
                  }}
                  className="p-2 text-kontrol-ink-muted hover:text-kontrol-blue hover:bg-kontrol-bg rounded-lg transition-all"
                  title={isExpanded ? "Réduire" : "Agrandir et voir tous les messages"}
                >
                  {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
                <button className="hidden sm:flex p-2 text-kontrol-ink-muted hover:text-kontrol-blue hover:bg-kontrol-bg rounded-lg transition-all"><Phone size={18} /></button>
                <button className="hidden sm:flex p-2 text-kontrol-ink-muted hover:text-kontrol-blue hover:bg-kontrol-bg rounded-lg transition-all"><Video size={18} /></button>
                <div className="hidden sm:block w-px h-6 bg-kontrol-border mx-1" />
                <button 
                  onClick={() => setShowOptions(!showOptions)}
                  className={cn(
                    "p-2 text-kontrol-ink-muted hover:text-kontrol-dark hover:bg-kontrol-bg rounded-lg transition-all",
                    showOptions && "bg-kontrol-bg text-kontrol-dark"
                  )}
                >
                  <MoreVertical size={18} />
                </button>

                <AnimatePresence>
                  {showOptions && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-[calc(100%+8px)] w-56 bg-white border border-kontrol-border rounded-2xl shadow-2xl z-[100] overflow-hidden p-1.5"
                    >
                      <button className="w-full flex items-center gap-3 p-2 text-left text-[12px] font-bold text-kontrol-dark hover:bg-kontrol-bg rounded-xl transition-all">
                        <User size={14} /> Profil & Info
                      </button>
                      <button 
                        onClick={clearChat}
                        className="w-full flex items-center gap-3 p-2 text-left text-[12px] font-bold text-kontrol-dark hover:bg-kontrol-bg rounded-xl transition-all"
                      >
                        <Clock size={14} /> Vider la discussion
                      </button>
                      <div className="h-px bg-kontrol-border my-1.5" />
                      <button 
                        onClick={() => {
                          setActiveConversation(null);
                          setShowMobileChat(false);
                          setShowOptions(false);
                        }}
                        className="w-full flex items-center gap-3 p-2 text-left text-[12px] font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <X size={14} /> Fermer la discussion
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-kontrol-bg/10">
              {messageLimit && messages.length >= messageLimit && (
                <div className="flex justify-center pb-4">
                  <button 
                    onClick={() => setMessageLimit(null)}
                    className="text-[10px] font-black uppercase tracking-widest text-kontrol-blue hover:bg-kontrol-blue hover:text-white border border-kontrol-blue/20 bg-white px-6 py-2.5 rounded-full transition-all shadow-sm"
                  >
                    Afficher tous les messages
                  </button>
                </div>
              )}
              {messages.map((msg, i) => {
                const isMine = msg.senderId === user.uid;
                const showSender = i === 0 || messages[i-1].senderId !== msg.senderId;
                
                return (
                  <div key={msg.id} className={cn("flex flex-col", isMine ? "items-end" : "items-start")}>
                    {showSender && !isMine && (
                      <span className="text-[10px] font-bold text-kontrol-ink-muted mb-1 ml-2 uppercase tracking-widest">{msg.senderName}</span>
                    )}
                    <div className={cn(
                      "max-w-[70%] p-3 rounded-2xl text-[13px] shadow-sm",
                      isMine 
                        ? "bg-kontrol-blue text-white rounded-tr-none" 
                        : "bg-white text-kontrol-dark border border-kontrol-border rounded-tl-none"
                    )}>
                      {msg.content}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className={cn("text-[9px]", isMine ? "text-white/70" : "text-kontrol-ink-muted")}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMine && (
                          <CheckCheck size={12} className={cn(msg.readBy?.length > 1 ? "text-emerald-300" : "text-white/50")} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-1.5 md:p-6 border-t border-kontrol-border bg-white">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 md:gap-4">
                <button type="button" className="hidden sm:flex p-2.5 text-kontrol-ink-muted hover:text-kontrol-blue hover:bg-kontrol-bg rounded-xl transition-all">
                  <Paperclip size={20} />
                </button>
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    placeholder="Message..." 
                    className="w-full pl-4 pr-12 py-3 bg-kontrol-bg border border-kontrol-border rounded-2xl text-[13px] md:text-[14px] outline-none focus:border-kontrol-blue transition-all"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-kontrol-blue text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-kontrol-blue transition-all shadow-md shadow-kontrol-blue/20"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
            <div className="w-24 h-24 bg-kontrol-bg rounded-[2rem] flex items-center justify-center text-kontrol-blue/20">
              <MessageSquare size={48} />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-kontrol-dark tracking-tight">Bienvenue sur K-Chat</h3>
              <p className="text-[14px] text-kontrol-ink-muted max-w-sm mt-2">
                Communiquez instantanément avec votre équipe et diffusez des informations importantes via les canaux.
              </p>
            </div>
            
            <button 
              onClick={() => setIsSearching(true)}
              className="flex items-center gap-3 px-8 py-4 bg-kontrol-blue text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-[12px] shadow-2xl shadow-kontrol-blue/30 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={20} strokeWidth={3} /> Nouveau Message
            </button>
          </div>
        )}
      </div>

      {/* Right Section - Optional Info */}
      {activeConversation && (
        <div className={cn("w-72 border-l border-kontrol-border bg-white hidden xl:flex flex-col", isExpanded && "xl:hidden")}>
          <div className="p-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-kontrol-blue/10 mx-auto flex items-center justify-center text-2xl font-bold text-kontrol-blue">
              {activeConversation.type === 'GROUP' ? <Users size={32} /> : activeConversation.type === 'CHANNEL' ? <Megaphone size={32} /> : (getOtherParticipant(activeConversation.participants)?.displayName?.charAt(0) || '?')}
            </div>
            <div>
              <h4 className="text-[16px] font-extrabold text-kontrol-dark tracking-tight">
                {activeConversation.type === 'DIRECT' ? (getOtherParticipant(activeConversation.participants)?.displayName || 'Discussion') : activeConversation.title}
              </h4>
              <p className="text-[11px] text-kontrol-ink-muted truncate">
                {activeConversation.type === 'DIRECT' ? (getOtherParticipant(activeConversation.participants)?.email) : `${activeConversation.participants?.length || 0} membres`}
              </p>
            </div>
          </div>
          
          <div className="px-6 py-6 border-t border-kontrol-border space-y-6">
            <div className="space-y-4">
              <h5 className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-[0.2em]">Actions</h5>
              <div className="grid grid-cols-1 gap-2">
                <button className="w-full py-2.5 px-4 bg-kontrol-bg hover:bg-kontrol-border rounded-xl text-[12px] font-bold text-kontrol-dark transition-all text-left flex items-center gap-2">
                  <User size={14} /> Voir le profil
                </button>
                <button className="w-full py-2.5 px-4 bg-kontrol-bg hover:bg-kontrol-border rounded-xl text-[12px] font-bold text-kontrol-dark transition-all text-left flex items-center gap-2">
                  <Building2 size={14} /> Informations entreprise
                </button>
                <button 
                  onClick={() => {
                    setActiveConversation(null);
                    setShowMobileChat(false);
                  }}
                  className="w-full py-2.5 px-4 bg-kontrol-bg hover:bg-rose-50 hover:text-rose-600 rounded-xl text-[12px] font-bold text-kontrol-dark transition-all text-left flex items-center gap-2"
                >
                  <X size={14} /> Fermer la discussion
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h5 className="text-[10px] font-extrabold text-kontrol-ink-muted uppercase tracking-[0.2em]">Médias partagés</h5>
              <div className="grid grid-cols-3 gap-2">
                <div className="aspect-square bg-kontrol-bg rounded-lg" />
                <div className="aspect-square bg-kontrol-bg rounded-lg" />
                <div className="aspect-square bg-kontrol-bg rounded-lg" />
              </div>
              <button className="text-[11px] font-bold text-kontrol-blue hover:underline">Voir tout</button>
            </div>
          </div>
        </div>
      )}
      {/* Deletion Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-kontrol-dark/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl space-y-6 text-center"
            >
              <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500 mx-auto">
                <Trash2 size={36} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-extrabold text-kontrol-dark tracking-tight">Supprimer la discussion ?</h3>
                <p className="text-[14px] text-kontrol-ink-muted">
                  Cette action est irréversible. Tous les messages associés seront définitivement supprimés.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => deleteConversation(deleteConfirmId)}
                  disabled={deletingId === deleteConfirmId}
                  className="w-full py-4 bg-rose-500 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[12px] shadow-xl shadow-rose-500/20 hover:bg-rose-600 transition-all flex items-center justify-center gap-2"
                >
                  {deletingId === deleteConfirmId ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Confirmer la suppression"
                  )}
                </button>
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={deletingId !== null}
                  className="w-full py-4 bg-kontrol-bg text-kontrol-dark rounded-[1.5rem] font-bold text-[12px] hover:bg-kontrol-border transition-all"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
