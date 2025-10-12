import * as changeCase from "change-case";
import { nanoid } from "nanoid";

/**
 * Creates a static class with methods to generate and validate IDs with a predefined prefix
 * @param prefix - The prefix to use for all generated IDs (will be converted to lowercase kebab-case)
 * @returns An object with `generate()` and `isValid()` methods
 *
 * @example
 * ```ts
 * const userId = createPrefixId('user');
 * const id1 = userId.generate(); // 'user:a1b2c3d4'
 * const id2 = userId.generate(); // 'user:e5f6g7h8'
 *
 * userId.isValid('user:a1b2c3d4'); // true
 * userId.isValid('invalid-id'); // false
 *
 * const sessionId = createPrefixId('UserSession');
 * sessionId.generate(); // 'user-session:a1b2c3d4'
 * ```
 */
export const createPrefixId = (prefix: string) => {
	const normalizedPrefix = changeCase.kebabCase(prefix);

	return {
		/**
		 * Generates a new ID with the predefined prefix
		 * @returns A new ID in the format `<prefix>:<nanoid-length-8>`
		 */
		generate: () => `${normalizedPrefix}:${nanoid(8)}`,

		/**
		 * Validates if a given ID matches the expected prefix pattern
		 * @param id - The ID to validate
		 * @returns `true` if the ID matches the pattern, `false` otherwise
		 */
		isValid: (id: string) => {
			const pattern = new RegExp(`^${normalizedPrefix}:[A-Za-z0-9_-]{8}$`);
			return pattern.test(id);
		},
	};
};
