import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock all child components ───────────────────────────────────────────────
vi.mock('../AuthPage', () => ({
    default: ({ onLogin }) => <button data-testid="login-btn" onClick={onLogin}>Login</button>
}));
vi.mock('../Hub', () => ({
    default: ({ onFreeRoll, onPaidRoll, onSuggestQuest, isFreeRollAvailable, userTokens, nextFreeRollTime }) => (
        <div data-testid="hub">
            <button data-testid="free-roll" onClick={onFreeRoll}>Free Roll</button>
            <button data-testid="paid-roll" onClick={onPaidRoll}>Paid Roll</button>
            <button data-testid="suggest-quest" onClick={() => onSuggestQuest({
                title: "Test Quest", type: "Exploration",
                description: "desc", backgroundImage: "/img.jpg",
                location: { lat: 0, lng: 0, name: "Somewhere" }, cost: "None",
                conditions: { daytime: ["DAY"], weather: ["SUNNY"], season: ["SUMMER"] }
            })}>Suggest</button>
            <span data-testid="tokens">{userTokens}</span>
            <span data-testid="free-roll-available">{String(isFreeRollAvailable)}</span>
        </div>
    )
}));
vi.mock('../QuestDetail', () => ({
    default: ({ quest, onAbort, onComplete }) => (
        <div data-testid="quest-detail">
            <span data-testid="quest-title">{quest?.title}</span>
            <button data-testid="abort-btn" onClick={onAbort}>Abort</button>
            <button data-testid="complete-btn" onClick={() => onComplete(quest?.id, 4.5)}>Complete</button>
        </div>
    )
}));
vi.mock('../MissionArchive', () => ({
    default: ({ quests, completedQuests, onReplayQuest }) => (
        <div data-testid="archive">
            <button data-testid="replay-btn" onClick={() => onReplayQuest(quests[0])}>Replay</button>
        </div>
    )
}));
vi.mock('../EventsRadar', () => ({
    default: ({ events }) => <div data-testid="events-radar" />
}));
vi.mock('../CityComms', () => ({
    default: ({ userTokens, onConsumeToken, onRollQuest }) => (
        <div data-testid="city-comms">
            <button data-testid="consume-token" onClick={onConsumeToken}>Consume</button>
            <button data-testid="roll-from-comms" onClick={onRollQuest}>Roll</button>
        </div>
    )
}));
vi.mock('../AdminPanel', () => ({
    default: ({ quests, suggestedQuests, onAccept, onReject, events, setQuests, setEvents }) => (
        <div data-testid="admin-panel">
            <button data-testid="accept-btn" onClick={() =>
                onAccept({ id: 's_1', author: 'NeonRunner', title: 'S', type: 'Puzzle',
                    description: 'd', backgroundImage: '/b.jpg',
                    location: { lat: 0, lng: 0, name: 'X' }, cost: 'None',
                    conditions: { daytime: ['DAY'], weather: ['SUNNY'], season: ['SUMMER'] },
                    status: 'Pending', xpReward: 250, difficulty: 3 })
            }>Accept</button>
            <button data-testid="accept-other-btn" onClick={() =>
                onAccept({ id: 's_2', author: 'SomeoneElse', title: 'S2', type: 'Puzzle',
                    description: 'd', backgroundImage: '/b.jpg',
                    location: { lat: 0, lng: 0, name: 'X' }, cost: 'None',
                    conditions: { daytime: ['DAY'], weather: ['SUNNY'], season: ['SUMMER'] },
                    status: 'Pending', xpReward: 250, difficulty: 3 })
            }>Accept Other</button>
            <button data-testid="reject-btn" onClick={() => onReject('s_1')}>Reject</button>
        </div>
    )
}));
vi.mock('../Profile', () => ({
    default: ({ user, onUpdateProfile, onLogout, onAdminClick }) => (
        <div data-testid="profile">
            <button data-testid="logout-btn" onClick={onLogout}>Logout</button>
            <button data-testid="admin-click-btn" onClick={onAdminClick}>Admin</button>
            <button data-testid="update-profile-btn" onClick={() => onUpdateProfile({ username: 'Updated' })}>Update</button>
        </div>
    )
}));

// ─── Mock static assets ───────────────────────────────────────────────────────
vi.mock('../assets/main-logo.png', () => ({ default: 'logo.png' }));
vi.mock('../App.css', () => ({}));

// ─── Mock js-cookie ───────────────────────────────────────────────────────────
const cookieStore = {};
vi.mock('js-cookie', () => ({
    default: {
        get: vi.fn((key) => cookieStore[key]),
        set: vi.fn((key, value) => { cookieStore[key] = value; }),
        remove: vi.fn((key) => { delete cookieStore[key]; }),
    }
}));

// ─── Mock navigator.onLine ────────────────────────────────────────────────────
Object.defineProperty(navigator, 'onLine', { writable: true, value: true });

// ─── Import App AFTER all mocks are in place ─────────────────────────────────
import App from '../App';
import Cookies from 'js-cookie';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const renderApp = () => render(<App />);

describe('App', () => {
    beforeEach(() => {
        // Clear cookie store and reset mocks before each test
        Object.keys(cookieStore).forEach(k => delete cookieStore[k]);
        vi.clearAllMocks();
        navigator.onLine = true;
        // Silence window.alert
        vi.spyOn(window, 'alert').mockImplementation(() => {});
        // Default: no saved screen cookie → shows login
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── Rendering & initial state ─────────────────────────────────────────────

    it('renders login screen by default when no cookie is set', () => {
        renderApp();
        expect(screen.getByTestId('login-btn')).toBeTruthy();
    });

    it('reads screen from cookie and restores saved screen (hub)', () => {
        cookieStore['bored_in_cluj_screen'] = 'hub';
        renderApp();
        expect(screen.getByTestId('hub')).toBeTruthy();
    });

    it('reads and restores active quest from cookie', () => {
        const quest = { id: 'q_101', title: 'Midnight Kurtoskalacs Run' };
        cookieStore['bored_in_cluj_active_quest'] = JSON.stringify(quest);
        cookieStore['bored_in_cluj_screen'] = 'questDetail';
        renderApp();
        expect(screen.getByTestId('quest-detail')).toBeTruthy();
    });

    it('reads roll timer from cookie and marks free roll as unavailable', () => {
        // Set a future timestamp (12 hours from now)
        cookieStore['bored_in_cluj_roll_time'] = String(Date.now() + 43200000);
        cookieStore['bored_in_cluj_screen'] = 'hub';
        renderApp();
        expect(screen.getByTestId('free-roll-available').textContent).toBe('false');
    });

    it('applies saved theme from cookie on mount', () => {
        cookieStore['bored_in_cluj_theme'] = 'red';
        renderApp();
        expect(document.documentElement.getAttribute('data-theme')).toBe('red');
    });

    it('defaults theme to blue when no cookie', () => {
        renderApp();
        expect(document.documentElement.getAttribute('data-theme')).toBe('blue');
    });

    // ── Login flow ────────────────────────────────────────────────────────────

    it('navigates to hub after login', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        expect(screen.getByTestId('hub')).toBeTruthy();
    });

    // ── Navigation ────────────────────────────────────────────────────────────

    it('shows navbar only when not on login screen', () => {
        renderApp();
        expect(screen.queryByRole('navigation')).toBeNull();
        fireEvent.click(screen.getByTestId('login-btn'));
        expect(screen.getByRole('navigation')).toBeTruthy();
    });

    it('shows footer only when not on login screen', () => {
        renderApp();
        expect(screen.queryByText(/BoredInCluj/)).toBeNull();
        fireEvent.click(screen.getByTestId('login-btn'));
        expect(screen.getByText(/BoredInCluj/)).toBeTruthy();
    });

    const loginAndNavigate = (testId) => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn')); // hub
        fireEvent.click(screen.getByTestId(testId));
    };

    it('navigates to archive screen', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        // Click the "Quests" nav button (archive)
        const navBtns = screen.getAllByRole('button');
        const archiveBtn = navBtns.find(b => b.textContent.includes('Quests'));
        fireEvent.click(archiveBtn);
        expect(screen.getByTestId('archive')).toBeTruthy();
    });

    it('navigates to events/radar screen', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        const navBtns = screen.getAllByRole('button');
        const eventsBtn = navBtns.find(b => b.textContent.includes('Events'));
        fireEvent.click(eventsBtn);
        expect(screen.getByTestId('events-radar')).toBeTruthy();
    });

    it('navigates to comms/forum screen', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        const navBtns = screen.getAllByRole('button');
        const forumBtn = navBtns.find(b => b.textContent.includes('Forum'));
        fireEvent.click(forumBtn);
        expect(screen.getByTestId('city-comms')).toBeTruthy();
    });

    it('navigates to profile screen', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        const navBtns = screen.getAllByRole('button');
        const profileBtn = navBtns.find(b => b.textContent.includes('Profile'));
        fireEvent.click(profileBtn);
        expect(screen.getByTestId('profile')).toBeTruthy();
    });

    it('clicking brand logo navigates to hub when no active quest', () => {
        // Set the cookie to boot directly into the profile screen
        cookieStore['bored_in_cluj_screen'] = 'profile';
        renderApp();

        // Since we are already in the app, just click the brand logo
        const brand = document.querySelector('.nav-brand');
        fireEvent.click(brand);

        // Verify it routed back to the hub
        expect(screen.getByTestId('hub')).toBeTruthy();
    });

    // ── Mobile menu ───────────────────────────────────────────────────────────

    it('toggles mobile menu open and closed', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        const hamburger = document.querySelector('.hamburger-btn');
        fireEvent.click(hamburger); // open
        expect(document.querySelector('.nav-links.mobile-open')).toBeTruthy();
        fireEvent.click(hamburger); // close
        expect(document.querySelector('.nav-links.mobile-open')).toBeNull();
    });

    it('closes mobile menu when overlay is clicked', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        const hamburger = document.querySelector('.hamburger-btn');
        fireEvent.click(hamburger); // open
        const overlay = document.querySelector('.mobile-overlay');
        fireEvent.click(overlay); // close via overlay
        expect(document.querySelector('.nav-links.mobile-open')).toBeNull();
    });

    it('closes mobile menu when a nav item is clicked', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        const hamburger = document.querySelector('.hamburger-btn');
        fireEvent.click(hamburger); // open
        const navBtns = screen.getAllByRole('button');
        const eventsBtn = navBtns.find(b => b.textContent.includes('Events'));
        fireEvent.click(eventsBtn);
        expect(document.querySelector('.nav-links.mobile-open')).toBeNull();
    });

    // ── Quest flows ───────────────────────────────────────────────────────────

    it('handles free roll: navigates to questDetail', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        fireEvent.click(screen.getByTestId('free-roll'));
        expect(screen.getByTestId('quest-detail')).toBeTruthy();
    });

    it('handles paid roll: deducts a token', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        const tokensBefore = parseInt(screen.getByTestId('tokens').textContent);

        // Roll the quest (Navigates to quest-detail)
        fireEvent.click(screen.getByTestId('paid-roll'));

        // Abort the quest (Clears active quest and returns to hub)
        fireEvent.click(screen.getByTestId('abort-btn'));

        // Now the hub is rendered and we can check the tokens
        const tokensAfter = parseInt(screen.getByTestId('tokens').textContent);
        expect(tokensAfter).toBe(tokensBefore - 1);
    });
    it('handles abort quest: returns to hub and clears active quest', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        fireEvent.click(screen.getByTestId('free-roll'));
        expect(screen.getByTestId('quest-detail')).toBeTruthy();
        fireEvent.click(screen.getByTestId('abort-btn'));
        expect(screen.getByTestId('hub')).toBeTruthy();
    });

    it('handles quest complete: awards XP, navigates to archive', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        fireEvent.click(screen.getByTestId('free-roll'));
        fireEvent.click(screen.getByTestId('complete-btn'));
        expect(window.alert).toHaveBeenCalled();
        expect(screen.getByTestId('archive')).toBeTruthy();
    });

    it('brand logo navigates to questDetail when active quest is set', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        fireEvent.click(screen.getByTestId('free-roll')); // sets active quest, goes to questDetail
        // Navigate away
        const navBtns = screen.getAllByRole('button');
        const archiveBtn = navBtns.find(b => b.textContent.includes('Quests'));
        fireEvent.click(archiveBtn);
        // Click brand
        const brand = document.querySelector('.nav-brand');
        fireEvent.click(brand);
        expect(screen.getByTestId('quest-detail')).toBeTruthy();
    });

    it('home nav button goes to questDetail when active quest exists', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        fireEvent.click(screen.getByTestId('free-roll')); // active quest set
        // Navigate away to archive
        const allBtns = () => screen.getAllByRole('button');
        const archiveBtn = allBtns().find(b => b.textContent.includes('Quests'));
        fireEvent.click(archiveBtn);
        // Click home nav btn
        const homeBtn = allBtns().find(b => b.className?.includes('nav-btn-home'));
        fireEvent.click(homeBtn);
        expect(screen.getByTestId('quest-detail')).toBeTruthy();
    });

    it('live badge shows on home nav when active quest exists', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        fireEvent.click(screen.getByTestId('free-roll'));
        expect(document.querySelector('.live-badge')).toBeTruthy();
    });

    // ── Suggest quest ─────────────────────────────────────────────────────────

    it('handles suggest quest submission and shows alert', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        fireEvent.click(screen.getByTestId('suggest-quest'));
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Admin will review'));
    });

    // ── Archive / replay ──────────────────────────────────────────────────────

    it('replays a quest from archive', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        const navBtns = screen.getAllByRole('button');
        const archiveBtn = navBtns.find(b => b.textContent.includes('Quests'));
        fireEvent.click(archiveBtn);
        fireEvent.click(screen.getByTestId('replay-btn'));
        expect(screen.getByTestId('quest-detail')).toBeTruthy();
    });

    // ── Admin panel ───────────────────────────────────────────────────────────

    it('navigates to admin from profile', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        const navBtns = screen.getAllByRole('button');
        const profileBtn = navBtns.find(b => b.textContent.includes('Profile'));
        fireEvent.click(profileBtn);
        fireEvent.click(screen.getByTestId('admin-click-btn'));
        expect(screen.getByTestId('admin-panel')).toBeTruthy();
    });

    it('accepts a suggestion authored by current user: awards tokens and alert', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        // First suggest a quest so suggestedQuests has an entry
        fireEvent.click(screen.getByTestId('suggest-quest'));
        // Go to admin
        const navBtns = screen.getAllByRole('button');
        const profileBtn = navBtns.find(b => b.textContent.includes('Profile'));
        fireEvent.click(profileBtn);
        fireEvent.click(screen.getByTestId('admin-click-btn'));
        // Accept (author = NeonRunner = current user)
        fireEvent.click(screen.getByTestId('accept-btn'));
        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Pixel Coins'));
    });

    it('accepts a suggestion authored by someone else: no token alert', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        const navBtns = screen.getAllByRole('button');
        const profileBtn = navBtns.find(b => b.textContent.includes('Profile'));
        fireEvent.click(profileBtn);
        fireEvent.click(screen.getByTestId('admin-click-btn'));
        fireEvent.click(screen.getByTestId('accept-other-btn'));
        // alert should NOT have been called for token award
        expect(window.alert).not.toHaveBeenCalledWith(expect.stringContaining('Pixel Coins'));
    });

    it('rejects a suggestion', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        const navBtns = screen.getAllByRole('button');
        const profileBtn = navBtns.find(b => b.textContent.includes('Profile'));
        fireEvent.click(profileBtn);
        fireEvent.click(screen.getByTestId('admin-click-btn'));
        // Should not throw
        fireEvent.click(screen.getByTestId('reject-btn'));
    });

    // ── Profile ───────────────────────────────────────────────────────────────

    it('logs out from profile and returns to login', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        const navBtns = screen.getAllByRole('button');
        const profileBtn = navBtns.find(b => b.textContent.includes('Profile'));
        fireEvent.click(profileBtn);
        fireEvent.click(screen.getByTestId('logout-btn'));
        expect(screen.getByTestId('login-btn')).toBeTruthy();
    });

    it('updates user profile data', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        const navBtns = screen.getAllByRole('button');
        const profileBtn = navBtns.find(b => b.textContent.includes('Profile'));
        fireEvent.click(profileBtn);
        fireEvent.click(screen.getByTestId('update-profile-btn'));
        // No crash = pass; updated state is internal
    });

    // ── CityComms token consumption ───────────────────────────────────────────

    it('consuming token from comms decrements token count', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        const tokensBefore = parseInt(screen.getByTestId('tokens').textContent);
        const navBtns = screen.getAllByRole('button');
        const forumBtn = navBtns.find(b => b.textContent.includes('Forum'));
        fireEvent.click(forumBtn);
        fireEvent.click(screen.getByTestId('consume-token'));
        // Navigate back to hub to check tokens
        const navBtns2 = screen.getAllByRole('button');
        const homeBtn = navBtns2.find(b => b.className?.includes('nav-btn-home'));
        fireEvent.click(homeBtn);
        const tokensAfter = parseInt(screen.getByTestId('tokens').textContent);
        expect(tokensAfter).toBe(tokensBefore - 1);
    });

    it('rolling quest from comms navigates to questDetail', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        const navBtns = screen.getAllByRole('button');
        const forumBtn = navBtns.find(b => b.textContent.includes('Forum'));
        fireEvent.click(forumBtn);
        fireEvent.click(screen.getByTestId('roll-from-comms'));
        expect(screen.getByTestId('quest-detail')).toBeTruthy();
    });

    // ── Network banner ────────────────────────────────────────────────────────

    it('shows offline banner when navigator.onLine is false', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        act(() => {
            navigator.onLine = false;
            window.dispatchEvent(new Event('offline'));
        });
        expect(screen.getByText(/NETWORK DISCONNECTED/)).toBeTruthy();
    });

    it('hides offline banner when back online', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        act(() => {
            navigator.onLine = false;
            window.dispatchEvent(new Event('offline'));
        });
        expect(screen.getByText(/NETWORK DISCONNECTED/)).toBeTruthy();
        act(() => {
            navigator.onLine = true;
            window.dispatchEvent(new Event('online'));
        });
        expect(screen.queryByText(/NETWORK DISCONNECTED/)).toBeNull();
    });

    // ── Cookie persistence ────────────────────────────────────────────────────

    it('writes screen to cookie when screen changes', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        expect(Cookies.set).toHaveBeenCalledWith('bored_in_cluj_screen', 'hub', expect.anything());
    });

    it('writes active quest cookie when quest is set', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        fireEvent.click(screen.getByTestId('free-roll'));
        expect(Cookies.set).toHaveBeenCalledWith('bored_in_cluj_active_quest', expect.any(String), expect.anything());
    });

    it('removes active quest cookie when quest is cleared (abort)', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        fireEvent.click(screen.getByTestId('free-roll'));
        fireEvent.click(screen.getByTestId('abort-btn'));
        expect(Cookies.remove).toHaveBeenCalledWith('bored_in_cluj_active_quest');
    });

    it('writes roll timer cookie after free roll', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));
        fireEvent.click(screen.getByTestId('free-roll'));
        expect(Cookies.set).toHaveBeenCalledWith('bored_in_cluj_roll_time', expect.any(Number), expect.anything());
    });

    // ── Fallthrough / default route ───────────────────────────────────────────

    it('renders hub for unknown/default screen value', () => {
        cookieStore['bored_in_cluj_screen'] = 'nonexistent_screen';
        renderApp();
        expect(screen.getByTestId('hub')).toBeTruthy();
    });

    // ── startRandomQuest with all quests completed ────────────────────────────

    it('rolls from all quests when all viable quests are already completed', () => {
        renderApp();
        fireEvent.click(screen.getByTestId('login-btn'));

        // Loop 3 times to exhaust the remaining uncompleted quests
        for (let i = 0; i < 3; i++) {
            fireEvent.click(screen.getByTestId('paid-roll')); // Rolls quest
            fireEvent.click(screen.getByTestId('complete-btn')); // Completes quest -> Goes to Archive

            // Navigate back to the Hub so we can roll again
            const brand = document.querySelector('.nav-brand');
            fireEvent.click(brand);
        }

        // If the test survived the loop without throwing an error,
        // the fallback branch successfully fired!
        expect(screen.getByTestId('hub')).toBeTruthy();
    });});