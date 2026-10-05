const { AsyncLocalStorage } = require('node:async_hooks');
const lockStore = new AsyncLocalStorage();
const locks = new Map();


async function withLock(key, fn) {
    const activeLocks = lockStore.getStore() || new Set();

    if (activeLocks.has(key)) {
        return await fn();
    }

    const previousPromise = locks.get(key) || Promise.resolve();

    const contextPromise = (async () => {
        try {
            await previousPromise;
        } catch (error) {
        }

        const newLocks = new Set(activeLocks);
        newLocks.add(key);

        return await lockStore.run(newLocks, fn);
    })();

    locks.set(key, contextPromise);

    contextPromise.finally(() => {
        if (locks.get(key) === contextPromise) {
            locks.delete(key);
        }
    });

    return contextPromise;
}

module.exports = { withLock };

