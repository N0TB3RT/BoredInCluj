import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Cookies from 'js-cookie';
import './Profile.css';

// --- CUSTOM SVG ICONS ---
const IconNightOwl = ({ color }) => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> );
const IconGourmet = ({ color }) => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg> );
const IconSocialite = ({ color }) => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg> );
const IconExplorer = ({ color }) => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg> );
const IconEarlyBird = ({ color }) => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line></svg> );

const badges = [
    { id: 1, icon: "NightOwl", name: "Night Owl", description: "Completed a quest after midnight.", unlocked: true, color: "#00d9ff" },
    { id: 2, icon: "Gourmet", name: "Gourmet", description: "Cleared a food-related quest.", unlocked: true, color: "#ffaa00" },
    { id: 3, icon: "Socialite", name: "Socialite", description: "Joined 5 public groups.", unlocked: false, color: "#00ffaa" },
    { id: 4, icon: "Explorer", name: "Explorer", description: "Found 10 hidden locations.", unlocked: false, color: "#00d9ff" },
    { id: 5, icon: "EarlyBird", name: "Early Bird", description: "Completed a quest before 8 AM.", unlocked: true, color: "#00ffaa" }
];

const themes = [
    { id: 'blue', hex: '#00d9ff' },
    { id: 'green', hex: '#00ffaa' },
    { id: 'yellow', hex: '#ffcc00' },
    { id: 'red', hex: '#ff0055' },
    { id: 'pink', hex: '#ff00ff' },
    { id: 'purple', hex: '#9d00ff' }
];

export default function Profile({ user, onUpdateProfile, onLogout, onAdminClick }) {
    const userLevel = 12;
    const currentXP = 8450;
    const nextLevelXP = 10000;
    const xpPercentage = (currentXP / nextLevelXP) * 100;

    const [isEditing, setIsEditing] = useState(false);
    const [draftUsername, setDraftUsername] = useState(user.username);
    const [draftAvatar, setDraftAvatar] = useState(user.avatar || "Runner1");

    // Cookie-backed Theme State
    const [currentTheme, setCurrentTheme] = useState(Cookies.get('bored_in_cluj_theme') || 'blue');
    const fileInputRef = useRef(null);

    const getAvatarImage = (avatarValue) => {
        if (avatarValue && (avatarValue.startsWith('blob:') || avatarValue.startsWith('http'))) {
            return avatarValue;
        }
        return `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarValue || 'Runner1'}`;
    };

    const renderBadgeIcon = (iconName, baseColor, isUnlocked) => {
        const drawColor = isUnlocked ? baseColor : "#333344";
        switch (iconName) {
            case "NightOwl": return <IconNightOwl color={drawColor} />;
            case "Gourmet": return <IconGourmet color={drawColor} />;
            case "Socialite": return <IconSocialite color={drawColor} />;
            case "Explorer": return <IconExplorer color={drawColor} />;
            case "EarlyBird": return <IconEarlyBird color={drawColor} />;
            default: return null;
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) setDraftAvatar(URL.createObjectURL(file));
    };

    const handleThemeChange = (themeId) => {
        setCurrentTheme(themeId);
        Cookies.set('bored_in_cluj_theme', themeId, { expires: 365 }); // Save preference for 1 year
        document.documentElement.setAttribute('data-theme', themeId); // Instantly swap CSS Variables
    };

    const handleSaveProfile = () => {
        if (!draftUsername.trim()) return;
        onUpdateProfile({ username: draftUsername, avatar: draftAvatar });
        setIsEditing(false);
    };

    const openEditModal = () => {
        setDraftUsername(user.username);
        setDraftAvatar(user.avatar || "Runner1");
        setIsEditing(true);
    };

    return (
        <div className="profile-container">
            {/* Header */}
            <div className="profile-header">
                <div className="avatar-wrapper">
                    <img src={getAvatarImage(user.avatar)} alt="Avatar" className="profile-avatar"/>
                </div>
                <div className="profile-identity">
                    <h1 className="profile-username">{user.username}</h1>
                    <span className="profile-rank">Level {userLevel}</span>
                </div>
                <div className="xp-section">
                    <div className="xp-labels"><span>XP Progress</span><span>{currentXP.toLocaleString()} / {nextLevelXP.toLocaleString()}</span></div>
                    <div className="xp-bar-bg"><div className="xp-bar-fill" style={{ width: `${xpPercentage}%` }}></div></div>
                </div>
            </div>

            {/* Stats */}
            <div className="profile-stats">
                <div className="stat-card"><span className="stat-value text-cyan">{user.tokens}</span><span className="stat-label">Tokens</span></div>
                <div className="stat-card"><span className="stat-value text-mint">{user.completedQuests.length || 0}</span><span className="stat-label">Quests Cleared</span></div>
                <div className="stat-card"><span className="stat-value text-amber">{user.reputation}</span><span className="stat-label">Reputation</span></div>
            </div>

            {/* Achievements */}
            <div className="profile-section">
                <h2 className="section-title">Achievements</h2>
                <div className="badges-grid">
                    {badges.map(badge => (
                        <div key={badge.id} className={`badge-card ${badge.unlocked ? 'unlocked' : 'locked'}`}>
                            <div className="badge-icon" style={{ borderColor: badge.unlocked ? badge.color : '#222', boxShadow: badge.unlocked ? `0 0 15px ${badge.color}40` : 'none' }}>
                                {renderBadgeIcon(badge.icon, badge.color, badge.unlocked)}
                            </div>
                            <div className="badge-info">
                                <h3>{badge.name}</h3>
                                <p>{badge.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="profile-actions">
                {user.isAdmin && (
                    <button className="btn-profile-action btn-admin" onClick={onAdminClick}>Admin Panel</button>
                )}
                <button className="btn-profile-action btn-edit" onClick={openEditModal}>Edit Profile</button>
                <button className="btn-profile-action btn-logout" onClick={onLogout}>Logout</button>
            </div>

            {/* --- EDIT PROFILE MODAL --- */}
            {isEditing && createPortal(
                <div className="profile-modal-overlay" onClick={() => setIsEditing(false)}>
                    <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title" style={{color: 'var(--main-color, #00d9ff)', marginBottom: '20px'}}>EDIT PROFILE</h2>

                        <div className="form-group">
                            <label>USERNAME</label>
                            <input type="text" className="profile-input" value={draftUsername} onChange={(e) => setDraftUsername(e.target.value)} maxLength={16} />
                        </div>

                        <div className="form-group avatar-upload-group">
                            <label>CUSTOM AVATAR</label>
                            <div className="avatar-preview-container">
                                <img src={getAvatarImage(draftAvatar)} alt="Preview" className="avatar-preview-large" />
                            </div>
                            <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
                            <button className="btn-upload-avatar" onClick={() => fileInputRef.current.click()}>
                                UPLOAD NEW PHOTO
                            </button>
                        </div>

                        {/* --- GRID THEME SWATCHES --- */}
                        <div className="form-group theme-upload-group" style={{marginTop: '20px'}}>
                            <label>GRID UI THEME</label>
                            <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                                {themes.map(theme => (
                                    <div
                                        key={theme.id}
                                        role="button"
                                        aria-label={`Theme ${theme.id}`}
                                        onClick={() => handleThemeChange(theme.id)}
                                        style={{
                                            width: '30px', height: '30px', borderRadius: '50%',
                                            backgroundColor: theme.hex, cursor: 'pointer',
                                            border: currentTheme === theme.id ? `3px solid #fff` : `2px solid transparent`,
                                            boxShadow: currentTheme === theme.id ? `0 0 10px ${theme.hex}` : 'none'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="modal-actions-grid" style={{marginTop: '30px', display: 'flex', gap: '15px'}}>
                            <button className="btn-cancel" onClick={() => setIsEditing(false)}>CANCEL</button>
                            <button className="btn-confirm-save" onClick={handleSaveProfile}>SAVE CHANGES</button>
                        </div>
                    </div>
                </div>, document.body
            )}
        </div>
    );
}