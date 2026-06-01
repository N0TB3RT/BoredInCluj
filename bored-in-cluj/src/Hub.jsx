import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Hub.css';

// --- CUSTOM SVGS ---
const PixelCoin = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" className="pixel-coin">
        <rect x="8" y="2" width="8" height="2" fill="#e6b800"/>
        <rect x="6" y="4" width="2" height="4" fill="#e6b800"/>
        <rect x="16" y="4" width="2" height="4" fill="#e6b800"/>
        <rect x="4" y="8" width="2" height="8" fill="#e6b800"/>
        <rect x="18" y="8" width="2" height="8" fill="#e6b800"/>
        <rect x="6" y="16" width="2" height="4" fill="#e6b800"/>
        <rect x="16" y="16" width="2" height="4" fill="#e6b800"/>
        <rect x="8" y="20" width="8" height="2" fill="#e6b800"/>
        <rect x="8" y="4" width="8" height="16" fill="#ffcc00"/>
        <rect x="10" y="6" width="4" height="12" fill="#fff799"/>
    </svg>
);

const IconMoon = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00d9ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
);

const IconSun = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffaa00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
    </svg>
);

const IconCloudRain = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00ffaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
        <path d="M16 14v6"></path>
        <path d="M8 14v6"></path>
        <path d="M12 16v6"></path>
    </svg>
);

export default function Hub({
                                userTokens = 0,
                                isFreeRollAvailable = true,
                                nextFreeRollTime = null,
                                onFreeRoll = () => {},
                                onPaidRoll = () => {},
                                onSuggestQuest = () => {}
                            }) {
    // --- STATE ---
    const [modalState, setModalState] = useState(null);
    const [timeLeft, setTimeLeft] = useState("");
    const [currentTime, setCurrentTime] = useState(new Date());

    // Suggestion Form State & Validation
    const [suggestDraft, setSuggestDraft] = useState({ title: '', description: '', location: { name: '' } });
    const [suggestErrors, setSuggestErrors] = useState({});

    // Update the clock every minute
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Live Countdown Timer for the next Free Roll
    useEffect(() => {
        if (isFreeRollAvailable) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const distance = nextFreeRollTime - now;

            if (distance < 0) {
                clearInterval(interval);
                setTimeLeft("");
            } else {
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isFreeRollAvailable, nextFreeRollTime]);

    // Environmental Logic
    const hour = currentTime.getHours();
    const isNight = hour < 6 || hour >= 19;
    const timeLabel = isNight ? "MIDNIGHT PROTOCOL" : "DAYLIGHT SECURED";

    // Mock Weather
    const isRaining = true;
    const weatherLabel = isRaining ? "HEAVY RAIN" : "CLEAR SKIES";

    // --- HANDLERS ---
    const handleRerollRequest = () => {
        if (userTokens >= 1) {
            setModalState('warning');
        } else {
            setModalState('empty');
        }
    };

    const confirmReroll = () => {
        setModalState(null);
        onPaidRoll();
    };

    const closeSuggestModal = () => {
        setModalState(null);
        setSuggestErrors({});
        setSuggestDraft({ title: '', description: '', location: { name: '' } });
    };

    // --- STRICT VALIDATION ENGINE ---
    const validateSuggestion = () => {
        const newErrors = {};
        const title = suggestDraft.title.trim();
        const locName = suggestDraft.location.name.trim();
        const desc = suggestDraft.description.trim();

        // 1. Title Check
        if (!title || title.length < 5) {
            newErrors.title = "TITLE MUST BE AT LEAST 5 CHARACTERS.";
        } else if (title.length > 50) {
            newErrors.title = "TITLE EXCEEDS 50 CHARACTERS.";
        }

        // 2. Location Check
        if (!locName || locName.length < 3) {
            newErrors.location = "VALID LOCATION REQUIRED (MIN 3 CHARS).";
        }

        // 3. Description Check
        if (!desc || desc.length < 10) {
            newErrors.description = "DIRECTIVE MUST BE AT LEAST 10 CHARACTERS.";
        } else if (desc.length > 300) {
            newErrors.description = "DIRECTIVE EXCEEDS 300 CHARACTERS.";
        }

        setSuggestErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const submitSuggestion = () => {
        // Halt if validation fails
        if (!validateSuggestion()) return;

        // Pass sanitized (trimmed) data up
        onSuggestQuest({
            ...suggestDraft,
            title: suggestDraft.title.trim(),
            description: suggestDraft.description.trim(),
            location: { name: suggestDraft.location.name.trim() }
        });

        closeSuggestModal();
    };

    return (
        <div className="hub-container">

            {/* TOP BAR: WALLET */}
            <div className="hub-wallet">
                <div className="token-display">
                    <PixelCoin />
                    <span className="token-count">x {userTokens}</span>
                </div>
            </div>

            <div className="hub-content">
                <h1 className="hub-title">CLUJ-NAPOCA</h1>
                <p className="hub-subtitle">SYSTEM STATUS: ONLINE</p>

                {/* ENVIRONMENTAL DASHBOARD */}
                <div className="env-dashboard">
                    <div className="env-card">
                        <div className="env-icon">{isNight ? <IconMoon /> : <IconSun />}</div>
                        <div className="env-details">
                            <span className="env-label">LOCAL TIME</span>
                            <span className="env-value">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="env-sub">{timeLabel}</span>
                        </div>
                    </div>
                    <div className="env-card">
                        <div className="env-icon"><IconCloudRain /></div>
                        <div className="env-details">
                            <span className="env-label">ATMOSPHERE</span>
                            <span className="env-value">12°C</span>
                            <span className="env-sub">{weatherLabel}</span>
                        </div>
                    </div>
                </div>

                {/* MAIN ACTION AREA */}
                <div className="action-center">
                    {isFreeRollAvailable ? (
                        <div className="action-block">
                            <p className="action-hint">Your daily free roll is available.</p>
                            <button className="btn-huge btn-free-roll" onClick={onFreeRoll}>
                                START DAILY QUEST
                            </button>
                        </div>
                    ) : (
                        <div className="action-block action-used">
                            <p className="action-hint text-warning">
                                Next free roll in: <strong>{timeLeft}</strong>
                            </p>
                            <button className="btn-reroll-trigger" onClick={handleRerollRequest}>
                                REROLL QUEST (1 TOKEN)
                            </button>
                        </div>
                    )}
                </div>

                {/* --- SUGGESTION BANNER --- */}
                <div className="hub-suggestion-banner" onClick={() => setModalState('suggest')}>
                    <h3>HAVE OTHER IDEAS?</h3>
                    <p>Suggest a quest in exchange for 3 Pixel Coins</p>
                </div>
            </div>

            {/* --- CUSTOM MODALS --- */}
            {modalState === 'warning' && createPortal(
                <div className="hub-modal-overlay" onClick={() => setModalState(null)}>
                    <div className="hub-modal-content warning-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title text-amber">OVERRIDE REQUIRED</h2>
                        <p className="modal-text">Rerolling a quest will consume <strong style={{color: '#fff'}}>1 Pixel Coin</strong> from your wallet.</p>
                        <div className="modal-balance">Current Balance: {userTokens} Tokens</div>

                        <div className="modal-actions-grid">
                            <button className="btn-cancel" onClick={() => setModalState(null)}>CANCEL</button>
                            <button className="btn-confirm-reroll" onClick={confirmReroll}>SPEND TOKEN</button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {modalState === 'empty' && createPortal(
                <div className="hub-modal-overlay" onClick={() => setModalState(null)}>
                    <div className="hub-modal-content error-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title text-red">INSUFFICIENT FUNDS</h2>
                        <p className="modal-text">You are out of Pixel Coins. Complete active quests or team up in the Forum to earn more.</p>

                        <div className="modal-actions-grid">
                            <button className="btn-cancel full-width" onClick={() => setModalState(null)}>ACKNOWLEDGE</button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {modalState === 'suggest' && createPortal(
                <div className="hub-modal-overlay" onClick={closeSuggestModal}>
                    <div className="hub-modal-content suggest-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title" style={{color: '#00ffaa'}}>SUGGEST A QUEST</h2>
                        <p className="modal-text" style={{marginBottom: '20px'}}>If approved, you earn 3 Pixel Coins.</p>

                        <div className="form-group">
                            <label>QUEST TITLE</label>
                            <input
                                type="text"
                                className={`hub-input ${suggestErrors.title ? 'input-error' : ''}`}
                                value={suggestDraft.title}
                                onChange={(e) => { setSuggestDraft({...suggestDraft, title: e.target.value}); setSuggestErrors({...suggestErrors, title: ''}); }}
                            />
                            {suggestErrors.title && <span className="cyber-error">{suggestErrors.title}</span>}
                        </div>
                        <div className="form-group">
                            <label>LOCATION NAME</label>
                            <input
                                type="text"
                                className={`hub-input ${suggestErrors.location ? 'input-error' : ''}`}
                                value={suggestDraft.location.name}
                                onChange={(e) => { setSuggestDraft({...suggestDraft, location: { name: e.target.value }}); setSuggestErrors({...suggestErrors, location: ''}); }}
                            />
                            {suggestErrors.location && <span className="cyber-error">{suggestErrors.location}</span>}
                        </div>
                        <div className="form-group">
                            <label>DESCRIPTION & RULES</label>
                            <textarea
                                className={`hub-input ${suggestErrors.description ? 'input-error' : ''}`}
                                rows="3"
                                value={suggestDraft.description}
                                onChange={(e) => { setSuggestDraft({...suggestDraft, description: e.target.value}); setSuggestErrors({...suggestErrors, description: ''}); }}
                            ></textarea>
                            {suggestErrors.description && <span className="cyber-error">{suggestErrors.description}</span>}
                        </div>

                        <div className="modal-actions-grid" style={{marginTop: '20px'}}>
                            <button className="btn-cancel" onClick={closeSuggestModal}>CANCEL</button>
                            <button className="btn-confirm-reroll" style={{background: '#00ffaa', color: '#000', borderColor: '#00ffaa'}} onClick={submitSuggestion}>SUBMIT</button>
                        </div>
                    </div>
                </div>, document.body
            )}
        </div>
    );
}