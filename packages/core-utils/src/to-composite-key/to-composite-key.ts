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
 * @param propertyNames - Array of property names in the order they should appear in the composite key
 * @param separator - The separator to use for the composite key (default: '::')
 * @returns A new class with composite key functionality
 *
 * @example
 * ```typescript
 * const PersonKey = toCompositeKey<{ name: string; age: number }>(["name", "age"], "::");
 *
 * const person = PersonKey.from({ name: "John", age: 30 });
 * console.log(person.toString()); // "John::30"
 *
 * const parsed = PersonKey.parse("Jane::25");
 * console.log(parsed.name, parsed.age); // "Jane" 25
 * ```
 */
export function toCompositeKey<Base extends Record<string, string | number>>(
	propertyNames: (keyof Base)[],
	separator = "::",
) {
	return class implements CompositeKeyMixin {
		private constructor() {}

		/**
		 * Override toString to generate a composite key from all existing fields
		 * @returns A string key composed of all field values separated by the separator
		 */
		toString(): string {
			const values = [];

			for (const key of propertyNames) {
				const value = (this as Record<string, unknown>)[key as string];
				// Convert value to string, handling null/undefined
				const stringValue =
					value === null
						? "null"
						: value === undefined
							? "undefined"
							: String(value);
				values.push(stringValue);
			}

			return values.join(separator);
		}

		/**
		 * Static method to parse a composite key string back to an instance
		 * @param key - The composite key string to parse
		 * @returns A new instance of the class with parsed values
		 */
		static parse(this: new () => Base, key: string): Base {
			const values = key.split(separator);

			// Create a new instance
			// biome-ignore lint/complexity/noThisInStatic: used for constructor type
			const instance = new this();

			// Assign parsed values to properties
			propertyNames.forEach((prop, index) => {
				if (index < values.length) {
					const value = values[index];
					const propKey = prop as string;

					// Handle special string values
					if (value === "null") {
						(instance as Record<string, unknown>)[propKey] = null;
					} else if (value === "undefined") {
						(instance as Record<string, unknown>)[propKey] = undefined;
					} else {
						// Try to parse as number if it looks like a number
						const numValue = Number(value);
						if (!Number.isNaN(numValue) && value.trim() !== "") {
							(instance as Record<string, unknown>)[propKey] = numValue;
						} else {
							// Keep as string
							(instance as Record<string, unknown>)[propKey] = value;
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
				(instance as Record<string, unknown>)[key] = value;
			}

			return instance as Base;
		}
	} as unknown as CompositeKeyStatic<Base>;
}

/**
 * Type helper for classes enhanced with composite key functionality
 */
export type WithCompositeKey<T> = T & CompositeKeyMixin;
