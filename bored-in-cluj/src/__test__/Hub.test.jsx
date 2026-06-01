// src/__tests__/Hub.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Hub from '../Hub';

vi.mock('./Hub.css', () => ({}));

const defaultProps = {
    userTokens: 5,
    isFreeRollAvailable: true,
    nextFreeRollTime: null,
    onFreeRoll: vi.fn(),
    onPaidRoll: vi.fn(),
    onSuggestQuest: vi.fn(),
};

const renderHub = (overrides = {}) => {
    const props = { ...defaultProps, ...overrides };
    render(<Hub {...props} />);
    return props;
};

// ─── Render ───────────────────────────────────────────────────────────────────

describe('Hub – Render', () => {
    it('renders CLUJ-NAPOCA title', () => {
        renderHub();
        expect(screen.getByText('CLUJ-NAPOCA')).toBeInTheDocument();
    });

    it('renders SYSTEM STATUS: ONLINE', () => {
        renderHub();
        expect(screen.getByText('SYSTEM STATUS: ONLINE')).toBeInTheDocument();
    });

    it('renders the token count', () => {
        renderHub({ userTokens: 7 });
        expect(screen.getByText('x 7')).toBeInTheDocument();
    });

    it('renders environmental dashboard cards', () => {
        renderHub();
        expect(screen.getByText('LOCAL TIME')).toBeInTheDocument();
        expect(screen.getByText('ATMOSPHERE')).toBeInTheDocument();
    });

    it('renders the suggestion banner', () => {
        renderHub();
        expect(screen.getByText('HAVE OTHER IDEAS?')).toBeInTheDocument();
    });
});

// ─── Free Roll Available ───────────────────────────────────────────────────────

describe('Hub – Free Roll Available', () => {
    it('shows START DAILY QUEST button when free roll is available', () => {
        renderHub({ isFreeRollAvailable: true });
        expect(screen.getByText('START DAILY QUEST')).toBeInTheDocument();
    });

    it('calls onFreeRoll when START DAILY QUEST is clicked', () => {
        const props = renderHub({ isFreeRollAvailable: true });
        fireEvent.click(screen.getByText('START DAILY QUEST'));
        expect(props.onFreeRoll).toHaveBeenCalledTimes(1);
    });

    it('does not show REROLL button when free roll is available', () => {
        renderHub({ isFreeRollAvailable: true });
        expect(screen.queryByText(/REROLL QUEST/i)).not.toBeInTheDocument();
    });
});

// ─── Cooldown ─────────────────────────────────────────────────────────────────

describe('Hub – Free Roll Used (cooldown)', () => {
    it('shows REROLL QUEST (1 TOKEN) button when free roll is used', () => {
        renderHub({ isFreeRollAvailable: false, nextFreeRollTime: Date.now() + 43200000 });
        expect(screen.getByText(/REROLL QUEST \(1 TOKEN\)/i)).toBeInTheDocument();
    });

    it('does not show START DAILY QUEST when free roll is used', () => {
        renderHub({ isFreeRollAvailable: false, nextFreeRollTime: Date.now() + 43200000 });
        expect(screen.queryByText('START DAILY QUEST')).not.toBeInTheDocument();
    });
});

// ─── Reroll Modal (enough tokens) ─────────────────────────────────────────────

describe('Hub – Reroll Modal (enough tokens)', () => {
    it('shows warning modal when REROLL is clicked and tokens > 0', () => {
        renderHub({ isFreeRollAvailable: false, nextFreeRollTime: Date.now() + 1000, userTokens: 3 });
        fireEvent.click(screen.getByText(/REROLL QUEST/i));
        expect(screen.getByText('OVERRIDE REQUIRED')).toBeInTheDocument();
    });

    it('shows current balance in the warning modal', () => {
        renderHub({ isFreeRollAvailable: false, nextFreeRollTime: Date.now() + 1000, userTokens: 3 });
        fireEvent.click(screen.getByText(/REROLL QUEST/i));
        expect(screen.getByText(/Current Balance: 3 Tokens/i)).toBeInTheDocument();
    });

    it('closes warning modal on CANCEL', () => {
        renderHub({ isFreeRollAvailable: false, nextFreeRollTime: Date.now() + 1000, userTokens: 3 });
        fireEvent.click(screen.getByText(/REROLL QUEST/i));
        fireEvent.click(screen.getByText('CANCEL'));
        expect(screen.queryByText('OVERRIDE REQUIRED')).not.toBeInTheDocument();
    });

    it('closes warning modal when clicking overlay', () => {
        renderHub({ isFreeRollAvailable: false, nextFreeRollTime: Date.now() + 1000, userTokens: 3 });
        fireEvent.click(screen.getByText(/REROLL QUEST/i));
        fireEvent.click(document.querySelector('.hub-modal-overlay'));
        expect(screen.queryByText('OVERRIDE REQUIRED')).not.toBeInTheDocument();
    });

    it('calls onPaidRoll when SPEND TOKEN is confirmed', () => {
        const props = renderHub({ isFreeRollAvailable: false, nextFreeRollTime: Date.now() + 1000, userTokens: 3 });
        fireEvent.click(screen.getByText(/REROLL QUEST/i));
        fireEvent.click(screen.getByText('SPEND TOKEN'));
        expect(props.onPaidRoll).toHaveBeenCalledTimes(1);
    });
});

// ─── Reroll Modal (no tokens) ─────────────────────────────────────────────────

describe('Hub – Reroll Modal (no tokens)', () => {
    it('shows INSUFFICIENT FUNDS modal when token count is 0', () => {
        renderHub({ isFreeRollAvailable: false, nextFreeRollTime: Date.now() + 1000, userTokens: 0 });
        fireEvent.click(screen.getByText(/REROLL QUEST/i));
        expect(screen.getByText('INSUFFICIENT FUNDS')).toBeInTheDocument();
    });

    it('closes INSUFFICIENT FUNDS modal on ACKNOWLEDGE', () => {
        renderHub({ isFreeRollAvailable: false, nextFreeRollTime: Date.now() + 1000, userTokens: 0 });
        fireEvent.click(screen.getByText(/REROLL QUEST/i));
        fireEvent.click(screen.getByText('ACKNOWLEDGE'));
        expect(screen.queryByText('INSUFFICIENT FUNDS')).not.toBeInTheDocument();
    });
});

// ─── Suggest Quest Modal ───────────────────────────────────────────────────────

describe('Hub – Suggest Quest Modal', () => {
    it('opens suggestion modal when banner is clicked', () => {
        renderHub();
        fireEvent.click(screen.getByText('HAVE OTHER IDEAS?'));
        expect(screen.getByText('SUGGEST A QUEST')).toBeInTheDocument();
    });

    it('closes suggestion modal on CANCEL', () => {
        renderHub();
        fireEvent.click(screen.getByText('HAVE OTHER IDEAS?'));
        fireEvent.click(screen.getByText('CANCEL'));
        expect(screen.queryByText('SUGGEST A QUEST')).not.toBeInTheDocument();
    });

    it('closes suggestion modal on overlay click', () => {
        renderHub();
        fireEvent.click(screen.getByText('HAVE OTHER IDEAS?'));
        fireEvent.click(document.querySelector('.hub-modal-overlay'));
        expect(screen.queryByText('SUGGEST A QUEST')).not.toBeInTheDocument();
    });

    it('allows typing in quest title field', () => {
        renderHub();
        fireEvent.click(screen.getByText('HAVE OTHER IDEAS?'));
        // The modal renders three .hub-input fields: title, location, description (textarea).
        // None have placeholder text — grab by class index.
        const inputs = document.querySelectorAll('.hub-input');
        fireEvent.change(inputs[0], { target: { value: 'My Quest' } });
        expect(inputs[0].value).toBe('My Quest');
    });

    it('calls onSuggestQuest with form data on SUBMIT', () => {
        const props = renderHub();
        fireEvent.click(screen.getByText('HAVE OTHER IDEAS?'));

        const inputs = document.querySelectorAll('.hub-input');
        fireEvent.change(inputs[0], { target: { value: 'My Quest' } });        // title
        fireEvent.change(inputs[1], { target: { value: 'Central Park' } });    // location
        fireEvent.change(inputs[2], { target: { value: 'Do something fun' } }); // description

        fireEvent.click(screen.getByText('SUBMIT'));
        expect(props.onSuggestQuest).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'My Quest',
                location: { name: 'Central Park' },
                description: 'Do something fun',
            })
        );
    });

    it('closes suggestion modal after successful submission', () => {
        renderHub(); // (Assuming this is your helper render function)

        // 1. Open the modal
        fireEvent.click(screen.getByText('HAVE OTHER IDEAS?'));

        // 2. Grab the input fields (Testing Library sees 2 <input>s and 1 <textarea> as textboxes)
        const textboxes = screen.getAllByRole('textbox');
        const titleInput = textboxes[0];
        const locationInput = textboxes[1];
        const descInput = textboxes[2];

        // 3. Fill the form with data that passes our strict length rules
        fireEvent.change(titleInput, { target: { value: 'Midnight Neon Run' } }); // > 5 chars
        fireEvent.change(locationInput, { target: { value: 'Central Plaza' } }); // > 3 chars
        fireEvent.change(descInput, { target: { value: 'Run to the center of the plaza and photograph the statue.' } }); // > 10 chars

        // 4. Click Submit
        fireEvent.click(screen.getByText('SUBMIT'));

        // 5. NOW the validation passes and the modal closes!
        expect(screen.queryByText('SUGGEST A QUEST')).not.toBeInTheDocument();
    });

    it('blocks submission and shows errors when suggestion data is invalid', () => {
        renderHub();

        // Open the modal
        fireEvent.click(screen.getByText('HAVE OTHER IDEAS?'));

        // Click submit with empty fields
        fireEvent.click(screen.getByText('SUBMIT'));

        // 1. Verify the modal stays open
        expect(screen.getByText('SUGGEST A QUEST')).toBeInTheDocument();

        // 2. Verify all three cyber-error messages render
        expect(screen.getByText('TITLE MUST BE AT LEAST 5 CHARACTERS.')).toBeInTheDocument();
        expect(screen.getByText('VALID LOCATION REQUIRED (MIN 3 CHARS).')).toBeInTheDocument();
        expect(screen.getByText('DIRECTIVE MUST BE AT LEAST 10 CHARACTERS.')).toBeInTheDocument();
    });
});

// ─── Countdown Timer ──────────────────────────────────────────────────────────

describe('Hub – Countdown Timer', () => {
    it('shows countdown text after cooldown starts', async () => {
        renderHub({ isFreeRollAvailable: false, nextFreeRollTime: Date.now() + 3_600_000 });
        await waitFor(
            () => expect(screen.getByText(/Next free roll in:/i)).toBeInTheDocument(),
            { timeout: 3000 }
        );
    }, 10000);
});