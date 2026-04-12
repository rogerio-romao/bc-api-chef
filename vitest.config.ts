import { defineConfig } from 'vitest/config';

// Load .env into process.env so integration tests can read STORE_HASH / ACCESS_TOKEN.
// Node 20.12+ (repo runs on v24.12). Swallow errors — a missing .env is fine;
// integration tests self-skip via `describe.runIf(hasCredentials)`.
try {
    process.loadEnvFile('.env');
} catch {
    // .env not present — integration tests will be skipped.
}

export default defineConfig({
    test: {
        projects: [
            {
                extends: true,
                test: {
                    name: 'unit',
                    include: ['src/tests/**/*.test.ts'],
                    exclude: ['src/tests/integration/**'],
                },
            },
            {
                extends: true,
                test: {
                    name: 'integration',
                    include: ['src/tests/integration/**/*.test.ts'],
                },
            },
        ],
    },
});
