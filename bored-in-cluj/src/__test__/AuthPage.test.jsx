import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthPage from '../AuthPage';
import Cookies from 'js-cookie';

vi.mock('js-cookie', () => {
    return {
        default: {
            get: vi.fn(),
            set: vi.fn(),
            remove: vi.fn()
        }
    };
});

describe('AuthPage Component', () => {
    const mockOnLogin = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the default login state correctly', () => {
        render(<AuthPage onLogin={mockOnLogin} />);
        expect(screen.getByText('BORED IN CLUJ')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('runner@matrix.com')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('••••••••••••')).toBeInTheDocument();
    });

    it('toggles between SYSTEM LOGIN and NEW RUNNER and clears state', () => {
        render(<AuthPage onLogin={mockOnLogin} />);

        const newRunnerBtn = screen.getByText('NEW RUNNER');
        const loginBtn = screen.getByText('SYSTEM LOGIN');
        const passInput = screen.getByPlaceholderText('••••••••••••');

        // Type a password and trigger an error
        fireEvent.change(passInput, { target: { value: 'Trinity123' } });
        fireEvent.submit(screen.getByText('INITIALIZE CONNECTION').closest('form'));
        expect(screen.getByText('EMAIL ADDRESS REQUIRED.')).toBeInTheDocument();

        // Switch to New Runner -> Errors and password should be cleared
        fireEvent.click(newRunnerBtn);
        expect(screen.getByPlaceholderText('Enter your username...')).toBeInTheDocument();
        expect(passInput.value).toBe('');
        expect(screen.queryByText('EMAIL ADDRESS REQUIRED.')).not.toBeInTheDocument();

        // Switch back to Login
        fireEvent.click(loginBtn);
        expect(screen.queryByPlaceholderText('Enter your username...')).not.toBeInTheDocument();
    });

    it('clears specific errors when typing in the input', () => {
        render(<AuthPage onLogin={mockOnLogin} />);

        // Trigger empty errors
        fireEvent.submit(screen.getByText('INITIALIZE CONNECTION').closest('form'));
        expect(screen.getByText('EMAIL ADDRESS REQUIRED.')).toBeInTheDocument();

        // Typing in the email field should clear just the email error
        const emailInput = screen.getByPlaceholderText('runner@matrix.com');
        fireEvent.change(emailInput, { target: { value: 'n' } });

        expect(screen.queryByText('EMAIL ADDRESS REQUIRED.')).not.toBeInTheDocument();
        // Password error should still be there
        expect(screen.getByText('ACCESS KEY REQUIRED.')).toBeInTheDocument();
    });

    // --- VALIDATION ENGINE TESTS ---

    it('blocks submission and shows errors for completely empty fields', () => {
        render(<AuthPage onLogin={mockOnLogin} />);
        fireEvent.submit(screen.getByText('INITIALIZE CONNECTION').closest('form'));

        expect(screen.getByText('EMAIL ADDRESS REQUIRED.')).toBeInTheDocument();
        expect(screen.getByText('ACCESS KEY REQUIRED.')).toBeInTheDocument();
        expect(mockOnLogin).not.toHaveBeenCalled();
    });

    it('blocks invalid email formats', () => {
        render(<AuthPage onLogin={mockOnLogin} />);
        const emailInput = screen.getByPlaceholderText('runner@matrix.com');

        fireEvent.change(emailInput, { target: { value: 'bademail@' } });
        fireEvent.submit(screen.getByText('INITIALIZE CONNECTION').closest('form'));

        expect(screen.getByText('INVALID ENCRYPTION PROTOCOL (BAD FORMAT).')).toBeInTheDocument();
        expect(mockOnLogin).not.toHaveBeenCalled();
    });

    it('enforces complex cipher rules for the Access Key', () => {
        render(<AuthPage onLogin={mockOnLogin} />);
        const passInput = screen.getByPlaceholderText('••••••••••••');
        const submitBtn = screen.getByText('INITIALIZE CONNECTION');

        // Test 1: Too short
        fireEvent.change(passInput, { target: { value: 'Short1!' } });
        fireEvent.submit(submitBtn.closest('form'));
        expect(screen.getByText('KEY MUST BE AT LEAST 8 CHARACTERS.')).toBeInTheDocument();

        // Test 2: No Uppercase
        fireEvent.change(passInput, { target: { value: 'nouppercase123' } });
        fireEvent.submit(submitBtn.closest('form'));
        expect(screen.getByText('KEY REQUIRES UPPERCASE CIPHER.')).toBeInTheDocument();

        // Test 3: No Numbers
        fireEvent.change(passInput, { target: { value: 'NoNumbersHere' } });
        fireEvent.submit(submitBtn.closest('form'));
        expect(screen.getByText('KEY REQUIRES NUMERIC CIPHER.')).toBeInTheDocument();
    });

    it('enforces alias rules when registering a New Runner', () => {
        render(<AuthPage onLogin={mockOnLogin} />);
        fireEvent.click(screen.getByText('NEW RUNNER'));

        const userInput = screen.getByPlaceholderText('Enter your username...');
        const submitBtn = screen.getByText('REGISTER TO THE GRID');

        // Test 1: Empty Alias
        fireEvent.submit(submitBtn.closest('form'));
        expect(screen.getByText('RUNNER ALIAS REQUIRED.')).toBeInTheDocument();

        // Test 2: Bad format (Contains space)
        fireEvent.change(userInput, { target: { value: 'Neon Runner' } });
        fireEvent.submit(submitBtn.closest('form'));
        expect(screen.getByText('ALIAS MUST BE 3-16 ALPHANUMERIC CHARS (NO SPACES).')).toBeInTheDocument();
    });

    // --- SUCCESSFUL SUBMISSION TESTS ---

    it('writes a cookie and submits valid data when "Keep me connected" is checked', () => {
        render(<AuthPage onLogin={mockOnLogin} />);

        const emailInput = screen.getByPlaceholderText('runner@matrix.com');
        const passInput = screen.getByPlaceholderText('••••••••••••');
        const checkbox = screen.getByLabelText('KEEP ME CONNECTED');
        const submitBtn = screen.getByText('INITIALIZE CONNECTION');

        // Fill perfectly valid data
        fireEvent.change(emailInput, { target: { value: 'neo@matrix.com' } });
        fireEvent.change(passInput, { target: { value: 'SecureCipher123' } });

        fireEvent.click(checkbox); // Toggle to true
        fireEvent.submit(submitBtn.closest('form'));

        expect(Cookies.set).toHaveBeenCalledWith('bored_in_cluj_runner', 'neo@matrix.com', { expires: 30 });
        expect(mockOnLogin).toHaveBeenCalledTimes(1);
        expect(mockOnLogin).toHaveBeenCalledWith({ email: 'neo@matrix.com', username: '', isLogin: true });
    });

    it('removes the cookie when logging in with "Keep me connected" unchecked', () => {
        Cookies.get.mockReturnValue('old@matrix.com');
        render(<AuthPage onLogin={mockOnLogin} />);

        // Email will auto-fill from mock cookie, just need to supply a valid password
        const passInput = screen.getByPlaceholderText('••••••••••••');
        fireEvent.change(passInput, { target: { value: 'SecureCipher123' } });

        const checkbox = screen.getByLabelText('KEEP ME CONNECTED');
        const submitBtn = screen.getByText('INITIALIZE CONNECTION');

        // Uncheck the pre-filled box
        fireEvent.click(checkbox);
        fireEvent.submit(submitBtn.closest('form'));

        expect(Cookies.remove).toHaveBeenCalledWith('bored_in_cluj_runner');
        expect(mockOnLogin).toHaveBeenCalledTimes(1);
    });

    // --- 3D MATH TEST ---

    it('handles the 3D hologram mouse movement and reset', () => {
        render(<AuthPage onLogin={mockOnLogin} />);

        const pitchDiv = screen.getByText('LEVEL UP YOUR REAL LIFE.').closest('.auth-pitch');
        const hologramBox = pitchDiv.querySelector('.hologram-box');

        hologramBox.getBoundingClientRect = vi.fn(() => ({ left: 100, top: 100, width: 400, height: 400 }));

        fireEvent.mouseMove(pitchDiv, { clientX: 200, clientY: 150 });
        expect(hologramBox.style.transform).toContain('perspective(1000px)');

        fireEvent.mouseLeave(pitchDiv);
        expect(hologramBox.style.transform).toBe('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    });
});