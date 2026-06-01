import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import QuestDetail from '../QuestDetail';

// Mock data for a complete quest
const mockQuest = {
    id: 'Q-101',
    title: 'Neon Alley Run',
    author: 'CyberPunk99',
    backgroundImage: 'neon.jpg',
    difficulty: 4,
    cost: 'medium',
    description: 'Run through the alley.',
    location: { name: 'Sector 7', lat: 46.7712, lng: 23.5905 },
    conditions: { daytime: ['NIGHT'], weather: ['RAIN', 'FOG'] }
};

describe('QuestDetail Component', () => {
    const mockOnAbort = vi.fn();
    const mockOnComplete = vi.fn();
    const mockOnBack = vi.fn(); // Fixed the bug!

    beforeEach(() => {
        vi.clearAllMocks();
        // Take over JS timers to test the setTimeout delays without actually waiting
        vi.useFakeTimers();
    });

    afterEach(() => {
        // Restore real timers and math after each test
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('renders the error screen if no quest data is provided', () => {
        render(<QuestDetail quest={null} onBack={mockOnBack} />);

        expect(screen.getByText('NO QUEST DATA FOUND.')).toBeInTheDocument();

        const returnBtn = screen.getByText('RETURN');
        fireEvent.click(returnBtn);
        expect(mockOnBack).toHaveBeenCalledTimes(1);
    });

    it('renders correctly with complete quest data', () => {
        render(<QuestDetail quest={mockQuest} onAbort={mockOnAbort} onComplete={mockOnComplete} />);

        expect(screen.getByText('Neon Alley Run')).toBeInTheDocument();
        expect(screen.getByText('ENCODED BY: CyberPunk99')).toBeInTheDocument();
        expect(screen.getByText('MEDIUM')).toBeInTheDocument(); // Checks toUpperCase
        expect(screen.getByText(/46.7712 N/)).toBeInTheDocument();
        expect(screen.getByText('(Sector 7)')).toBeInTheDocument();
        expect(screen.getByText('REQ: NIGHT')).toBeInTheDocument();
        expect(screen.getByText('REQ: RAIN OR FOG')).toBeInTheDocument();

        // Check difficulty stars
        expect(screen.getByText('★★★★')).toBeInTheDocument();
    });

    it('renders safely with missing fallback data', () => {
        // Quest with absolutely no optional data
        const bareQuest = { id: 'Q-000' };
        render(<QuestDetail quest={bareQuest} onAbort={mockOnAbort} onComplete={mockOnComplete} />);

        expect(screen.getByText('UNKNOWN')).toBeInTheDocument(); // Cost fallback
        expect(screen.getByText(/0.0000 N/)).toBeInTheDocument(); // GPS fallback
        expect(screen.getByText('(Unknown Zone)')).toBeInTheDocument(); // Name fallback
        expect(screen.getByText('No directive provided.')).toBeInTheDocument(); // Desc fallback

        // 2 fallback condition tags ('ANY')
        const anyTags = screen.getAllByText('REQ: ANY');
        expect(anyTags).toHaveLength(2);
    });

    it('handles the Give Up modal flow (Cancel and Confirm)', () => {
        render(<QuestDetail quest={mockQuest} onAbort={mockOnAbort} onComplete={mockOnComplete} />);

        const giveUpBtn = screen.getByText('[ < GIVE UP ]');

        // Open Modal
        fireEvent.click(giveUpBtn);
        expect(screen.getByText('GIVE UP?')).toBeInTheDocument();

        // Cancel Modal
        fireEvent.click(screen.getByText('CANCEL'));
        expect(screen.queryByText('GIVE UP?')).not.toBeInTheDocument();

        // Re-open and Confirm
        fireEvent.click(giveUpBtn);
        fireEvent.click(screen.getByText('CONFIRM'));

        expect(mockOnAbort).toHaveBeenCalledTimes(1);
        expect(screen.queryByText('GIVE UP?')).not.toBeInTheDocument(); // Modal closes
    });

    it('can close the modal by clicking the overlay', () => {
        render(<QuestDetail quest={mockQuest} onAbort={mockOnAbort} onComplete={mockOnComplete} />);

        fireEvent.click(screen.getByText('[ < GIVE UP ]'));
        const modalOverlay = document.querySelector('.hub-modal-overlay');

        // Click the background overlay
        fireEvent.click(modalOverlay);
        expect(screen.queryByText('GIVE UP?')).not.toBeInTheDocument();
    });

    it('ignores empty file uploads', () => {
        render(<QuestDetail quest={mockQuest} onAbort={mockOnAbort} onComplete={mockOnComplete} />);

        const fileInput = document.querySelector('input[type="file"]');

        // Fire change with NO files
        fireEvent.change(fileInput, { target: { files: [] } });

        // Ensure state remains idle
        expect(screen.getByText('AWAITING PHOTOGRAPHIC EVIDENCE.')).toBeInTheDocument();
    });

    it('handles the AI scan success flow', () => {
        // Force Math.random to return a high number (0.8 * 5 = 4 + 1 = 5 stars)
        vi.spyOn(Math, 'random').mockReturnValue(0.8);

        render(<QuestDetail quest={mockQuest} onAbort={mockOnAbort} onComplete={mockOnComplete} />);

        const fileInput = document.querySelector('input[type="file"]');
        const file = new File(['(⌐□_□)'], 'evidence.png', { type: 'image/png' });

        // Trigger Upload
        fireEvent.change(fileInput, { target: { files: [file] } });

        // Fast-forward 1000ms to hit 'analyzing'
        act(() => { vi.advanceTimersByTime(1000); });
        expect(screen.getByText('RUNNING NEURAL NET VISION ANALYSIS...')).toBeInTheDocument();

        // Fast-forward 2500ms to hit 'success'
        act(() => { vi.advanceTimersByTime(2500); });
        expect(screen.getByText('MISSION ACCOMPLISHED')).toBeInTheDocument();
        expect(screen.getByText('AI RATING: ★★★★★')).toBeInTheDocument();

        // Claim rewards
        fireEvent.click(screen.getByText('[ CLAIM REWARDS ]'));
        expect(mockOnComplete).toHaveBeenCalledWith('Q-101', 5);
    });

    it('handles the AI scan failure flow and retry', () => {
        // Force Math.random to return a low number (0.1 * 5 = 0 + 1 = 1 star)
        vi.spyOn(Math, 'random').mockReturnValue(0.1);

        render(<QuestDetail quest={mockQuest} onAbort={mockOnAbort} onComplete={mockOnComplete} />);

        const fileInput = document.querySelector('input[type="file"]');
        const file = new File(['(⌐□_□)'], 'bad-evidence.png', { type: 'image/png' });

        // Trigger Upload
        fireEvent.change(fileInput, { target: { files: [file] } });

        // Fast-forward total 3500ms to skip right to the end
        act(() => { vi.advanceTimersByTime(3500); });

        expect(screen.getByText('VALIDATION FAILED')).toBeInTheDocument();
        expect(screen.getByText('AI RATING: ★')).toBeInTheDocument();

        // Retry
        fireEvent.click(screen.getByText('[ RETRY UPLOAD ]'));
        expect(screen.getByText('AWAITING PHOTOGRAPHIC EVIDENCE.')).toBeInTheDocument();
    });
});