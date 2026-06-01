import React, { useState, useEffect } from 'react';
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { ApolloProvider, useQuery, useMutation} from '@apollo/client/react';
import { setContext } from '@apollo/client/link/context';
import { gql } from '@apollo/client/core';
import Cookies from 'js-cookie';
import AuthPage from './AuthPage';
import Hub from './Hub';
import customLogo from './assets/main-logo.png';
import MissionArchive from './MissionArchive';
import QuestDetail from './QuestDetail';
import EventsRadar from './EventsRadar';
import CityComms from './CityComms';
import Profile from './Profile';
import AdminPanel from './AdminPanel'
import './App.css';

const QUEUE_KEY = 'bored_in_cluj_offline_queue';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://10.200.251.90:8000';

const httpLink = new HttpLink({ uri: `${API_BASE_URL}/graphql` });

const authLink = setContext((_, { headers }) => {
    const token = localStorage.getItem('session_token');
    return {
        headers: {
            ...headers,
            authorization: token ? `Bearer ${token}` : "",
        }
    }
});

const client = new ApolloClient({
    cache: new InMemoryCache(),
    link: authLink.concat(httpLink),
});

const GET_QUESTS = gql`
  query GetAllQuests {
    allQuests {
      id
      title
      type
      author
      description
      difficulty
      cost
      xpReward
      status
      backgroundImage
      location { name lat lng }
      conditions { daytime weather season }
    }
  }
`;

const GET_EVENTS = gql`
  query GetAllEvents {
    allEvents {
      id
      title
      description
      dateTime
      location
      imageUrl
    }
  }
`;

const GET_USER_PROFILE = gql`
  query GetUserProfile($username: String!) {
    getUserProfile(username: $username) {
      username
      tokens
      level
      rank
      isAdmin
    }
  }
`;

const CONSUME_TOKEN_MUTATION = gql`
  mutation ConsumeToken($username: String!) {
    consumeToken(username: $username)
  }
`;

const LOGIN_USER = gql`
  mutation LoginUser($email: String!, $password: String!) {
    loginUser(email: $email, password: $password) {
      username
      avatar
      isAdmin
      tokens
      accessToken
    }
  }
`;

const enqueueRequest = (requestData) => {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
    queue.push(requestData);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`[SYNC ENGINE] Request queued. Total pending: ${queue.length}`);
};

const smartFetch = async (endpoint, options = {}) => {
    const isMutation = options.method && ['POST', 'PUT', 'DELETE'].includes(options.method.toUpperCase());
    const url = `${API_BASE_URL}${endpoint}`;

    if (!navigator.onLine && isMutation) {
        console.warn('[SYNC ENGINE] Network down. Intercepting request.');
        enqueueRequest({ endpoint, options });
        return { ok: true, queued: true };
    }

    try {
        const response = await fetch(url, options);
        return response;
    } catch (error) {
        if (isMutation) {
            console.error('[SYNC ENGINE] Server unreachable. Intercepting request.');
            enqueueRequest({ endpoint, options });
            return { ok: true, queued: true };
        }
        throw error;
    }
};

// --- MOCK DATABASE (For Initial State Fallback) ---
const complexQuestsDB = [
    {
        id: "q_1", title: "Midnight Kurtoskalacs Run", type: "Food", author: "Admin",
        description: "Find the late-night bakery on Piata Muzeului and secure the goods. Submit photo of the pastry.",
        backgroundImage: "/assets/kurtos.jpg", location: { lat: 46.7712, lng: 23.5905, name: "Piata Muzeului" },
        difficulty: 3, cost: "Cheap",
        conditions: { daytime: ["NIGHT"], weather: ["CLEAR", "CLOUDY"], season: ["WINTER", "AUTUMN", "SPRING", "SUMMER"] },
        status: "Active",
        xpReward: 250
    },
    {
        id: "q_2", title: "Central Park Stray Rescue", type: "Exploration", author: "NeonRunner",
        description: "Locate and feed a stray cat in Central Park. AI will verify the feline presence.",
        backgroundImage: "/assets/cat.jpg", location: { lat: 46.7693, lng: 23.5800, name: "Central Park" },
        difficulty: 2, cost: "Cheap",
        conditions: { daytime: ["DAY"], weather: ["SUNNY", "CLOUDY"], season: ["SPRING", "SUMMER"] },
        status: "Active",
        xpReward: 250
    }
];

function MainApp() {
// --- GLOBAL STATE ---
    const [currentScreen, setCurrentScreen] = useState(Cookies.get('bored_in_cluj_screen') || 'login');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        Cookies.set('bored_in_cluj_screen', currentScreen, { expires: 7 });
    }, [currentScreen]);

    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Initial load parameters safely predefined with 5 tokens on account bootstrap
    // Read from cookie first! If empty, default to nothing so it forces a login.
    const [user, setUser] = useState({
        username: Cookies.get('bored_in_cluj_username') || "",
        tokens: null,
        isAdmin: false,
        avatar: "Runner1",
        completedQuests: [],
        currentXp: 8450,
        xpToNext: 10000,
        reputation: 142,
        badges: ["Night Owl", "First Blood"]
    });

    const { data: questData, loading: questsLoading } = useQuery(GET_QUESTS);
    const { data: eventData } = useQuery(GET_EVENTS);
    const { data: profileData, refetch: refetchProfile } = useQuery(GET_USER_PROFILE, {
        variables: { username: user.username },
        fetchPolicy: 'network-only',
        skip: !user.username
    });

    const [quests, setQuests] = useState(complexQuestsDB);
    const [events, setEvents] = useState([]);
    const [suggestedQuests, setSuggestedQuests] = useState([]);
    const [consumeTokenDb] = useMutation(CONSUME_TOKEN_MUTATION);
    const [loginUserMutation, { loading, error }] = useMutation(LOGIN_USER);

    useEffect(() => {
        if (questData && questData.allQuests) {
            setQuests(questData.allQuests);
        }
    }, [questData]);

    useEffect(() => {
        if (eventData && eventData.allEvents) {
            setEvents(eventData.allEvents);
        }
    }, [eventData]);

    // SECURE SYNCHRONIZATION EFFECT: Merges DB tokens, maps 999 for admins, retains XP data strings
    useEffect(() => {
        if (profileData && profileData.getUserProfile) {
            const dbUser = profileData.getUserProfile;
            setUser(prev => ({
                ...prev, // Spread operator guards currentXp, reputation, badges, etc.
                tokens: dbUser.isAdmin ? 999 : (dbUser.tokens !== undefined && dbUser.tokens !== null ? dbUser.tokens : 5),
                isAdmin: dbUser.isAdmin,
                level: dbUser.level,
                rank: dbUser.rank
            }));
        }
    }, [profileData]);

// --- ACTIVE QUEST & TIMER STATE ---
    const [activeQuest, setActiveQuest] = useState(
        Cookies.get('bored_in_cluj_active_quest') ? JSON.parse(Cookies.get('bored_in_cluj_active_quest')) : null
    );

    const [nextFreeRollTime, setNextFreeRollTime] = useState(
        Cookies.get('bored_in_cluj_roll_time') ? parseInt(Cookies.get('bored_in_cluj_roll_time')) : null
    );
    const isFreeRollAvailable = !nextFreeRollTime || Date.now() > nextFreeRollTime;

    useEffect(() => {
        if (activeQuest) {
            Cookies.set('bored_in_cluj_active_quest', JSON.stringify(activeQuest), { expires: 7 });
        } else {
            Cookies.remove('bored_in_cluj_active_quest');
        }
    }, [activeQuest]);

    useEffect(() => {
        if (nextFreeRollTime) {
            Cookies.set('bored_in_cluj_roll_time', nextFreeRollTime, { expires: 1 });
        }
    }, [nextFreeRollTime]);

    useEffect(() => {
        const savedTheme = Cookies.get('bored_in_cluj_theme') || 'blue';
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    // --- RECOVERY PROTOCOL & NETWORK LISTENERS ---
    useEffect(() => {
        const handleOnline = async () => {
            setIsOnline(true);
            const queue = JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
            if (queue.length > 0) {
                console.log(`[SYNC ENGINE] Connection re-established. Syncing ${queue.length} payloads...`);
                for (const req of queue) {
                    try {
                        await fetch(`${API_BASE_URL}${req.endpoint}`, req.options);
                    } catch (error) {
                        console.error('[SYNC ENGINE] Sync failed for payload:', error);
                    }
                }
                localStorage.removeItem(QUEUE_KEY);
                console.log('[SYNC ENGINE] Synchronization complete.');
            }
        };

        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // --- LOGIC FUNCTIONS ---
    const handleLogin = (userData) => {
        // 1. Save the MFA Passport
        localStorage.setItem('session_token', userData.accessToken);

        // 2. KILL THE GHOST: Explicitly overwrite the old username cookie!
        Cookies.set('bored_in_cluj_username', userData.username, { expires: 7 });

        // 3. Update the React user state
        setUser(prev => ({
            ...prev,
            username: userData.username,
            isAdmin: userData.isAdmin,
            tokens: userData.tokens,
            avatar: userData.avatar || "Runner1"
        }));

        // 4. Drop the firewall
        setCurrentScreen('hub');
    };
    const handleLogout = () => {
        // 1. Destroy the cryptographic passport
        localStorage.removeItem('session_token');

        // 2. Wipe the React state
        setUser(null);

        // 3. Boot them back to the login screen
        setCurrentScreen('login');
    };

    const startRandomQuest = () => {
        let viableQuests = quests.filter(q =>
            !user.completedQuests.some(cq => cq.questId === q.id) && q.status === "Active"
        );
        if (viableQuests.length === 0) viableQuests = quests;

        const rolledQuest = viableQuests[Math.floor(Math.random() * viableQuests.length)];
        setActiveQuest(rolledQuest);
        setCurrentScreen('questDetail');
    };

    const handleFreeRoll = () => {
        setNextFreeRollTime(Date.now() + 43200000);
        startRandomQuest();
    };

    // PAID ROLL HANDLER: Handles absolute value evaluation, admin bypasses, and continuous flow logic
    const handlePaidRoll = async () => {
        if (user.isAdmin) {
            startRandomQuest();
            return;
        }

        if (user.tokens !== null && user.tokens < 1) {
            return alert("INSUFFICIENT TOKENS.");
        }

        setUser(prev => ({ ...prev, tokens: prev.tokens - 1 }));

        try {
            await consumeTokenDb({ variables: { username: user.username } });
            startRandomQuest();
        } catch (err) {
            console.error("Failed to persist token spend transaction.", err);
            alert("Transaction interrupted. Reverting state.");
            if (profileData && profileData.getUserProfile) {
                setUser(prev => ({ ...prev, tokens: profileData.getUserProfile.tokens }));
            }
        }
    };

    const handleAbortQuest = () => {
        setActiveQuest(null);
        setCurrentScreen('hub');
    };

    const handleQuestComplete = async (questId, rating) => {
        const completedRecord = { questId, bestRating: rating, completedAt: new Date().toISOString() };
        setUser(prevUser => ({
            ...prevUser,
            currentXp: prevUser.currentXp + (quests.find(q => q.id === questId)?.xpReward || 250),
            completedQuests: [...prevUser.completedQuests, completedRecord]
        }));
        setActiveQuest(null);
        alert(`Tokens and XP awarded! Rating: ${rating} stars.`);
        setCurrentScreen('archive');

        const questToUpdate = quests.find(q => q.id === questId);
        if (questToUpdate) {
            await smartFetch(`/api/quests/${questId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(questToUpdate)
            });
        }
    };

    const handleSuggestQuest = async (questData) => {
        const newSuggestion = {
            ...questData,
            id: "s_" + Date.now(),
            author: user.username,
            status: "Pending",
            xpReward: 250,
            difficulty: 3
        };

        setSuggestedQuests([newSuggestion, ...suggestedQuests]);
        alert("Quest submitted! An Admin will review it shortly.");

        await smartFetch('/api/quests/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSuggestion)
        });
    };

    const handleAcceptSuggestion = async (suggestion) => {
        if (suggestion.author === user.username) {
            setUser(prev => ({ ...prev, tokens: prev.isAdmin ? 999 : prev.tokens + 3 }));
            alert(`Suggestion Approved! You earned 3 Pixel Coins.`);
        }
        const newQuest = { ...suggestion, id: "q_" + Date.now(), status: "Active" };
        setQuests([newQuest, ...quests]);
        setSuggestedQuests(suggestedQuests.filter(q => q.id !== suggestion.id));

        await smartFetch('/api/quests/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newQuest)
        });
    };

    const handleRejectSuggestion = (id) => {
        setSuggestedQuests(suggestedQuests.filter(q => q.id !== id));
    };

    const navigateTo = (screen) => {
        setCurrentScreen(screen);
        setIsMobileMenuOpen(false);
    };

    const renderScreen = () => {
        // Safe string fallback transformation to explicitly render "0" when tokens drop to zero
        const cleanTokenCounterVal = user.tokens !== null && user.tokens !== undefined ? user.tokens : 5;

        switch(currentScreen) {
            case 'login': return <AuthPage onLogin={handleLogin} />;
            case 'hub': return <Hub userTokens={cleanTokenCounterVal} isFreeRollAvailable={isFreeRollAvailable} nextFreeRollTime={nextFreeRollTime} onFreeRoll={handleFreeRoll} onPaidRoll={handlePaidRoll} onSuggestQuest={handleSuggestQuest} />;
            case 'questDetail': return <QuestDetail quest={activeQuest} onAbort={handleAbortQuest} onComplete={handleQuestComplete} />;
            case 'archive': return <MissionArchive quests={quests} completedQuests={user.completedQuests} onReplayQuest={(questToReplay) => { setActiveQuest(questToReplay); setCurrentScreen('questDetail'); }} />;
            case 'radar': return <EventsRadar events={events} />;
            case 'comms': return (
                <CityComms
                    user={user}
                    userTokens={cleanTokenCounterVal}
                    onConsumeToken={async () => {
                        if (user.isAdmin) return;
                        setUser(prev => ({ ...prev, tokens: prev.tokens - 1 }));
                        await consumeTokenDb({ variables: { username: user.username } });
                    }}
                    onRollQuest={handlePaidRoll}
                    smartFetch={smartFetch}
                />
            );
            case 'admin': return <AdminPanel
                quests={quests}
                setQuests={setQuests}
                suggestedQuests={suggestedQuests}
                onAccept={handleAcceptSuggestion}
                onReject={handleRejectSuggestion}
                events={events}
                setEvents={setEvents}
                smartFetch={smartFetch}
            />;
            case 'profile': return (
                <Profile
                    user={user}
                    onUpdateProfile={(updatedData) => setUser(prev => ({ ...prev, ...updatedData }))}
                    onLogout={() => {
                        // --- DESTROY THE SECURE TOKEN & GHOST COOKIE ---
                        localStorage.removeItem('session_token');
                        Cookies.remove('bored_in_cluj_username'); // <--- Shreds the ghost!
                        Cookies.remove('bored_in_cluj_active_quest');

                        // Reset to the default empty state
                        setUser({
                            username: "",
                            tokens: null,
                            isAdmin: false,
                            avatar: "Runner1",
                            completedQuests: [],
                            currentXp: 8450,
                            xpToNext: 10000,
                            reputation: 142,
                            badges: []
                        });
                        setCurrentScreen('login');
                    }}
                    onAdminClick={() => setCurrentScreen('admin')}
                />
            );
            default: return <Hub userTokens={cleanTokenCounterVal} isFreeRollAvailable={isFreeRollAvailable} nextFreeRollTime={nextFreeRollTime} onFreeRoll={handleFreeRoll} onPaidRoll={handlePaidRoll} onSuggestQuest={handleSuggestQuest} />;
        }
    };

    return (
        <div className="app-wrapper">
            <div className="cyber-grid"></div>
            <div className="scanline-overlay"></div>

            {!isOnline && <div className="hud-banner offline-banner">⚠️ WARNING: NETWORK DISCONNECTED. OFFLINE MODE ACTIVE.</div>}

            {currentScreen !== 'login' && (
                <>
                    <div className={`mobile-overlay ${isMobileMenuOpen ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}></div>
                    <nav className="top-navbar">
                        <div className="nav-brand" onClick={() => navigateTo(activeQuest ? 'questDetail' : 'hub')}>
                            <img src={customLogo} alt="Logo" className="nav-logo-mini" />
                            <span className="brand-text">BOREDINCLUJ</span>
                        </div>

                        <button className="hamburger-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                {isMobileMenuOpen ? (
                                    <><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></>
                                ) : (
                                    <><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></>
                                )}
                            </svg>
                        </button>

                        <div className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
                            <button onClick={() => navigateTo(activeQuest ? 'questDetail' : 'hub')} className={`nav-btn nav-btn-home ${currentScreen === 'hub' || currentScreen === 'questDetail' ? 'active' : ''}`}>
                                {activeQuest && <span className="live-badge">LIVE</span>}
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> Home
                            </button>
                            <button onClick={() => navigateTo('archive')} className={`nav-btn ${currentScreen === 'archive' ? 'active' : ''}`}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg> Quests
                            </button>
                            <button onClick={() => navigateTo('radar')} className={`nav-btn ${currentScreen === 'radar' ? 'active' : ''}`}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Events
                            </button>
                            <button onClick={() => navigateTo('comms')} className={`nav-btn ${currentScreen === 'comms' ? 'active' : ''}`}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> Forum
                            </button>
                            <button onClick={() => navigateTo('profile')} className={`nav-btn profile-btn ${currentScreen === 'profile' ? 'active' : ''}`}>
                                <img src={user.avatar && user.avatar.startsWith('blob:') ? user.avatar : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.avatar || 'Runner1'}`} alt="Avatar" className="nav-avatar" /> Profile
                            </button>
                        </div>
                    </nav>
                </>
            )}

            <div key={currentScreen} className="page-transition">
                {renderScreen()}
            </div>

        </div>
    );
}

export default function App() {
    return (
        <ApolloProvider client={client}>
            <MainApp />
        </ApolloProvider>
    );
}