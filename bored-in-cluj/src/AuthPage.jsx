import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@apollo/client/react';
import { gql } from '@apollo/client/core';
import Cookies from 'js-cookie';
import './AuthPage.css';
import customLogo from '../assets/main-logo.png';

// --- GRAPHQL MUTATIONS ---
const LOGIN_USER = gql`
  mutation LoginUser($email: String!, $password: String!) {
    loginUser(email: $email, password: $password) {
      username
      isAdmin
      accessToken
    }
  }
`;

const VERIFY_MFA = gql`
  mutation VerifyMfa($email: String!, $code: String!) {
    verifyMfa(email: $email, code: $code) {
      username
      isAdmin
      accessToken
    }
  }
`;

const REGISTER_USER = gql`
  mutation RegisterUser($username: String!, $email: String!, $password: String!) {
    registerUser(username: $username, email: $email, password: $password) {
      username
      isAdmin
      accessToken
    }
  }
`;

const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email)
  }
`;

const RESET_PASSWORD = gql`
  mutation ResetPassword($token: String!, $newPassword: String!) {
    resetPassword(token: $token, newPassword: $newPassword)
  }
`;

export default function AuthPage({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [isMfaMode, setIsMfaMode] = useState(false); // NEW: Phase 2 Lock
    const [mfaCode, setMfaCode] = useState(''); // NEW: The 6-digit code

    const [resetToken, setResetToken] = useState(null);
    const [sysMessage, setSysMessage] = useState('');

    const [transform, setTransform] = useState('');
    const logoRef = useRef(null);

    // --- APOLLO HOOKS ---
    const [loginUserMutation, { loading: loginLoading }] = useMutation(LOGIN_USER);
    const [verifyMfaMutation, { loading: mfaLoading }] = useMutation(VERIFY_MFA);
    const [registerUserMutation, { loading: regLoading }] = useMutation(REGISTER_USER);
    const [requestResetMutation, { loading: reqResetLoading }] = useMutation(REQUEST_PASSWORD_RESET);
    const [resetPasswordMutation, { loading: resetLoading }] = useMutation(RESET_PASSWORD);

    // --- FORM STATE ---
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [keepConnected, setKeepConnected] = useState(false);
    const [errors, setErrors] = useState({});

    // --- URL INTERCEPTOR ---
    useEffect(() => {
        const savedEmail = Cookies.get('bored_in_cluj_runner');
        if (savedEmail) {
            setEmail(savedEmail);
            setKeepConnected(true);
        }

        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        if (token) {
            setResetToken(token);
            setIsForgotPassword(true);
        }
    }, []);

    const handleToggleMode = (mode) => {
        setIsLogin(mode);
        setIsForgotPassword(false);
        setIsMfaMode(false);
        setErrors({});
        setPassword('');
        setMfaCode('');
        setSysMessage('');
    };

    const handleMouseMove = (e) => {
        if (!logoRef.current) return;
        const rect = logoRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rotateX = ((y - (rect.height / 2)) / 20) * -1;
        const rotateY = (x - (rect.width / 2)) / 20;
        setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
    };

    const handleMouseLeave = () => setTransform(`perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`);

    const validateForm = () => {
        const newErrors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email.trim()) newErrors.email = "EMAIL ADDRESS REQUIRED.";
        else if (!emailRegex.test(email.trim())) newErrors.email = "INVALID ENCRYPTION PROTOCOL.";

        if (!isForgotPassword && !isMfaMode || resetToken) {
            if (!password) newErrors.password = "ACCESS KEY REQUIRED.";
            else if (password.length < 8) newErrors.password = "KEY MUST BE AT LEAST 8 CHARACTERS.";
        }

        if (!isLogin && !isForgotPassword && !isMfaMode) {
            const userRegex = /^[a-zA-Z0-9_]{3,16}$/;
            if (!username.trim()) newErrors.username = "RUNNER ALIAS REQUIRED.";
            else if (!userRegex.test(username.trim())) newErrors.username = "ALIAS MUST BE 3-16 ALPHANUMERIC CHARS.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // --- PHASE 1: LOGIN REQUEST ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        if (keepConnected) Cookies.set('bored_in_cluj_runner', email.trim(), { expires: 30 });
        else Cookies.remove('bored_in_cluj_runner');

        if (isLogin) {
            try {
                // Fire Phase 1
                const { data } = await loginUserMutation({
                    variables: { email: email.trim(), password }
                });

                if (data.loginUser.accessToken === "MFA_REQUIRED") {
                    setIsMfaMode(true); // Lock the UI into Phase 2
                    setSysMessage("PHASE 1 COMPLETE. OTP SENT TO YOUR SECURE INBOX.");
                    setErrors({});
                }
            } catch (err) {
                setErrors({ password: err.message || "INVALID CREDENTIALS." });
            }
        } else {
            // Register Flow
            try {
                const { data } = await registerUserMutation({
                    variables: { username: username.trim(), email: email.trim(), password }
                });
                // Pass the fully authenticated user object up to App.jsx
                onLogin(data.registerUser);
            } catch (err) {
                setErrors({ username: err.message || "ALIAS OR EMAIL ALREADY IN USE." });
            }
        }
    };

    // --- PHASE 2: MFA VERIFICATION ---
    const handleMfaSubmit = async (e) => {
        e.preventDefault();
        if (!mfaCode || mfaCode.length !== 6) {
            setErrors({ mfaCode: "KEY MUST BE EXACTLY 6 DIGITS." });
            return;
        }

        try {
            const { data } = await verifyMfaMutation({
                variables: { email: email.trim(), code: mfaCode.trim() }
            });

            // Phase 2 Success! Pass the fully authenticated user object up to App.jsx
            onLogin(data.verifyMfa);

        } catch (err) {
            setErrors({ mfaCode: err.message || "INVALID OR EXPIRED ENCRYPTION KEY." });
        }
    };

    // --- RECOVERY HANDLERS ---
    const handleRequestReset = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        try {
            await requestResetMutation({ variables: { email: email.trim() } });
            setSysMessage("IF YOUR EMAIL EXISTS IN THE GRID, A RECOVERY LINK HAS BEEN SENT.");
            setErrors({});
        } catch (err) { setErrors({ email: "NETWORK ERROR." }); }
    };

    const handleApplyNewPassword = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        try {
            await resetPasswordMutation({ variables: { token: resetToken, newPassword: password } });
            window.history.replaceState({}, document.title, "/");
            setSysMessage("ACCESS KEY OVERWRITTEN SUCCESSFULLY. PLEASE LOGIN.");
            setResetToken(null);
            setIsForgotPassword(false);
            setIsLogin(true);
            setPassword('');
        } catch (err) { setErrors({ password: err.message || "INVALID OR EXPIRED TOKEN." }); }
    };

    const isLoading = loginLoading || regLoading || reqResetLoading || resetLoading || mfaLoading;

    return (
        <div className="auth-wrapper">
            <div className="auth-container">
                <div className="auth-pitch" onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
                    <div className="hologram-box" ref={logoRef} style={{ transform: transform }}>
                        <img src={customLogo} alt="Bored In Cluj" className="hologram-logo-image" />
                        <h1 className="cyber-title">BORED IN CLUJ</h1>
                        <div className="pitch-divider"></div>
                        <h2 className="pitch-subtitle">LEVEL UP YOUR REAL LIFE.</h2>
                    </div>
                    <div className="hologram-shadow"></div>
                </div>

                <div className="auth-panel">
                    <div className="panel-header">
                        <button className={`toggle-btn ${isLogin && !isForgotPassword && !isMfaMode ? 'active' : ''}`} onClick={() => handleToggleMode(true)}>SYSTEM LOGIN</button>
                        <button className={`toggle-btn ${!isLogin && !isForgotPassword && !isMfaMode ? 'active' : ''}`} onClick={() => handleToggleMode(false)}>NEW RUNNER</button>
                    </div>

                    {sysMessage && <div className="sys-message-banner" style={{color: '#00ffaa', marginBottom: '15px', textAlign: 'center', fontSize: '0.9rem'}}>{sysMessage}</div>}

                    {/* --- DYNAMIC FORM RENDERING --- */}
                    {isForgotPassword ? (
                        /* RECOVERY MODE */
                        <form className="auth-form slide-in" onSubmit={resetToken ? handleApplyNewPassword : handleRequestReset} noValidate>
                            <h3 style={{color: 'var(--main-color)', marginBottom: '15px', textAlign: 'center'}}>{resetToken ? "OVERWRITE ACCESS KEY" : "RECOVER CLEARANCE"}</h3>
                            {!resetToken ? (
                                <div className="input-group">
                                    <label>ENCRYPTED EMAIL</label>
                                    <input type="email" placeholder="runner@matrix.com" value={email} onChange={(e) => { setEmail(e.target.value); setErrors({...errors, email: ''}); }} className={errors.email ? 'input-error' : ''} />
                                    {errors.email && <span className="cyber-error">{errors.email}</span>}
                                </div>
                            ) : (
                                <div className="input-group">
                                    <label>NEW ACCESS KEY</label>
                                    <input type="password" placeholder="••••••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setErrors({...errors, password: ''}); }} className={errors.password ? 'input-error' : ''} />
                                    {errors.password && <span className="cyber-error">{errors.password}</span>}
                                </div>
                            )}
                            <button type="submit" className="btn-submit" disabled={isLoading}>{isLoading ? 'PROCESSING...' : (resetToken ? 'CONFIRM NEW KEY' : 'TRANSMIT RECOVERY LINK')}</button>
                            <button type="button" className="toggle-btn" style={{marginTop: '15px', width: '100%'}} onClick={() => handleToggleMode(true)}>CANCEL & RETURN</button>
                        </form>
                    ) : isMfaMode ? (
                        /* NEW: MFA PHASE 2 MODE */
                        <form className="auth-form slide-in" onSubmit={handleMfaSubmit} noValidate>
                            <h3 style={{color: '#ffaa00', marginBottom: '15px', textAlign: 'center'}}>SECURITY CLEARANCE</h3>
                            <div className="input-group">
                                <label>6-DIGIT ENCRYPTION KEY</label>
                                <input type="text" placeholder="123456" maxLength={6} value={mfaCode} onChange={(e) => { setMfaCode(e.target.value); setErrors({...errors, mfaCode: ''}); }} className={errors.mfaCode ? 'input-error' : ''} style={{ letterSpacing: '8px', textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold' }} />
                                {errors.mfaCode && <span className="cyber-error">{errors.mfaCode}</span>}
                            </div>
                            <button type="submit" className="btn-submit" disabled={isLoading} style={{backgroundColor: '#ffaa00', color: '#111'}}>
                                {isLoading ? 'VERIFYING...' : 'AUTHORIZE CONNECTION'}
                            </button>
                            <button type="button" className="toggle-btn" style={{marginTop: '15px', width: '100%'}} onClick={() => handleToggleMode(true)}>CANCEL & RETURN</button>
                        </form>
                    ) : (
                        /* STANDARD LOGIN/REGISTER MODE */
                        <form className={`auth-form ${isLogin ? 'slide-in' : 'slide-in-alt'}`} onSubmit={handleSubmit} noValidate>
                            {!isLogin && (
                                <div className="input-group">
                                    <label>RUNNER ALIAS</label>
                                    <input type="text" placeholder="Enter your username..." value={username} onChange={(e) => { setUsername(e.target.value); setErrors({...errors, username: ''}); }} className={errors.username ? 'input-error' : ''} />
                                    {errors.username && <span className="cyber-error">{errors.username}</span>}
                                </div>
                            )}
                            <div className="input-group">
                                <label>ENCRYPTED EMAIL</label>
                                <input type="email" placeholder="runner@matrix.com" value={email} onChange={(e) => { setEmail(e.target.value); setErrors({...errors, email: ''}); }} className={errors.email ? 'input-error' : ''} />
                                {errors.email && <span className="cyber-error">{errors.email}</span>}
                            </div>
                            <div className="input-group">
                                <label>ACCESS KEY</label>
                                <input type="password" placeholder="••••••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setErrors({...errors, password: ''}); }} className={errors.password ? 'input-error' : ''} />
                                {errors.password && <span className="cyber-error">{errors.password}</span>}
                            </div>
                            {isLogin && (
                                <div className="login-options">
                                    <label className="checkbox-label"><input type="checkbox" checked={keepConnected} onChange={(e) => setKeepConnected(e.target.checked)} /> KEEP ME CONNECTED</label>
                                    <button type="button" className="forgot-password-btn" onClick={() => {setIsForgotPassword(true); setSysMessage(''); setErrors({});}}>FORGOT ACCESS KEY?</button>
                                </div>
                            )}
                            <button type="submit" className="btn-submit" disabled={isLoading}>{isLoading ? 'AUTHENTICATING...' : (isLogin ? 'INITIALIZE CONNECTION' : 'REGISTER TO THE GRID')}</button>
                        </form>
                    )}
                    <p className="auth-footer">SECURE CONNECTION ESTABLISHED. v3.0.0</p>
                </div>
            </div>
        </div>
    );
}