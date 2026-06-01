import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MissionArchive from '../MissionArchive';

// --- MOCK DATA ---
const mockQuests = [
    { id: 'q1', title: 'Cyber Burger', type: 'Food', difficulty: 2, xpReward: 100 },
    { id: 'q2', title: 'Neon Alley', type: 'Exploration', difficulty: 4, xpReward: 250 },
    { id: 'q3', title: 'Rooftop Run', type: 'Athletics', difficulty: 5, xpReward: 300 },
    { id: 'q4', title: 'Server Hack', type: 'Puzzle', difficulty: 3, xpReward: 150 },
    { id: 'q5', title: 'Secret Drop', type: 'Classified', difficulty: 1, xpReward: 50 },
    // This quest has a type not listed in TYPE_COLORS to trigger the fallback color branch
    { id: 'q6', title: 'Weird Anomaly', type: 'Alien', difficulty: 3, xpReward: 500 }
];

const mockCompleted = [
    // Completed at different dates to test the descending chronological sort
    { questId: 'q1', bestRating: 4.5, completedAt: '2026-05-10T10:00:00Z' },
    { questId: 'q2', bestRating: 5, completedAt: '2026-05-11T10:00:00Z' }, // Newest
    { questId: 'q3', bestRating: 2, completedAt: '2026-05-09T10:00:00Z' },
    { questId: 'q4', bestRating: 3.5, completedAt: '2026-05-08T10:00:00Z' },
    { questId: 'q5', bestRating: 1, completedAt: '2026-05-07T10:00:00Z' },
    { questId: 'q6', bestRating: 4, completedAt: '2026-05-06T10:00:00Z' }  // Oldest
];

describe('MissionArchive Component', () => {

    it('renders empty state correctly using default props', () => {
        // Renders with absolutely no props to hit the defaults
        render(<MissionArchive />);

        expect(screen.getByText('NO MISSIONS COMPLETED YET.')).toBeInTheDocument();

        // Ensure pagination controls are hidden when empty
        expect(screen.queryByText('[ NEXT > ]')).not.toBeInTheDocument();

        // Ensure chart titles still render
        expect(screen.getByText('LIFETIME DIFFICULTY')).toBeInTheDocument();
        expect(screen.getByText('OVERALL DISTRIBUTION')).toBeInTheDocument();
    });

    it('renders populated data and sorts chronologically descending', () => {
        render(<MissionArchive quests={mockQuests} completedQuests={mockCompleted} />);

        // Fetch all rows in the table body
        const rows = document.querySelectorAll('tbody tr');

        // 'Neon Alley' (q2) was completed on May 11, so it should be at the very top
        expect(rows[0]).toHaveTextContent('Neon Alley');
        expect(rows[0]).toHaveTextContent('EXPLORATION');

        // 'Cyber Burger' (q1) was completed May 10, so it should be second
        expect(rows[1]).toHaveTextContent('Cyber Burger');

        // Verify star rendering logic (4.5 rating -> 4 full stars, 1 empty)
        expect(rows[1]).toHaveTextContent('★★★★☆');
    });

    it('handles pagination bounds correctly', () => {
        render(<MissionArchive quests={mockQuests} completedQuests={mockCompleted} />);

        const nextBtn = screen.getByText('[ NEXT > ]');
        const prevBtn = screen.getByText('[ < PREV ]');

        // We have 6 items, itemsPerPage is 5. So we should be on Page 1 of 2.
        expect(prevBtn).toBeDisabled();
        expect(nextBtn).not.toBeDisabled();

        // Check that the oldest quest (q6) is NOT on page 1
        expect(screen.queryByText('Weird Anomaly')).not.toBeInTheDocument();

        // Click NEXT to go to page 2
        fireEvent.click(nextBtn);

        // Now on page 2, the next button should be disabled and prev enabled
        expect(nextBtn).toBeDisabled();
        expect(prevBtn).not.toBeDisabled();

        // The oldest quest should now be visible
        expect(screen.getByText('Weird Anomaly')).toBeInTheDocument();
        expect(screen.getByText('ALIEN')).toBeInTheDocument(); // Hits the fallback color mapping

        // Click PREV to go back to page 1
        fireEvent.click(prevBtn);
        expect(screen.getByText('Neon Alley')).toBeInTheDocument();
    });

    it('handles missing/fallback quest data perfectly (Ghost Quests)', () => {
        // We provide a completed record for a quest ID that doesn't exist in the database
        const badCompleted = [{ questId: 'ghost_quest', bestRating: 3, completedAt: '2026-05-10T10:00:00Z' }];

        render(<MissionArchive quests={[]} completedQuests={badCompleted} />);

        // Should hit all the OR (||) fallback values
        expect(screen.getByText('Unknown Bounty')).toBeInTheDocument();
        expect(screen.getByText('CLASSIFIED')).toBeInTheDocument();

        // The replay button MUST be disabled because there is no original quest ID to pass
        const replayBtn = screen.getByText('REPLAY');
        expect(replayBtn).toBeDisabled();
    });

    it('triggers onReplayQuest with the exact original quest object', () => {
        const mockOnReplay = vi.fn();
        render(
            <MissionArchive
                quests={mockQuests}
                completedQuests={mockCompleted}
                onReplayQuest={mockOnReplay}
            />
        );

        // Click the top row's replay button (Neon Alley / q2)
        const replayBtns = screen.getAllByText('REPLAY');
        fireEvent.click(replayBtns[0]);

        // Verify the parent function was called with the raw database object
        expect(mockOnReplay).toHaveBeenCalledTimes(1);
        expect(mockOnReplay).toHaveBeenCalledWith(mockQuests[1]);
    });
});