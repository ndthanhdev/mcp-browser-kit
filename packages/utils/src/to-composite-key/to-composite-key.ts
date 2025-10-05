/**
 * Interface for classes with composite key functionality
 */
export interface CompositeKeyMixin {
	toString(): string;
}

/**
 * Static methods added to the composite key class
 */
export interface CompositeKeyStatic<T extends Record<string, string | number>> {
	parse(key: string): T;
	from(data: T): T;
}

/**
 * Mixin function that adds composite key functionality to a class
 * @param Base - The base class to extend
 * @param separator - The separator to use for the composite key (default: ':')
 * @returns A new class with composite key functionality
 *
 * @example
 * ```typescript
 * class Person {
 *   constructor(public name: string, public age: number) {}
 * }
 *
 * const PersonWithKey = toCompositeKey(Person);
 * const person = new PersonWithKey("John", 30);
 * console.log(person.toString()); // "John:30"
 *
 * const parsed = PersonWithKey.parse("Jane:25");
 * console.log(parsed.name, parsed.age); // "Jane" 25
 *
 * const fromMap = PersonWithKey.from({ name: "Bob", age: 35 });
 * console.log(fromMap.name, fromMap.age); // "Bob" 35
 * ```
 */
export function toCompositeKey<Base extends Record<string, string | number>>(
	separator = ":",
) {
	return class implements CompositeKeyMixin {
		private constructor() {}

		/**
		 * Override toString to generate a composite key from all existing fields
		 * @returns A string key composed of all field values separated by the separator
		 */
		toString(): string {
			const values = [];

			// Get all enumerable properties of the instance
			for (const key in this) {
				if (Object.hasOwn(this, key)) {
					const value = this[key];
					// Convert value to string, handling null/undefined
					const stringValue =
						value === null
							? "null"
							: value === undefined
								? "undefined"
								: String(value);
					values.push(stringValue);
				}
			}

			return values.join(separator);
		}

		/**
		 * Static method to parse a composite key string back to an instance
		 * @param key - The composite key string to parse
		 * @returns A new instance of the class with parsed values
		 */
		static parse(this: new () => Base, key: string): Base {
			const usedSeparator = separator;
			const values = key.split(usedSeparator);

			// Create a new instance
			// biome-ignore lint/complexity/noThisInStatic: used for constructor type
			const instance = new this();

			// Get the property names from a temporary instance to maintain order
			const propertyNames = [];
			for (const prop in instance) {
				if (Object.hasOwn(instance, prop)) {
					propertyNames.push(prop);
				}
			}

			// Assign parsed values to properties
			propertyNames.forEach((prop, index) => {
				if (index < values.length) {
					const value = values[index];

					// Handle special string values
					if (value === "null") {
						(instance as Record<string, unknown>)[prop] = null;
					} else if (value === "undefined") {
						(instance as Record<string, unknown>)[prop] = undefined;
					} else {
						// Try to parse as number if it looks like a number
						const numValue = Number(value);
						if (!Number.isNaN(numValue) && value.trim() !== "") {
							(instance as Record<string, unknown>)[prop] = numValue;
						} else {
							// Keep as string
							(instance as Record<string, unknown>)[prop] = value;
						}
					}
				}
			});

			return instance as Base;
		}

		/**
		 * Static method to create an instance from a map of key-value pairs
		 * @param data - The map of key-value pairs (keys must be properties of the class)
		 * @returns A new instance of the class with the provided data
		 */
		static from(this: new () => Base, data: Base): Base {
			// Create a new instance
			// biome-ignore lint/complexity/noThisInStatic: used for constructor type
			const instance = new this();

			// Set properties from the data map
			for (const [key, value] of Object.entries(data)) {
				if (Object.hasOwn(instance, key)) {
					(instance as Record<string, unknown>)[key] = value;
				}
			}

			return instance as Base;
		}
	} as unknown as CompositeKeyStatic<Base>;
}

/**
 * Type helper for classes enhanced with composite key functionality
 */
export type WithCompositeKey<T> = T & CompositeKeyMixin;
