// src/__tests__/AdminPanel.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdminPanel from '../AdminPanel';

vi.mock('./AdminPanel.css', () => ({}));

const mockQuests = [
    {
        id: 'q_101', title: 'Midnight Run', type: 'Food', author: 'Admin',
        description: 'Find the bakery.', difficulty: 3, cost: 'Cheap',
        xpReward: 250, status: 'Active',
        location: { name: 'Piata Muzeului', lat: 46.77, lng: 23.59 },
        conditions: { daytime: ['NIGHT'], weather: ['CLEAR'], season: ['WINTER'] },
        backgroundImage: null,
    },
    {
        id: 'q_102', title: 'Park Rescue', type: 'Exploration', author: 'Admin',
        description: 'Find a stray cat.', difficulty: 2, cost: 'Cheap',
        xpReward: 200, status: 'Archived',
        location: { name: 'Central Park', lat: 46.77, lng: 23.58 },
        conditions: { daytime: ['DAY'], weather: ['SUNNY'], season: ['SPRING'] },
        backgroundImage: null,
    },
];

const mockEvents = [
    {
        id: 'e_301', name: 'Synthwave Rave', description: 'Local DJs.',
        location: { name: 'Form Space', lat: 46.77, lng: 23.59 },
        date: new Date(Date.now() + 86400000).toISOString(),
        photo: null,
    },
];

const mockSuggestions = [
    {
        id: 's_1', title: 'Suggested Quest', author: 'User1',
        description: 'Cool quest idea.', location: { name: 'Old Town' },
        status: 'Pending',
    },
];

const renderAdmin = (overrides = {}) => {
    const props = {
        quests: mockQuests,
        setQuests: vi.fn(),
        suggestedQuests: [],
        onAccept: vi.fn(),
        onReject: vi.fn(),
        events: mockEvents,
        setEvents: vi.fn(),
        ...overrides,
    };
    render(<AdminPanel {...props} />);
    return props;
};

// Helper: open the quest modal and return the modal element
const openNewQuestModal = () => {
    fireEvent.click(screen.getByText('+ NEW QUEST'));
    return document.querySelector('.admin-modal-content');
};

// ─── Render & Tabs ────────────────────────────────────────────────────────────

describe('AdminPanel – Render & Tabs', () => {
    it('renders the ADMIN DASHBOARD title', () => {
        renderAdmin();
        expect(screen.getByText('ADMIN DASHBOARD')).toBeInTheDocument();
    });

    it('renders QUESTS, EVENTS, SUGGESTIONS tabs', () => {
        renderAdmin();
        expect(screen.getByText('QUESTS')).toBeInTheDocument();
        expect(screen.getByText('EVENTS')).toBeInTheDocument();
        expect(screen.getByText('SUGGESTIONS')).toBeInTheDocument();
    });

    it('shows quests table by default', () => {
        renderAdmin();
        expect(screen.getByText('Midnight Run')).toBeInTheDocument();
        expect(screen.getByText('Park Rescue')).toBeInTheDocument();
    });

    it('switches to events tab', () => {
        renderAdmin();
        fireEvent.click(screen.getByText('EVENTS'));
        expect(screen.getByText('Synthwave Rave')).toBeInTheDocument();
    });

    it('switches to suggestions tab', () => {
        renderAdmin();
        fireEvent.click(screen.getByText('SUGGESTIONS'));
        expect(screen.getByText('No pending suggestions.')).toBeInTheDocument();
    });

    it('shows badge count on SUGGESTIONS tab when suggestions exist', () => {
        renderAdmin({ suggestedQuests: mockSuggestions });
        const sugBtn = screen.getByText('SUGGESTIONS', { exact: false }).closest('button');
        expect(sugBtn.textContent).toMatch(/1/);
    });
});

// ─── Quest Table ──────────────────────────────────────────────────────────────

describe('AdminPanel – Quest Table', () => {
    it('renders quest status badges', () => {
        renderAdmin();
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Archived')).toBeInTheDocument();
    });

    it('renders quest location', () => {
        renderAdmin();
        expect(screen.getByText('Piata Muzeului')).toBeInTheDocument();
    });

    it('renders Edit and Delete buttons for each quest', () => {
        renderAdmin();
        expect(screen.getAllByText('Edit').length).toBe(2);
        expect(screen.getAllByText('Delete').length).toBe(2);
    });

    it('shows + NEW QUEST button in quests tab', () => {
        renderAdmin();
        expect(screen.getByText('+ NEW QUEST')).toBeInTheDocument();
    });
});

// ─── Quest CRUD Modal ─────────────────────────────────────────────────────────

describe('AdminPanel – Quest CRUD Modal', () => {
    it('opens the create quest modal on + NEW QUEST', () => {
        renderAdmin();
        openNewQuestModal();
        expect(screen.getByText('CREATE NEW QUEST')).toBeInTheDocument();
    });

    it('opens the edit quest modal with pre-filled data', () => {
        render(<AdminPanel quests={mockQuests} events={[]} suggestedQuests={[]} setQuests={vi.fn()} />);
        const searchInput = screen.getByPlaceholderText(/Search Database/);
        fireEvent.change(searchInput, { target: { value: 'Midnight Run' } });
        fireEvent.click(screen.getAllByText('Edit')[0]);
        expect(screen.getByText('EDIT QUEST')).toBeInTheDocument();
        const midnightRunInputs = screen.getAllByDisplayValue('Midnight Run');
        expect(midnightRunInputs.length).toBeGreaterThan(0);
    });
    it('closes modal on CANCEL', () => {
        renderAdmin();
        openNewQuestModal();
        fireEvent.click(screen.getByText('CANCEL'));
        expect(screen.queryByText('CREATE NEW QUEST')).not.toBeInTheDocument();
    });

    it('closes modal when clicking overlay', () => {
        renderAdmin();
        openNewQuestModal();
        fireEvent.click(document.querySelector('.admin-modal-overlay'));
        expect(screen.queryByText('CREATE NEW QUEST')).not.toBeInTheDocument();
    });

    it('shows title validation error when saving with blank fields', () => {
        renderAdmin();
        openNewQuestModal();
        fireEvent.click(screen.getByText('SAVE TO DATABASE'));
        expect(screen.getByText(/Title must be at least 5 characters/i)).toBeInTheDocument();
    });

    it('shows description validation error when description is too short', () => {
        renderAdmin();
        const modal = openNewQuestModal();

        // The modal's first text input (index 0 among .admin-input[type=text]) is TITLE.
        // Use querySelectorAll scoped to the modal to be unambiguous.
        const textInputs = modal.querySelectorAll('input[type="text"].admin-input');
        // textInputs[0] = TITLE
        fireEvent.change(textInputs[0], { target: { value: 'A valid title here' } });

        // Leave description (textarea) empty and save
        fireEvent.click(screen.getByText('SAVE TO DATABASE'));
        expect(screen.getByText(/Description must be at least 15 characters/i)).toBeInTheDocument();
    });

    it('calls setQuests with new quest on valid save', () => {
        const props = renderAdmin();
        const modal = openNewQuestModal();

        const textInputs = modal.querySelectorAll('input[type="text"].admin-input');
        // textInputs[0] = TITLE, textInputs[1] = LOCATION NAME
        fireEvent.change(textInputs[0], { target: { value: 'A Brand New Quest' } });
        fireEvent.change(textInputs[1], { target: { value: 'Test Park' } });

        const textarea = modal.querySelector('textarea.admin-input');
        fireEvent.change(textarea, { target: { value: 'This is a long enough description to pass validation.' } });

        fireEvent.click(screen.getByText('SAVE TO DATABASE'));
        expect(props.setQuests).toHaveBeenCalled();
    });

    it('calls setQuests on delete after confirmation', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const props = renderAdmin();
        fireEvent.click(screen.getAllByText('Delete')[0]);
        expect(props.setQuests).toHaveBeenCalled();
        vi.restoreAllMocks();
    });

    it('does not call setQuests on delete when cancelled', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(false);
        const props = renderAdmin();
        fireEvent.click(screen.getAllByText('Delete')[0]);
        expect(props.setQuests).not.toHaveBeenCalled();
        vi.restoreAllMocks();
    });
});

// ─── Quest Validation ─────────────────────────────────────────────────────────

describe('AdminPanel – Quest Validation', () => {
    const openAndFillValidQuest = () => {
        renderAdmin();
        const modal = openNewQuestModal();
        const textInputs = modal.querySelectorAll('input[type="text"].admin-input');
        fireEvent.change(textInputs[0], { target: { value: 'Valid Title Here' } });
        fireEvent.change(textInputs[1], { target: { value: 'Test Zone' } });
        const textarea = modal.querySelector('textarea.admin-input');
        fireEvent.change(textarea, { target: { value: 'A valid description of the quest for testing.' } });
        return modal;
    };

    it('shows error when XP is 0', () => {
        openAndFillValidQuest();
        fireEvent.change(screen.getByDisplayValue('250'), { target: { value: '0' } });
        fireEvent.click(screen.getByText('SAVE TO DATABASE'));
        expect(screen.getByText(/XP must be between 1 and 1000/i)).toBeInTheDocument();
    });

    it('shows error when XP exceeds 1000', () => {
        openAndFillValidQuest();
        fireEvent.change(screen.getByDisplayValue('250'), { target: { value: '1500' } });
        fireEvent.click(screen.getByText('SAVE TO DATABASE'));
        expect(screen.getByText(/XP must be between 1 and 1000/i)).toBeInTheDocument();
    });
});

// ─── Suggestions Tab ──────────────────────────────────────────────────────────

describe('AdminPanel – Suggestions Tab', () => {
    it('renders pending suggestions', () => {
        renderAdmin({ suggestedQuests: mockSuggestions });
        fireEvent.click(screen.getByText('SUGGESTIONS'));
        expect(screen.getByText('Suggested Quest')).toBeInTheDocument();
        expect(screen.getByText('By: User1')).toBeInTheDocument();
    });

    it('calls onAccept when ACCEPT & REWARD is clicked', () => {
        const props = renderAdmin({ suggestedQuests: mockSuggestions });
        fireEvent.click(screen.getByText('SUGGESTIONS'));
        fireEvent.click(screen.getByText('ACCEPT & REWARD'));
        expect(props.onAccept).toHaveBeenCalledWith(mockSuggestions[0]);
    });

    it('calls onReject when REJECT is clicked', () => {
        const props = renderAdmin({ suggestedQuests: mockSuggestions });
        fireEvent.click(screen.getByText('SUGGESTIONS'));
        fireEvent.click(screen.getByText('REJECT'));
        expect(props.onReject).toHaveBeenCalledWith('s_1');
    });
});

// ─── Events Tab ───────────────────────────────────────────────────────────────

describe('AdminPanel – Events Tab', () => {
    it('renders event names in the events table', () => {
        renderAdmin();
        fireEvent.click(screen.getByText('EVENTS'));
        expect(screen.getByText('Synthwave Rave')).toBeInTheDocument();
    });

    it('shows + NEW EVENT button in events tab', () => {
        renderAdmin();
        fireEvent.click(screen.getByText('EVENTS'));
        expect(screen.getByText('+ NEW EVENT')).toBeInTheDocument();
    });

    it('opens event creation modal on + NEW EVENT', () => {
        renderAdmin();
        fireEvent.click(screen.getByText('EVENTS'));
        fireEvent.click(screen.getByText('+ NEW EVENT'));
        expect(screen.getByText('CREATE NEW EVENT')).toBeInTheDocument();
    });

    it('opens event edit modal with pre-filled data', () => {
        renderAdmin();
        fireEvent.click(screen.getByText('EVENTS'));
        fireEvent.click(screen.getByText('Edit'));
        expect(screen.getByText('EDIT EVENT')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Synthwave Rave')).toBeInTheDocument();
    });

    it('shows validation errors on empty event save', () => {
        renderAdmin();
        fireEvent.click(screen.getByText('EVENTS'));
        fireEvent.click(screen.getByText('+ NEW EVENT'));
        fireEvent.click(screen.getByText('SAVE TO DATABASE'));
        expect(screen.getByText(/Event name must be at least 5 characters/i)).toBeInTheDocument();
    });

    it('shows date validation error for a past date', () => {
        renderAdmin();
        fireEvent.click(screen.getByText('EVENTS'));
        fireEvent.click(screen.getByText('+ NEW EVENT'));

        const modal = document.querySelector('.admin-modal-content');
        // Scope all input queries to the modal to avoid ambiguity
        const textInputs = modal.querySelectorAll('input[type="text"].admin-input');
        // textInputs[0] = EVENT NAME
        fireEvent.change(textInputs[0], { target: { value: 'Valid Event Name Here' } });

        const textarea = modal.querySelector('textarea.admin-input');
        fireEvent.change(textarea, { target: { value: 'This is a valid event description that is long enough.' } });

        const venueInput = modal.querySelector('input[placeholder="Venue Name (e.g., Form Space)"]');
        fireEvent.change(venueInput, { target: { value: 'Test Venue' } });

        const dateInput = modal.querySelector('input[type="datetime-local"]');
        fireEvent.change(dateInput, { target: { value: '2020-01-01T10:00' } });

        fireEvent.click(screen.getByText('SAVE TO DATABASE'));
        expect(screen.getByText(/Event date cannot be in the past/i)).toBeInTheDocument();
    });

    it('calls setEvents on delete after confirmation', () => {
        vi.spyOn(window, 'confirm').mockReturnValue(true);
        const props = renderAdmin();
        fireEvent.click(screen.getByText('EVENTS'));
        fireEvent.click(screen.getByText('Delete'));
        expect(props.setEvents).toHaveBeenCalled();
        vi.restoreAllMocks();
    });
});

// ─── Pagination ───────────────────────────────────────────────────────────────

describe('AdminPanel – Pagination', () => {
    const manyQuests = Array.from({ length: 7 }, (_, i) => ({
        id: `q_${i}`, title: `Quest ${i}`, type: 'Food', author: 'Admin',
        description: 'desc', difficulty: 1, cost: 'None', xpReward: 100,
        status: 'Active',
        location: { name: 'Place', lat: 46, lng: 23 },
        conditions: { daytime: ['ANY'], weather: ['ANY'], season: ['ANY'] },
    }));

    it('shows pagination controls when quests exceed one page', () => {
        renderAdmin({ quests: manyQuests });
        expect(screen.getByText(/PAGE 1 OF 2/i)).toBeInTheDocument();
    });

    it('can navigate to next page in quests', () => {
        renderAdmin({ quests: manyQuests });
        fireEvent.click(screen.getByText(/NEXT/i));
        expect(screen.getByText(/PAGE 2 OF 2/i)).toBeInTheDocument();
    });
});

// --- 7. TABLE SORTING LOGIC ---
it('sorts quest table data when headers are clicked', () => {
    const sortMocks = [
        { id: 'q_10', title: 'Zebra', type: 'Food', status: 'Active', location: { name: 'Alpha' }, conditions: { daytime: [], weather: [], season: [] } },
        { id: 'q_2', title: 'Apple', type: 'Exploration', status: 'Active', location: { name: 'Beta' }, conditions: { daytime: [], weather: [], season: [] } }
    ];

    // FIX: Replaced mockSetQuests with a direct vi.fn()
    render(<AdminPanel quests={sortMocks} events={[]} suggestedQuests={[]} setQuests={vi.fn()} />);

    const idHeader = screen.getByText(/ID/);
    fireEvent.click(idHeader);
    const rowsAsc = document.querySelectorAll('tbody tr');
    expect(rowsAsc[0]).toHaveTextContent('q_2');

    const titleHeader = screen.getByText(/TITLE/);
    fireEvent.click(titleHeader);
    expect(document.querySelectorAll('tbody tr')[0]).toHaveTextContent('Apple');
    fireEvent.click(titleHeader);
    expect(document.querySelectorAll('tbody tr')[0]).toHaveTextContent('Zebra');

    const locHeader = screen.getByText(/LOC/);
    fireEvent.click(locHeader);
    expect(document.querySelectorAll('tbody tr')[0]).toHaveTextContent('Alpha');
});

it('sorts event table data when headers are clicked', () => {
    const sortEventMocks = [
        { id: 'e_10', name: 'Zebra Event', date: '2026-10-01T10:00:00Z', location: { name: 'Alpha Venue' } },
        { id: 'e_2', name: 'Apple Event', date: '2026-01-01T10:00:00Z', location: { name: 'Beta Venue' } }
    ];

    // FIX: Replaced mockSetEvents with a direct vi.fn()
    render(<AdminPanel quests={[]} events={sortEventMocks} suggestedQuests={[]} setEvents={vi.fn()} />);
    fireEvent.click(screen.getByText('EVENTS'));

    const dateHeader = screen.getByText(/DATE \/ TIME/);
    fireEvent.click(dateHeader);
    expect(document.querySelectorAll('tbody tr')[0]).toHaveTextContent('Apple Event');
});
