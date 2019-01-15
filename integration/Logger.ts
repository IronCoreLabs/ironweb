export type LogSeverity = "error" | "info" | "success";

export interface LogItem {
    message: string;
    type: string;
}

type SubscriptionHandler = (logText: LogItem | LogItem[]) => void;

const logItems: LogItem[] = [];
const handlers: SubscriptionHandler[] = [];

/**
 * Add a subscription handler to the logger
 */
export function subscribe(handler: SubscriptionHandler) {
    handlers.push(handler);
    if (logItems.length) {
        handler(logItems);
    }
}

/**
 * Log an action
 * @param {string} text [description]
 */
export function logAction(message: string, type: LogSeverity = "info") {
    const log = {message, type};
    logItems.push(log);
    handlers.forEach((handler) => {
        handler(log);
    });
}
