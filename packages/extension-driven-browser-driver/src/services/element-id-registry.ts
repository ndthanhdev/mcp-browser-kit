import { injectable } from "inversify";

const LEGACY_PATH_PATTERN = /^\d+(\.\d+)*$/;

/**
 * Assigns each element a stable id (`e` + base-36 counter) the first time it
 * is snapshotted. The id survives later snapshots for as long as the element
 * stays in the document, so DOM changes elsewhere never shift it.
 */
@injectable()
export class ElementIdRegistry {
	private nextId = 1;
	private readonly idByElement = new WeakMap<globalThis.Element, string>();
	private readonly elementById = new Map<string, WeakRef<globalThis.Element>>();

	idOf = (element: globalThis.Element): string => {
		const existing = this.idByElement.get(element);
		if (existing) {
			// prune() may have dropped it while the element was detached.
			if (!this.elementById.has(existing)) {
				this.elementById.set(existing, new WeakRef(element));
			}
			return existing;
		}

		const id = `e${(this.nextId++).toString(36)}`;
		this.idByElement.set(element, id);
		this.elementById.set(id, new WeakRef(element));
		return id;
	};

	/**
	 * Resolves an id to its element.
	 * @throws if the id is unknown, the element left the document, or the id
	 *   is a pre-stable-id positional path.
	 */
	elementOf = (id: string): HTMLElement => {
		if (LEGACY_PATH_PATTERN.test(id)) {
			throw new Error(
				`"${id}" is a positional path; readable paths are now element ids (e.g. e1a) — re-read readable-elements`,
			);
		}

		const element = this.elementById.get(id)?.deref();
		if (!element || !document.contains(element)) {
			throw new Error(
				`Element ${id} no longer exists — re-read readable-elements`,
			);
		}
		return element as HTMLElement;
	};

	/** Forgets ids whose elements were garbage-collected or detached. */
	prune = (): void => {
		for (const [id, ref] of this.elementById) {
			const element = ref.deref();
			if (!element || !document.contains(element)) {
				this.elementById.delete(id);
			}
		}
	};
}
