import '@testing-library/jest-dom';

// Mock createObjectURL (used by file upload handlers)
global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/mock-url');
global.URL.revokeObjectURL = vi.fn();

// Silence console.error for expected React warnings in tests
const originalError = console.error;
beforeAll(() => {
    console.error = (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('Warning:')) return;
        originalError.call(console, ...args);
    };
});
afterAll(() => { console.error = originalError; });