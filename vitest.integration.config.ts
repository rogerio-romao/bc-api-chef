import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        setupFiles: ['./vitest.integration.setup.ts'],
        include: ['src/tests/integration/**/*.test.ts'],
    },
});
