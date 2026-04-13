import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Load .env into process.env so integration tests can read STORE_HASH / ACCESS_TOKEN.
// Node 20.12+ (repo runs on v24.12). Swallow errors — a missing .env is fine;
// integration tests self-skip via `describe.runIf(hasCredentials)`.
try {
    process.loadEnvFile('.env');
} catch {
    // .env not present — integration tests will be skipped.
}

const alias = { '@': fileURLToPath(new URL('./src', import.meta.url)) };

export default defineConfig({
    test: {
        projects: [
            {
                resolve: { alias },
                test: {
                    exclude: ['src/tests/integration/**'],
                    globals: true,
                    include: ['src/tests/**/*.test.ts'],
                    name: 'unit',
                },
            },
            {
                resolve: { alias },
                test: {
                    globals: true,
                    include: ['src/tests/integration/**/*.test.ts'],
                    name: 'integration',
                },
            },
        ],
    },
});
