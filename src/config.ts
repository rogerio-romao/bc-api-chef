// oxlint-disable node/no-process-env

const maybeStoreHash = process.env.STORE_HASH;
if (maybeStoreHash === undefined || maybeStoreHash === '') {
    throw new Error('Missing STORE_HASH environment variable');
}

const maybeAccessToken = process.env.ACCESS_TOKEN;
if (maybeAccessToken === undefined || maybeAccessToken === '') {
    throw new Error('Missing ACCESS_TOKEN environment variable');
}

export const STORE_HASH = maybeStoreHash;
export const ACCESS_TOKEN = maybeAccessToken;
