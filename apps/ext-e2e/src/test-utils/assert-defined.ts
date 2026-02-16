import { expect } from "@playwright/test";

export function expectToBeDefined<T>(
	arg: T,
): asserts arg is Exclude<T, undefined | null> {
	expect(arg).toBeDefined();
}
