import { RuleCheck } from '../models';

export function alwaysMatcher(_check: RuleCheck): boolean {
	return true;
}
