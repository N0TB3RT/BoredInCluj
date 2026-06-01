// src/__tests__/EventsRadar.test.jsx
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import EventsRadar from '../EventsRadar';

vi.mock('./EventsRadar.css', () => ({}));

const now = new Date();
const todayISO   = now.toISOString();
const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
const pastDate   = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

const mockEvents = [
    {
        id: 'e_today', name: 'Today Event', description: 'Happening right now.',
        location: { name: 'Form Space', lat: 46.77, lng: 23.59 },
        date: todayISO, photo: null,
    },
    {
        id: 'e_upcoming', name: 'Upcoming Event', description: 'Coming soon.',
        location: { name: 'BT Arena', lat: 46.78, lng: 23.60 },
        date: futureDate, photo: null,
    },
    {
        id: 'e_past', name: 'Past Event', description: 'Already happened.',
        location: { name: 'Old Town', lat: 46.76, lng: 23.58 },
        date: pastDate, photo: null,
    },
];

const renderRadar = (events = mockEvents) => render(<EventsRadar events={events} />);

// Helper: get the modal content element (portaled into body)
const getModal = () => document.querySelector('.event-modal-content');

// ─── Render ───────────────────────────────────────────────────────────────────

describe('EventsRadar – Render', () => {
    it('renders the EVENTS title', () => {
        renderRadar();
        expect(screen.getByText('EVENTS')).toBeInTheDocument();
    });

    it('renders LIVE FEED status', () => {
        renderRadar();
        expect(screen.getByText('LIVE FEED')).toBeInTheDocument();
    });

    it('renders with empty events array without crashing', () => {
        render(<EventsRadar events={[]} />);
        expect(screen.getByText('EVENTS')).toBeInTheDocument();
    });
});

// ─── Section Classification ───────────────────────────────────────────────────

describe('EventsRadar – Section Classification', () => {
    it('renders TODAY section heading for today\'s event', () => {
        renderRadar();
        const headings = document.querySelectorAll('.group-title');
        expect(Array.from(headings).some(h => h.textContent === 'TODAY')).toBe(true);
    });

    it('renders the today event name', () => {
        renderRadar();
        expect(screen.getByText('Today Event')).toBeInTheDocument();
    });

    it('renders TODAY badge inside today\'s event card', () => {
        renderRadar();
        const badge = document.querySelector('.badge-live');
        expect(badge).toBeTruthy();
        expect(badge.textContent).toBe('TODAY');
    });

    it('renders UPCOMING section heading', () => {
        renderRadar();
        const headings = document.querySelectorAll('.group-title');
        expect(Array.from(headings).some(h => h.textContent === 'UPCOMING')).toBe(true);
    });

    it('renders the upcoming event name', () => {
        renderRadar();
        expect(screen.getByText('Upcoming Event')).toBeInTheDocument();
    });

    it('renders PAST EVENTS section heading', () => {
        renderRadar();
        const headings = document.querySelectorAll('.group-title');
        expect(Array.from(headings).some(h => h.textContent === 'PAST EVENTS')).toBe(true);
    });

    it('renders the past event name', () => {
        renderRadar();
        expect(screen.getByText('Past Event')).toBeInTheDocument();
    });

    it('renders ENDED badge on past event', () => {
        renderRadar();
        const badge = document.querySelector('.badge-lost');
        expect(badge).toBeTruthy();
        expect(badge.textContent).toBe('ENDED');
    });

    it('renders location names', () => {
        renderRadar();
        expect(screen.getByText(/@ Form Space/i)).toBeInTheDocument();
        expect(screen.getByText(/@ BT Arena/i)).toBeInTheDocument();
        expect(screen.getByText(/@ Old Town/i)).toBeInTheDocument();
    });

    it('does not render TODAY section when there are no today events', () => {
        renderRadar([mockEvents[1], mockEvents[2]]);
        const headings = document.querySelectorAll('.group-title');
        expect(Array.from(headings).some(h => h.textContent === 'TODAY')).toBe(false);
    });
});

// ─── Modal ────────────────────────────────────────────────────────────────────

describe('EventsRadar – View Details / Modal', () => {
    const openTodayModal = () => {
        fireEvent.click(within(document.querySelector('.card-live')).getByText('VIEW DETAILS'));
    };

    it('opens modal when VIEW DETAILS is clicked', () => {
        renderRadar();
        openTodayModal();
        expect(getModal()).toBeTruthy();
        expect(within(getModal()).getByText('ABOUT THIS EVENT')).toBeInTheDocument();
    });

    // The event name appears both in the card (h4) AND in the modal (h2).
    // Scope to the modal to avoid the "multiple elements" error.
    it('shows the event name in the modal title', () => {
        renderRadar();
        openTodayModal();
        expect(within(getModal()).getByText('Today Event')).toBeInTheDocument();
    });

    it('shows the event description in the modal', () => {
        renderRadar();
        openTodayModal();
        // Description also appears in the card; scope to modal body
        const modalDesc = getModal().querySelector('.modal-description');
        expect(within(modalDesc).getByText('Happening right now.')).toBeInTheDocument();
    });

    it('closes modal when the ✕ button is clicked', () => {
        renderRadar();
        openTodayModal();
        fireEvent.click(within(getModal()).getByText('✕'));
        expect(document.querySelector('.event-modal-content')).toBeNull();
    });

    it('closes modal when clicking the overlay', () => {
        renderRadar();
        openTodayModal();
        fireEvent.click(document.querySelector('.event-modal-overlay'));
        expect(document.querySelector('.event-modal-content')).toBeNull();
    });

    it('WILL ATTEND button toggles to RETRACT ATTENDANCE and updates UI', () => {
        renderRadar();

        // FIX: Open the UPCOMING event instead of TODAY to avoid the millisecond timeout trap
        fireEvent.click(within(document.querySelector('.card-upcoming')).getByText('VIEW DETAILS'));

        // Find the new dynamic attendance button
        const attendBtn = within(getModal()).getByText('WILL ATTEND');

        // Click it
        fireEvent.click(attendBtn);

        // 1. Verify the text changed
        expect(within(getModal()).getByText('RETRACT ATTENDANCE')).toBeInTheDocument();

        // 2. Verify the modal STAYS OPEN
        expect(document.querySelector('.event-modal-content')).toBeTruthy();
    });

    it('shows EVENT CONCLUDED for past events and disables the button', () => {
        renderRadar();

        // Open the past event archive
        fireEvent.click(within(document.querySelector('.card-past')).getByText('VIEW ARCHIVE'));

        // Verify the button has the correct past-tense text and is unclickable
        const concludedBtn = within(getModal()).getByText('EVENT CONCLUDED');
        expect(concludedBtn).toBeInTheDocument();
        expect(concludedBtn).toBeDisabled();
    });

    it('shows MAP DATA UNAVAILABLE when event has no coordinates', () => {
        const noCoords = {
            id: 'e_nocoords', name: 'No Coords Event', description: 'Somewhere',
            location: { name: 'Mystery Place' }, date: todayISO, photo: null,
        };
        render(<EventsRadar events={[noCoords]} />);
        fireEvent.click(within(document.querySelector('.card-live')).getByText('VIEW DETAILS'));
        expect(within(getModal()).getByText('MAP DATA UNAVAILABLE')).toBeInTheDocument();
    });

    it('shows event location in modal meta bar', () => {
        renderRadar();
        openTodayModal();
        expect(within(getModal()).getByText('LOCATION')).toBeInTheDocument();
        expect(within(getModal()).getByText('Form Space')).toBeInTheDocument();
    });

    it('opens modal for upcoming event and shows its name in modal title', () => {
        renderRadar();
        fireEvent.click(within(document.querySelector('.card-upcoming')).getByText('VIEW DETAILS'));
        expect(within(getModal()).getByText('ABOUT THIS EVENT')).toBeInTheDocument();
        // Scope to modal to avoid collision with the card's h4
        expect(within(getModal()).getByText('Upcoming Event')).toBeInTheDocument();
    });

    it('opens archive modal for past event and shows its name in modal title', () => {
        renderRadar();
        fireEvent.click(within(document.querySelector('.card-past')).getByText('VIEW ARCHIVE'));
        expect(within(getModal()).getByText('ABOUT THIS EVENT')).toBeInTheDocument();
        expect(within(getModal()).getByText('Past Event')).toBeInTheDocument();
    });
});