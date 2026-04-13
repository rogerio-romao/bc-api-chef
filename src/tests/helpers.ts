import type { TchefResult } from 'tchef';

export function assertOk<T>(result: TchefResult<T>): asserts result is { ok: true; data: T } {
    if (!result.ok) {
        throw new Error(
            `Expected result.ok === true, got error: "${result.error}" (status ${result.statusCode.toString()})`,
        );
    }
}

export function assertErr<T>(
    result: TchefResult<T>,
): asserts result is { ok: false; error: string; statusCode: number } {
    if (result.ok) {
        throw new Error(
            `Expected result.ok === false, but request succeeded with data: ${JSON.stringify(result.data)}`,
        );
    }
}
