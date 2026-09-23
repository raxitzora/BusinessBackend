export function withTimeout(
    promise,
    timeoutMs,
    operationName
) {
    let timeoutId;

    const timeoutPromise =
        new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
                reject(
                    new Error(
                        `${operationName} timed out after ${timeoutMs}ms.`
                    )
                );
            }, timeoutMs);
        });

    return Promise.race([
        promise,
        timeoutPromise,
    ]).finally(() => {
        clearTimeout(timeoutId);
    });
}