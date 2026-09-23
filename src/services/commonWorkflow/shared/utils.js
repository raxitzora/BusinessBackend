export function randomDelay(minMs, maxMs) {
    const ms =
        Math.floor(
            Math.random() * (maxMs - minMs + 1)
        ) + minMs;

    return new Promise((resolve) =>
        setTimeout(resolve, ms)
    );
}