import React, { useState } from 'react';
import './QuestDetail.css';
import { createPortal } from 'react-dom';

export default function QuestDetail({ quest, onAbort, onComplete, onBack }) {    const [scanState, setScanState] = useState('idle');
    const [aiRating, setAiRating] = useState(0);

    const [showGiveUpModal, setShowGiveUpModal] = useState(false);

    if (!quest) return <div className="error-screen">NO QUEST DATA FOUND. <button onClick={onBack}>RETURN</button></div>;

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setScanState('uploading');

        setTimeout(() => {
            setScanState('analyzing');
            setTimeout(() => {
                const score = Math.floor(Math.random() * 5) + 1;
                setAiRating(score);
                if (score >= 3) {
                    setScanState('success');
                } else {
                    setScanState('failed');
                }
            }, 2500);
        }, 1000);
    };

    return (
        <div className="quest-detail-container">

            {/* TOP NAVIGATION */}
            <div className="detail-header">
                <button className="btn-back" onClick={() => setShowGiveUpModal(true)}>[ &lt; GIVE UP ]</button>
                <div className="quest-id">DATA NODE: {quest.id}</div>
            </div>

            {/* STACKED LAYOUT */}
            <div className="detail-stack">

                {/* 1. TITLE & AUTHOR */}
                <div className="title-section">
                    <h1 className="mission-title">{quest.title}</h1>
                    <div className="author-tag">ENCODED BY: {quest.author}</div>
                </div>

                {/* 2. MEDIA SHOWCASE (Photo & Google Map) */}
                <div className="media-showcase">
                    <div className="media-box photo-box">
                        <img
                            src={quest.backgroundImage || "https://via.placeholder.com/600x400?text=NO+IMAGE+DATA"}
                            alt={quest.location?.name || "Unknown Location"}
                            className="location-img"
                        />
                    </div>                    <div className="media-box map-box" style={{ position: 'relative' }}>
                        {/* Fully interactive map (pointer-events allowed here!) */}
                        <iframe
                            title="Target Location"
                            src={`https://maps.google.com/maps?q=${quest.location?.lat || 46.7712},${quest.location?.lng || 23.5905}&z=16&output=embed`}
                            width="100%"
                            height="100%"
                            style={{ border: 0, filter: 'invert(90%) hue-rotate(180deg) contrast(110%)' }}
                            allowFullScreen=""
                            loading="lazy"
                        ></iframe>

                        {/* External GPS Routing Link */}
                        <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${quest.location?.lat},${quest.location?.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-gps"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                            </svg>
                            OPEN IN GPS
                        </a>
                    </div>
                </div>

                {/* 3. MISSION BRIEFING */}
                <div className="briefing-panel">
                    <div className="mission-specs">
                        <div className="spec-box">
                            <span className="spec-label">DIFFICULTY</span>
                            <span className="spec-val diff-stars">{'★'.repeat(quest.difficulty || 1)}</span>
                        </div>
                        <div className="spec-box">
                            <span className="spec-label">FINANCIAL COST</span>
                            {/* SAFEGUARD: .toUpperCase() will only run if quest.cost exists */}
                            <span className="spec-val">{quest.cost?.toUpperCase() || 'UNKNOWN'}</span>
                        </div>
                        <div className="spec-box">
                            <span className="spec-label">TARGET GPS</span>
                            <span className="spec-val gps-text">
                                {/* SAFEGUARD: Ensure location and lat/lng exist before running math */}
                                {quest.location?.lat?.toFixed(4) || '0.0000'} N,
                                {quest.location?.lng?.toFixed(4) || '0.0000'} E
                                <br/><span className="loc-name">({quest.location?.name || 'Unknown Zone'})</span>
                            </span>
                        </div>
                    </div>

                    <div className="mission-description">
                        <h3 className="desc-header">MISSION DIRECTIVE:</h3>
                        <p>{quest.description || 'No directive provided.'}</p>
                    </div>

                    <div className="conditions-array">
                        {/* SAFEGUARD: .join() will only run if the arrays exist */}
                        <span className="cond-tag">REQ: {quest.conditions?.daytime?.join(' OR ') || 'ANY'}</span>
                        <span className="cond-tag">REQ: {quest.conditions?.weather?.join(' OR ') || 'ANY'}</span>
                    </div>

                </div>

                {/* 4. AI VALIDATION TERMINAL */}
                <div className="ai-terminal">
                    <h2 className="terminal-title">AI VISION LINK</h2>

                    <div className={`scanner-screen ${scanState}`}>
                        {scanState === 'idle' && (
                            <div className="scanner-content idle">
                                <p>AWAITING PHOTOGRAPHIC EVIDENCE.</p>
                                <label className="btn-upload">
                                    [ UPLOAD IMAGE ]
                                    <input type="file" accept="image/*" onChange={handleFileUpload} style={{display: 'none'}} />
                                </label>
                            </div>
                        )}

                        {scanState === 'uploading' && (
                            <div className="scanner-content blink">
                                <p>ESTABLISHING SECURE UPLOAD LINK...</p>
                                <div className="progress-bar"><div className="progress-fill upload"></div></div>
                            </div>
                        )}

                        {scanState === 'analyzing' && (
                            <div className="scanner-content analyzing">
                                <div className="scan-line"></div>
                                <p className="cyber-glitch">RUNNING NEURAL NET VISION ANALYSIS...</p>
                                <p className="sub-log">Checking metadata...</p>
                                <p className="sub-log">Cross-referencing GPS nodes...</p>
                                <p className="sub-log">Evaluating completion parameters...</p>
                            </div>
                        )}

                        {scanState === 'success' && (
                            <div className="scanner-content success">
                                <h3>MISSION ACCOMPLISHED</h3>
                                <p>AI RATING: {'★'.repeat(aiRating)}</p>
                                <p className="xp-text">+ 150 XP AWARDED</p>
                                <button className="btn-claim" onClick={() => onComplete(quest.id, aiRating)}>
                                    [ CLAIM REWARDS ]
                                </button>
                            </div>
                        )}

                        {scanState === 'failed' && (
                            <div className="scanner-content failed">
                                <h3>VALIDATION FAILED</h3>
                                <p>AI RATING: {'★'.repeat(aiRating)}</p>
                                <p>EVIDENCE INSUFFICIENT OR INCORRECT.</p>
                                <button className="btn-retry" onClick={() => setScanState('idle')}>
                                    [ RETRY UPLOAD ]
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
            {showGiveUpModal && createPortal(
                <div className="hub-modal-overlay" onClick={() => setShowGiveUpModal(false)}>
                    <div className="hub-modal-content error-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title text-red" style={{color: '#ff0055'}}>GIVE UP?</h2>
                        <p className="modal-text" style={{color: '#aaa', margin: '20px 0'}}>
                            If you abandon this quest, your free daily roll will be lost. You will need to spend 1 Pixel Coin to roll a new quest today.
                        </p>

                        <div className="modal-actions-grid" style={{display: 'flex', gap: '15px'}}>
                            <button className="btn-cancel" onClick={() => setShowGiveUpModal(false)}>CANCEL</button>
                            <button
                                className="btn-confirm-reroll"
                                style={{background: '#ff0055', border: 'none', color: '#fff'}}
                                onClick={() => {
                                    setShowGiveUpModal(false);
                                    onAbort(); // Triggers the penalty in App.jsx
                                }}
                            >
                                CONFIRM
                            </button>
                        </div>
                    </div>
                </div>, document.body
            )}
        </div>
    );
}