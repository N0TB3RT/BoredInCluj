import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CityComms from '../CityComms';
import { useQuery, useMutation } from '@apollo/client/react';

// --- 1. VITEST ESM MOCKING ---
vi.mock('@apollo/client/react', () => ({
    useQuery: vi.fn(),
    useMutation: vi.fn()
}));

vi.mock('@apollo/client/core', () => ({
    gql: vi.fn(str => str)
}));

describe('CityComms Component', () => {
    let confirmSpy, promptSpy, alertSpy, createObjectURLSpy;
    const mockConsume = vi.fn();
    const mockRoll = vi.fn();

    const mockPosts = [
        {
            id: "p_1", type: "LFG",
            author: { username: "Cipher", avatar: "Cipher1", level: 24, rank: "Netrunner", topClear: "Find the Gargoyle" },
            content: "Rolling a random quest in 15 minutes. Need backup.",
            isPrivate: false, members: ["Cipher", "GhostX"], maxMembers: 8,
            timestamp: "2 mins ago", likes: 3, hasLiked: false, status: "sent",
            commentsList: [
                { id: "c_1", author: "Trinity", text: "I'm near the park, save a spot.", timestamp: "1 min ago" }
            ]
        },
        {
            id: "p_2", type: "PROOF",
            author: { username: "NeonRunner", avatar: "Runner1", level: 12, rank: "Street Rat", topClear: "Eat a full Shaorma in 5 Mins" },
            content: "Finally cracked the Gargoyle of Piata Unirii.",
            image: "https://via.placeholder.com/600x400/05050a/00d9ff",
            timestamp: "45 mins ago", likes: 42, hasLiked: false, status: "sent",
            commentsList: []
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
        promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('secret123');
        alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

        createObjectURLSpy = vi.fn().mockReturnValue('blob:http://localhost/mock-image-url');
        global.URL.createObjectURL = createObjectURLSpy;

        // --- 2. BULLETPROOF INTERSECTION OBSERVER ---
        class MockIntersectionObserver {
            constructor() {}
            observe = vi.fn();
            unobserve = vi.fn();
            disconnect = vi.fn();
        }
        window.IntersectionObserver = MockIntersectionObserver;

        // --- 3. THE "SMART" APOLLO QUERY MOCK ---
        const stableResponse = {
            data: { allPosts: mockPosts },
            loading: false,
            fetchMore: vi.fn().mockResolvedValue({ data: { allPosts: [] } })
        };

        useQuery.mockImplementation((query, options) => {
            if (options && options.onCompleted) {
                Promise.resolve().then(() => {
                    options.onCompleted({ allPosts: mockPosts });
                });
            }
            return stableResponse;
        });

        // --- 4. THE FULL APOLLO MUTATION MOCK ---
        // By returning the complete array structure [mutateFn, stateObj],
        // we prevent React from crashing silently during rapid state updates.
        useMutation.mockImplementation(() => {
            const mockMutate = vi.fn().mockResolvedValue({
                data: {
                    createPost: { id: "p_new", type: "PROOF", content: "Look at this!", timestamp: "Just now", likes: 0, author: { username: "NeonRunner", avatar: "Runner1", level: 12, rank: "Street Rat" }, commentsList: [] },
                    addComment: { id: "c_new", author: "NeonRunner", text: "This is fine.", timestamp: "Just now" }
                }
            });
            return [mockMutate, { loading: false, error: null, data: null }];
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders the initial state and feed', async () => {
        render(<CityComms />);
        expect(screen.getByText('CITY COMMS')).toBeInTheDocument();
        expect(await screen.findByText('Rolling a random quest in 15 minutes. Need backup.')).toBeInTheDocument();
    });

    it('blocks empty broadcasts', () => {
        render(<CityComms />);
        fireEvent.click(screen.getByText('TRANSMIT'));
        expect(screen.getByText('CANNOT TRANSMIT EMPTY SIGNAL.')).toBeInTheDocument();
    });

    it('blocks broadcasts exceeding 250 characters', () => {
        render(<CityComms />);
        const input = screen.getByPlaceholderText(/Broadcast to the city/);
        fireEvent.change(input, { target: { value: 'A'.repeat(251) } });
        fireEvent.click(screen.getByText('TRANSMIT'));
        expect(screen.getByText(/SIGNAL TOO LARGE/)).toBeInTheDocument();
    });

    it('blocks invalid image types and oversized files', () => {
        render(<CityComms />);
        const fileInput = screen.getByTestId('file-upload');

        const pdfFile = new File(['dummy'], 'doc.pdf', { type: 'application/pdf' });
        fireEvent.change(fileInput, { target: { files: [pdfFile] } });
        expect(screen.getByText('INVALID FORMAT. USE JPG, PNG, OR WEBP.')).toBeInTheDocument();

        const hugeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
        Object.defineProperty(hugeFile, 'size', { value: 6 * 1024 * 1024 });
        fireEvent.change(fileInput, { target: { files: [hugeFile] } });
        expect(screen.getByText('FILE EXCEEDS 5MB LIMIT.')).toBeInTheDocument();
    });

    it('successfully uploads valid image, previews, and transmits PROOF', async () => {
        render(<CityComms />);
        // Wait for initial render to completely stabilize before clicking
        await screen.findByText('Rolling a random quest in 15 minutes. Need backup.');

        const fileInput = screen.getByTestId('file-upload');
        const input = screen.getByPlaceholderText(/Broadcast to the city/);

        const validFile = new File(['image data'], 'pic.png', { type: 'image/png' });
        fireEvent.change(fileInput, { target: { files: [validFile] } });

        expect(createObjectURLSpy).toHaveBeenCalled();
        expect(screen.getByAltText('Preview')).toBeInTheDocument();

        fireEvent.change(input, { target: { value: 'Look at this!' } });
        fireEvent.click(screen.getByText('TRANSMIT'));

        await waitFor(() => {
            expect(screen.getByText('Look at this!')).toBeInTheDocument();
        });
    });

    it('removes image preview when clicking the X', () => {
        render(<CityComms />);
        const fileInput = screen.getByTestId('file-upload');
        const validFile = new File(['image data'], 'pic.png', { type: 'image/png' });
        fireEvent.change(fileInput, { target: { files: [validFile] } });

        fireEvent.click(screen.getByText('✕', { selector: '.btn-remove-img' }));
        expect(screen.queryByAltText('Preview')).not.toBeInTheDocument();
    });

    it('handles upvotes', async () => {
        render(<CityComms />);
        await screen.findByText('Rolling a random quest in 15 minutes. Need backup.');

        const likeBtns = screen.getAllByText(/▲/);
        fireEvent.click(likeBtns[0]);
        expect(screen.getByText('▲ 4')).toBeInTheDocument();
        fireEvent.click(likeBtns[0]);
        expect(screen.getByText('▲ 3')).toBeInTheDocument();
    });

    it('toggles comments, blocks oversized comments, and submits valid ones', async () => {
        render(<CityComms />);
        await screen.findByText('Rolling a random quest in 15 minutes. Need backup.');

        const commentToggles = screen.getAllByText(/💬/);
        fireEvent.click(commentToggles[0]);

        const commentInput = screen.getByPlaceholderText(/Add a comment/);
        fireEvent.change(commentInput, { target: { value: 'C'.repeat(151) } });
        fireEvent.keyDown(commentInput, { key: 'Enter', code: 'Enter' });
        expect(screen.getByText('COMMENT EXCEEDS 150 CHARS.')).toBeInTheDocument();

        fireEvent.change(commentInput, { target: { value: 'This is fine.' } });
        fireEvent.click(screen.getByText('REPLY'));

        await waitFor(() => {
            expect(screen.getByText('This is fine.')).toBeInTheDocument();
        });
    });

    it('deletes posts and comments', async () => {
        render(<CityComms />);
        await screen.findByText('Finally cracked the Gargoyle of Piata Unirii.');

        const deleteBtns = screen.getAllByText('✕ Delete');
        fireEvent.click(deleteBtns[0]);
        expect(confirmSpy).toHaveBeenCalled();

        await waitFor(() => {
            expect(screen.queryByText('Finally cracked the Gargoyle of Piata Unirii.')).not.toBeInTheDocument();
        });
    });

    it('blocks party creation with insufficient tokens', () => {
        render(<CityComms userTokens={0} />);
        fireEvent.click(screen.getByText('REQ CO-OP'));
        fireEvent.change(screen.getByPlaceholderText('E.g., Need backup...'), { target: { value: 'Valid' } });
        fireEvent.click(screen.getByText('CREATE SQUAD'));
        expect(alertSpy).toHaveBeenCalledWith('INSUFFICIENT TOKENS.');
    });

    it('blocks party creation with oversized messages', () => {
        render(<CityComms userTokens={5} />);
        fireEvent.click(screen.getByText('REQ CO-OP'));
        fireEvent.change(screen.getByPlaceholderText('E.g., Need backup...'), { target: { value: 'P'.repeat(101) } });
        fireEvent.click(screen.getByText('CREATE SQUAD'));
        expect(screen.getByText('MESSAGE EXCEEDS 100 CHARS.')).toBeInTheDocument();
    });

    it('creates a private party, locks lobby, and rolls quest', () => {
        render(<CityComms userTokens={5} onConsumeToken={mockConsume} onRollQuest={mockRoll} />);
        fireEvent.click(screen.getByText('REQ CO-OP'));
        fireEvent.click(screen.getByText('PRIVATE'));
        fireEvent.change(screen.getByPlaceholderText('Create a password...'), { target: { value: 'secret123' } });
        fireEvent.click(screen.getByText('CREATE SQUAD'));

        expect(mockConsume).toHaveBeenCalled();
        expect(screen.getByText('ACTIVE SQUAD LOBBY')).toBeInTheDocument();

        fireEvent.click(screen.getByText('LOCK IN SQUAD'));
        fireEvent.click(screen.getByText('START QUEST'));
        expect(mockRoll).toHaveBeenCalled();
        expect(screen.queryByText('ACTIVE SQUAD LOBBY')).not.toBeInTheDocument();
    });

    it('handles joining public and private squads', async () => {
        render(<CityComms userTokens={5} onConsumeToken={mockConsume} />);
        await screen.findByText('Rolling a random quest in 15 minutes. Need backup.');

        const joinBtns = screen.getAllByText(/JOIN SQUAD/);
        fireEvent.click(joinBtns[0]);
        expect(screen.getByText('ACTIVE SQUAD LOBBY')).toBeInTheDocument();
        expect(mockConsume).toHaveBeenCalledTimes(1);
        fireEvent.click(screen.getByText('LEAVE SQUAD'));

        fireEvent.click(screen.getByText('REQ CO-OP'));
        fireEvent.click(screen.getByText('PRIVATE'));
        fireEvent.change(screen.getByPlaceholderText('Create a password...'), { target: { value: 'pass' } });
        fireEvent.click(screen.getByText('CREATE SQUAD'));
        fireEvent.click(screen.getByText('LEAVE SQUAD'));

        promptSpy.mockReturnValueOnce('wrong_password');
        fireEvent.click(screen.getAllByText(/JOIN SQUAD/)[0]);
        expect(alertSpy).toHaveBeenCalledWith('ACCESS DENIED.');

        promptSpy.mockReturnValueOnce('pass');
        fireEvent.click(screen.getAllByText(/JOIN SQUAD/)[0]);
        expect(screen.getByText('ACTIVE SQUAD LOBBY')).toBeInTheDocument();
    });

    it('cancels join prompt gracefully', async () => {
        render(<CityComms userTokens={5} />);
        await screen.findByText('CITY COMMS');

        fireEvent.click(screen.getByText('REQ CO-OP'));
        fireEvent.click(screen.getByText('PRIVATE'));
        fireEvent.change(screen.getByPlaceholderText('Create a password...'), { target: { value: 'pass' } });
        fireEvent.click(screen.getByText('CREATE SQUAD'));
        fireEvent.click(screen.getByText('LEAVE SQUAD'));

        promptSpy.mockReturnValueOnce(null);
        fireEvent.click(screen.getAllByText(/JOIN SQUAD/)[0]);
        expect(screen.queryByText('ACTIVE SQUAD LOBBY')).not.toBeInTheDocument();
    });

    it('opens and closes user dossier profile', async () => {
        render(<CityComms />);
        await screen.findByText('Cipher');

        fireEvent.click(screen.getByText('Cipher'));
        expect(screen.getByText('NOTABLE CLEARANCE')).toBeInTheDocument();

        fireEvent.click(screen.getByText('✕', { selector: '.btn-close-modal' }));
        expect(screen.queryByText('NOTABLE CLEARANCE')).not.toBeInTheDocument();
    });
});