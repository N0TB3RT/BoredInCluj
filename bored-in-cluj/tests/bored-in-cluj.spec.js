import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('Bored In Cluj - Master E2E Journey', () => {

    test('Complete System Traversal: Home -> Quests -> Events -> Forum -> Profile -> Admin', async ({ page }) => {

        // ==========================================
        // 1. AUTHENTICATION
        // ==========================================
        await page.goto(BASE_URL);
        await expect(page.getByText('LEVEL UP YOUR REAL LIFE.')).toBeVisible();

        await page.getByPlaceholder('runner@matrix.com').fill('neo@matrix.com');
        await page.getByPlaceholder('••••••••••••').fill('SecureCipher123');
        await page.getByText('INITIALIZE CONNECTION').click();

        // ==========================================
        // 2. HOME (HUB)
        // ==========================================
        // After login, we are natively on the Home tab. Test the Hub here!
        await expect(page.getByText('SYSTEM STATUS: ONLINE')).toBeVisible();
        await expect(page.locator('.token-count')).toBeVisible();

        await page.getByText('HAVE OTHER IDEAS?').click();
        await expect(page.getByText('SUGGEST A QUEST', { exact: true })).toBeVisible();
        await page.getByText('CANCEL').click();

        // ==========================================
        // 3. QUESTS (MISSION ARCHIVE)
        // ==========================================
        // Use proper casing and getByRole for navigation
        await page.getByRole('button', { name: 'Quests', exact: true }).click();

        // Check for an element that exists on the Archive page
        await expect(page.getByText('LIFETIME DIFFICULTY')).toBeVisible();

        // ==========================================
        // 4. EVENTS
        // ==========================================
        await page.getByRole('button', { name: 'Events', exact: true }).click();
        await expect(page.getByRole('heading', { name: 'EVENTS', exact: true })).toBeVisible();

        // ==========================================
        // 5. FORUM (CITY COMMS)
        // ==========================================
        await page.getByRole('button', { name: 'Forum', exact: true }).click();

        await page.getByText('TRANSMIT').click();
        await expect(page.getByText('CANNOT TRANSMIT EMPTY SIGNAL.')).toBeVisible();

        const input = page.getByPlaceholder('Broadcast to the city (Max 250 chars)...');
        await input.fill('A'.repeat(251));
        await page.getByText('TRANSMIT').click();
        await expect(page.getByText('SIGNAL TOO LARGE (251/250 CHARACTERS).')).toBeVisible();

        // ==========================================
        // 6. PROFILE & ADMIN ACCESS
        // ==========================================
        await page.getByRole('button', { name: 'Avatar Profile', exact: true }).click();
        const adminButton = page.getByText('ADMIN PANEL');
        await adminButton.scrollIntoViewIfNeeded();
        await adminButton.click();

        // ==========================================
        // 7. ADMIN DASHBOARD
        // ==========================================
        await expect(page.getByText('ADMIN DASHBOARD')).toBeVisible();

        // Start the backend data generation
        await page.getByText('⚡ START SIMULATION').click();

        // Give the UI a moment to update the table after generation
        const firstRow = page.locator('tbody tr').first();
        await expect(firstRow).not.toContainText('NO MATCHING DATA FOUND.', { timeout: 10000 });

        // PLAYWRIGHT BEST PRACTICE: Dynamic Data Extraction
        // Instead of hardcoding 'Exploration', we dynamically read the 'TYPE'
        // (the 3rd column, index 2) of whatever quest was just generated.
        const dynamicType = await firstRow.locator('td').nth(2).textContent();
        const searchTerm = dynamicType.trim();

        // Search for the dynamically extracted type
        const searchInput = page.getByPlaceholder('Search Database by ID, Title, or Type...');
        await searchInput.fill(searchTerm);

        // Verify the table successfully filtered and kept a row matching our term
        await expect(page.locator('tbody tr').first()).toContainText(searchTerm);
    });

});