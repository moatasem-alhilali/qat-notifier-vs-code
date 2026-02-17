import { EditorSnapshot } from '../../core/types';
import { RuleCheck } from '../models';

export function dirtyIdleMatcher(
	check: RuleCheck,
	snapshot: EditorSnapshot,
	idleDurationMs: number,
	defaultIdleMs: number,
): boolean {
	if (!snapshot.document) {
		return false;
	}
	if (!snapshot.isDirty) {
		return false;
	}
	const requiredIdle = check.idleMs ?? defaultIdleMs;
	return idleDurationMs >= requiredIdle;
}
