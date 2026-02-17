type AnyFn = (...args: never[]) => void;

export function throttle<T extends AnyFn>(fn: T, waitMs: number): T {
	let lastInvoke = 0;
	let timeout: NodeJS.Timeout | undefined;
	let lastArgs: Parameters<T> | undefined;

	const invoke = () => {
		timeout = undefined;
		lastInvoke = Date.now();
		if (lastArgs) {
			fn(...lastArgs);
			lastArgs = undefined;
		}
	};

	const throttled = ((...args: Parameters<T>) => {
		const now = Date.now();
		const remaining = waitMs - (now - lastInvoke);
		lastArgs = args;

		if (remaining <= 0 || lastInvoke === 0) {
			if (timeout) {
				clearTimeout(timeout);
				timeout = undefined;
			}
			lastInvoke = now;
			fn(...args);
			lastArgs = undefined;
			return;
		}

		if (!timeout) {
			timeout = setTimeout(invoke, remaining);
		}
	}) as T;

	return throttled;
}
