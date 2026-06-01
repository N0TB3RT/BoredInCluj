// src/utils/syncEngine.js

const QUEUE_KEY = 'bored_in_cluj_offline_queue';

// Push a failed/offline request into local storage
export const enqueueRequest = (requestData) => {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
    queue.push(requestData);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`[SYNC ENGINE] Request queued. Total pending: ${queue.length}`);
};

// Retrieve the queue
export const getQueue = () => {
    return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
};

// Wipe the queue after a successful sync
export const clearQueue = () => {
    localStorage.removeItem(QUEUE_KEY);
};

export const smartFetch = async (url, options = {}) => {
    const isMutation = options.method && ['POST', 'PUT', 'DELETE'].includes(options.method.toUpperCase());

    // SCENARIO 1: We know we are offline before even trying
    if (!navigator.onLine && isMutation) {
        console.warn('[SYNC ENGINE] Network down. Intercepting request.');
        enqueueRequest({ url, options });
        return { ok: true, queued: true }; // Fake a success to keep the UI happy
    }

    try {
        const response = await fetch(url, options);
        return response;
    } catch (error) {
        // SCENARIO 2: Wi-Fi is on, but the FastAPI server is dead/unreachable
        if (isMutation) {
            console.error('[SYNC ENGINE] Server unreachable. Intercepting request.');
            enqueueRequest({ url, options });
            return { ok: true, queued: true }; // Fake a success
        }
        throw error; // If it's a GET request, we just let it fail
    }
};