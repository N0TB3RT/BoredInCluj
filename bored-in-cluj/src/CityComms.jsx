import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './CityComms.css';

const formatTimeAgo = (dateString) => {
    if (!dateString || dateString === "Just now") return "Just now";
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
};

export default function CityComms({
                                      user = { username: "Guest", isAdmin: false },
                                      userTokens = 5,
                                      onConsumeToken = () => {},
                                      onRollQuest = () => {},
                                  }) {
    const [posts, setPosts] = useState([]);
    const feedRef = useRef(null);
    const wsRef = useRef(null);

    // --- NEW CONNECTION STATE ---
    const [isSocketReady, setIsSocketReady] = useState(false);

    const [selectedProfile, setSelectedProfile] = useState(null);
    const [broadcastText, setBroadcastText] = useState("");
    const [composerError, setComposerError] = useState("");
    const [partyError, setPartyError] = useState("");

    const [isCreatingParty, setIsCreatingParty] = useState(false);
    const [partySetup, setPartySetup] = useState({ message: '', isPrivate: false, accessKey: '' });
    const [activeLobby, setActiveLobby] = useState(null);
    const [lobbyLocked, setLobbyLocked] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL || 'https://10.200.251.90:8000';
    const WS_URL = API_URL.replace(/^http/, 'ws');

    useEffect(() => {
        const ws = new WebSocket(`${WS_URL}/ws/chat`);
        wsRef.current = ws;

        // 1. Tell the UI the moment the connection physically opens
        ws.onopen = () => {
            console.log("WebSocket connection established!");
            setIsSocketReady(true);
            setComposerError("");
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === "HISTORY_BATCH") {
                const formattedHistory = data.payload.map(p => ({
                    ...p,
                    commentsList: [],
                    likes: 0
                }));
                setPosts(formattedHistory);

            } else if (data.type === "NEW_MESSAGE") {
                // Instantly inject new messages broadcasted one-by-one from other users
                setPosts(prev => [...prev, { ...data.payload, commentsList: [], likes: 0 }]);
                setTimeout(scrollToBottom, 100);
            }
        };

        // 2. Catch network failures
        ws.onerror = (error) => {
            console.error("WebSocket Error:", error);
            setComposerError("SOCKET ERROR: FAILED TO CONNECT.");
        };

        ws.onclose = () => {
            console.log("WebSocket disconnected.");
            setIsSocketReady(false);
        };

        return () => ws.close();
    }, [WS_URL]);

    const scrollToBottom = () => {
        if (feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        if (posts.length > 0) {
            setTimeout(scrollToBottom, 200);
        }
    }, [posts.length]);

    const handleTransmit = () => {
        const text = broadcastText.trim();
        if (!text) return setComposerError("CANNOT TRANSMIT EMPTY SIGNAL.");
        if (text.length > 250) return setComposerError(`SIGNAL TOO LARGE (${text.length}/250 CHARACTERS).`);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: "GENERAL",
                content: text,
                authorUsername: user.username
            }));

            setBroadcastText("");
            setComposerError("");
        } else {
            setComposerError("CONNECTION LOST. RECONNECTING...");
        }
    };

    const handleUpvote = (postId) => {
        setPosts(posts.map(p => p.id === postId ? { ...p, likes: p.hasLiked ? p.likes - 1 : p.likes + 1, hasLiked: !p.hasLiked } : p));
    };

    const handleDeletePost = (postId) => {
        if (window.confirm("Hide this message? (Local Action)")) {
            setPosts(posts.filter(p => p.id !== postId));
        }
    };

    const handleCreatePartyClick = () => {
        setIsCreatingParty(true);
        setPartyError("");
        setPartySetup({ message: '', isPrivate: false, accessKey: '' });
    };

    const submitPartyCreation = () => {
        if (userTokens < 1) return alert("INSUFFICIENT TOKENS.");
        const msg = partySetup.message.trim();
        if (msg.length > 100) return setPartyError("MAX 100 CHARS.");

        onConsumeToken();

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: "LFG",
                content: msg || "Rolling a random quest. Join up.",
                authorUsername: user.username
            }));
        }

        const newLobby = {
            id: "lfg_local", type: "LFG", author: { username: user.username },
            content: msg || "Rolling a random quest. Join up.", isPrivate: partySetup.isPrivate, accessKey: partySetup.accessKey,
            members: [user.username], maxMembers: 8
        };

        setIsCreatingParty(false);
        setActiveLobby(newLobby);
        setLobbyLocked(false);
        setTimeout(scrollToBottom, 100);
    };

    const handleJoinSquad = (post) => {
        if (userTokens < 1) return alert("INSUFFICIENT TOKENS.");
        if (post.isPrivate) {
            const key = window.prompt("PRIVATE squad. Enter Access Key:");
            if (key !== post.accessKey && post.accessKey !== '') return alert("ACCESS DENIED.");
            if (key === null) return;
        }

        onConsumeToken();

        setActiveLobby({
            ...post,
            author: { username: post.author },
            members: [post.author, user.username],
            maxMembers: 8
        });
        setLobbyLocked(false);
    };

    const handleRollQuest = () => {
        setActiveLobby(null);
        onRollQuest();
    };

    return (
        <div className="chat-container">
            <div className="chat-header">
                <div className="header-info">
                    <h2>CITY COMMS (LIVE NODE)</h2>
                    <span>{userTokens} TOKENS | ENCRYPTED NoSQL STREAM</span>
                </div>
            </div>

            <div className="chat-feed" ref={feedRef}>
                {/* 3. UPDATE THE LOADER LOGIC */}
                {!isSocketReady && <div className="chat-loader">ESTABLISHING UPLINK TO MONGODB...</div>}
                {isSocketReady && posts.length === 0 && <div className="chat-loader" style={{color: '#00ffaa'}}>DATABASE CONNECTED. START THE CHAT!</div>}

                {posts.map((post) => {
                    const isMine = post.author === user.username;

                    return (
                        <div key={post.id} className={`chat-wrapper ${isMine ? 'mine' : 'theirs'}`}>
                            {!isMine && (
                                <img
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.author || 'Runner1'}`}
                                    className="chat-avatar"
                                    alt="Avatar"
                                    onClick={() => setSelectedProfile({ username: post.author })}
                                />
                            )}

                            <div className="chat-bubble-container">
                                {!isMine && <span className="chat-author-name">{post.author || 'System'}</span>}

                                <div className={`chat-bubble type-${post.type?.toLowerCase() || 'general'}`}>
                                    {post.type === "LFG" && (
                                        <div className="chat-lfg-header">📢 LFG SQUAD BROADCAST</div>
                                    )}

                                    <div className="chat-text">{post.content}</div>

                                    {post.type === "LFG" && !isMine && (
                                        <button className="btn-chat-join" onClick={() => handleJoinSquad(post)}>
                                            JOIN SQUAD
                                        </button>
                                    )}
                                </div>

                                <div className="chat-meta">
                                    <span className="chat-time">{formatTimeAgo(post.timestamp)}</span>

                                    <div className="chat-actions">
                                        <span onClick={() => handleUpvote(post.id)}>▲ {post.likes}</span>
                                        {(isMine || user.isAdmin) && (
                                            <span onClick={() => handleDeletePost(post.id)}>✕</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="chat-composer">
                {composerError && <div className="chat-error">{composerError}</div>}
                <div className="composer-row">
                    <button className="btn-chat-lfg" onClick={handleCreatePartyClick} disabled={!isSocketReady}>CO-OP</button>
                    <input
                        type="text"
                        placeholder="Message the city..."
                        value={broadcastText}
                        onChange={(e) => { setBroadcastText(e.target.value); setComposerError(""); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleTransmit()}
                        disabled={!isSocketReady}
                    />
                    <button className="btn-chat-send" onClick={handleTransmit} disabled={!isSocketReady}>SEND</button>
                </div>
            </div>

            {/* MODALS */}
            {selectedProfile && createPortal(
                <div className="modal-overlay" onClick={() => setSelectedProfile(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="btn-close-modal" onClick={() => setSelectedProfile(null)}>✕</button>
                        <div className="dossier-header">
                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedProfile.username || 'Runner1'}`} alt="Avatar" className="dossier-avatar-large" />
                            <h2 className="dossier-username">{selectedProfile.username || 'System'}</h2>
                        </div>
                    </div>
                </div>, document.body
            )}

            {isCreatingParty && createPortal(
                <div className="modal-overlay" onClick={() => setIsCreatingParty(false)}>
                    <div className="modal-content form-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">INITIATE SQUAD (LFG)</h2>
                        <p className="modal-subtitle">Cost: 1 Token to deploy.</p>
                        <div className="form-group">
                            <label>BROADCAST MESSAGE (Max 100)</label>
                            <input type="text" className={partyError ? 'input-error' : ''} value={partySetup.message} onChange={(e) => { setPartySetup({...partySetup, message: e.target.value}); setPartyError(""); }} placeholder="E.g., Need backup..." />
                            {partyError && <span className="cyber-error">{partyError}</span>}
                        </div>
                        <div className="modal-actions-grid">
                            <button className="btn-cancel" onClick={() => setIsCreatingParty(false)}>CANCEL</button>
                            <button className="btn-confirm" onClick={submitPartyCreation}>CREATE SQUAD</button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {activeLobby && createPortal(
                <div className="modal-overlay">
                    <div className="modal-content lobby-modal">
                        <h2 className="modal-title">ACTIVE SQUAD LOBBY</h2>
                        <span className="lobby-count">MEMBERS: {activeLobby.members.length} / 8</span>
                        <div className="lobby-members">
                            {activeLobby.members.map((member, idx) => (
                                <div key={idx} className="member-slot"><span className="member-name">{member}</span>{idx === 0 && <span className="badge-leader">LEADER</span>}</div>
                            ))}
                            {[...Array(8 - activeLobby.members.length)].map((_, idx) => (
                                <div key={`empty-${idx}`} className="member-slot empty">WAITING...</div>
                            ))}
                        </div>
                        {activeLobby.author?.username === user.username ? (
                            <div className="lobby-controls">
                                {!lobbyLocked ? (
                                    <button className="btn-lock" onClick={() => setLobbyLocked(true)}>LOCK IN SQUAD</button>
                                ) : (
                                    <button className="btn-roll-huge" onClick={handleRollQuest}>START QUEST</button>
                                )}
                            </div>
                        ) : (
                            <div className="lobby-controls"><div className="waiting-text">AWAITING LEADER...</div></div>
                        )}
                        {!lobbyLocked && <button className="btn-leave" onClick={() => setActiveLobby(null)}>LEAVE SQUAD</button>}
                    </div>
                </div>, document.body
            )}
        </div>
    );
}