// src/__tests__/Profile.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Profile from '../Profile';

vi.mock('./Profile.css', () => ({}));

const mockUser = {
    username: 'NeonRunner',
    tokens: 5,
    isAdmin: true,
    avatar: 'Runner1',
    completedQuests: [
        { questId: 'q_101', bestRating: 4.8, completedAt: '2026-05-01' },
        { questId: 'q_102', bestRating: 4.2, completedAt: '2026-04-20' },
    ],
    currentXp: 8450,
    xpToNext: 10000,
    reputation: 142,
    badges: ['Night Owl', 'First Blood'],
};

const renderProfile = (overrides = {}) => {
    const props = {
        user: mockUser,
        onUpdateProfile: vi.fn(),
        onLogout: vi.fn(),
        onAdminClick: vi.fn(),
        ...overrides,
    };
    render(<Profile {...props} />);
    return props;
};

describe('Profile – Render', () => {
    it('renders the username', () => {
        renderProfile();
        expect(screen.getByText('NeonRunner')).toBeInTheDocument();
    });

    it('renders the level', () => {
        renderProfile();
        expect(screen.getByText('Level 12')).toBeInTheDocument();
    });

    it('renders the XP progress labels', () => {
        renderProfile();
        expect(screen.getByText('8,450 / 10,000')).toBeInTheDocument();
    });

    it('renders token count in stats', () => {
        renderProfile();
        expect(screen.getByText('5')).toBeInTheDocument(); // tokens stat
    });

    it('renders quests cleared count', () => {
        renderProfile();
        expect(screen.getByText('2')).toBeInTheDocument(); // completedQuests.length
    });

    it('renders reputation value', () => {
        renderProfile();
        expect(screen.getByText('142')).toBeInTheDocument();
    });

    it('renders the Achievements section', () => {
        renderProfile();
        expect(screen.getByText('Achievements')).toBeInTheDocument();
    });

    it('renders all badge names', () => {
        renderProfile();
        expect(screen.getByText('Night Owl')).toBeInTheDocument();
        expect(screen.getByText('Gourmet')).toBeInTheDocument();
        expect(screen.getByText('Socialite')).toBeInTheDocument();
        expect(screen.getByText('Explorer')).toBeInTheDocument();
        expect(screen.getByText('Early Bird')).toBeInTheDocument();
    });

    it('renders the avatar image', () => {
        renderProfile();
        const avatars = screen.getAllByAltText('Avatar');
        expect(avatars.length).toBeGreaterThan(0);
    });

    it('renders avatar from DiceBear when avatar is a seed string', () => {
        renderProfile();
        const avatar = screen.getAllByAltText('Avatar')[0];
        expect(avatar.src).toContain('dicebear.com');
    });

    it('renders avatar from blob URL when avatar starts with blob:', () => {
        renderProfile({ user: { ...mockUser, avatar: 'blob:http://localhost/abc' } });
        const avatar = screen.getAllByAltText('Avatar')[0];
        expect(avatar.src).toContain('blob:');
    });
});

describe('Profile – Admin Button', () => {
    it('renders Admin Panel button when user is admin', () => {
        renderProfile();
        expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    });

    it('does not render Admin Panel button when user is not admin', () => {
        renderProfile({ user: { ...mockUser, isAdmin: false } });
        expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
    });

    it('calls onAdminClick when Admin Panel button is clicked', () => {
        const props = renderProfile();
        fireEvent.click(screen.getByText('Admin Panel'));
        expect(props.onAdminClick).toHaveBeenCalledTimes(1);
    });
});

describe('Profile – Logout', () => {
    it('renders Logout button', () => {
        renderProfile();
        expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('calls onLogout when Logout is clicked', () => {
        const props = renderProfile();
        fireEvent.click(screen.getByText('Logout'));
        expect(props.onLogout).toHaveBeenCalledTimes(1);
    });
});

describe('Profile – Edit Modal', () => {
    it('opens edit modal when Edit Profile is clicked', () => {
        renderProfile();
        fireEvent.click(screen.getByText('Edit Profile'));
        expect(screen.getByText('EDIT PROFILE')).toBeInTheDocument();
    });

    it('pre-fills username field with current username', () => {
        renderProfile();
        fireEvent.click(screen.getByText('Edit Profile'));
        const input = screen.getByDisplayValue('NeonRunner');
        expect(input).toBeInTheDocument();
    });

    it('allows editing the username', () => {
        renderProfile();
        fireEvent.click(screen.getByText('Edit Profile'));
        const input = screen.getByDisplayValue('NeonRunner');
        fireEvent.change(input, { target: { value: 'NewRunner' } });
        expect(input.value).toBe('NewRunner');
    });

    it('closes the modal on CANCEL', () => {
        renderProfile();
        fireEvent.click(screen.getByText('Edit Profile'));
        fireEvent.click(screen.getByText('CANCEL'));
        expect(screen.queryByText('EDIT PROFILE')).not.toBeInTheDocument();
    });

    it('closes modal when clicking overlay', () => {
        renderProfile();
        fireEvent.click(screen.getByText('Edit Profile'));
        const overlay = document.querySelector('.profile-modal-overlay');
        fireEvent.click(overlay);
        expect(screen.queryByText('EDIT PROFILE')).not.toBeInTheDocument();
    });

    it('calls onUpdateProfile with new username on save', () => {
        const props = renderProfile();
        fireEvent.click(screen.getByText('Edit Profile'));
        const input = screen.getByDisplayValue('NeonRunner');
        fireEvent.change(input, { target: { value: 'CyberRunner' } });
        fireEvent.click(screen.getByText('SAVE CHANGES'));
        expect(props.onUpdateProfile).toHaveBeenCalledWith(
            expect.objectContaining({ username: 'CyberRunner' })
        );
    });

    it('does not save if username is blank', () => {
        const props = renderProfile();
        fireEvent.click(screen.getByText('Edit Profile'));
        const input = screen.getByDisplayValue('NeonRunner');
        fireEvent.change(input, { target: { value: '   ' } });
        fireEvent.click(screen.getByText('SAVE CHANGES'));
        expect(props.onUpdateProfile).not.toHaveBeenCalled();
    });

    it('renders UPLOAD NEW PHOTO button inside modal', () => {
        renderProfile();
        fireEvent.click(screen.getByText('Edit Profile'));
        expect(screen.getByText('UPLOAD NEW PHOTO')).toBeInTheDocument();
    });

    it('shows avatar preview in modal', () => {
        renderProfile();
        fireEvent.click(screen.getByText('Edit Profile'));
        expect(screen.getByAltText('Preview')).toBeInTheDocument();
    });
});