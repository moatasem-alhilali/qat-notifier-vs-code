type AnyFn = (...args: never[]) => void;

export function debounce<T extends AnyFn>(fn: T, waitMs: number): T {
	let timeout: NodeJS.Timeout | undefined;

	const debounced = ((...args: Parameters<T>) => {
		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(() => {
			timeout = undefined;
			fn(...args);
		}, waitMs);
	}) as T;

	return debounced;
}
