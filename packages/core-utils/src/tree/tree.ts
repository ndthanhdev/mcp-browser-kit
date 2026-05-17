/**
 * Represents a node in a tree structure with generic data type
 */
export interface TreeNode<T> {
	data: T;
	children?: TreeNode<T>[];
}

/**
 * Result of tree pruning operation - either a kept node or promoted children
 */
type PruneResult<R> =
	| {
			type: "keep";
			node: TreeNode<R>;
	  }
	| {
			type: "promote";
			children: TreeNode<R>[];
	  };

type PrunerContext<T, R> = {
	shouldInclude: (data: T) => boolean;
	transform: (data: T) => R;
	includeRoot: boolean;
};

function pruneNodeHelper<T, R>(
	node: TreeNode<T>,
	isRoot: boolean,
	ctx: PrunerContext<T, R>,
): PruneResult<R> {
	const processedChildren: TreeNode<R>[] = [];
	if (node.children) {
		for (const childNode of node.children) {
			const result = pruneNodeHelper(childNode, false, ctx);
			if (result.type === "keep") {
				processedChildren.push(result.node);
			} else {
				processedChildren.push(...result.children);
			}
		}
	}
	const shouldIncludeNode =
		(isRoot && ctx.includeRoot) || ctx.shouldInclude(node.data);
	if (!shouldIncludeNode) {
		return {
			type: "promote",
			children: processedChildren,
		};
	}
	return {
		type: "keep",
		node: {
			data: ctx.transform(node.data),
			children: processedChildren.length > 0 ? processedChildren : undefined,
		},
	};
}

/**
 * Conditionally prunes a tree using postorder traversal with child promotion.
 * Removed nodes promote their children to the closest parent in the tree hierarchy.
 * @param tree - The source tree to prune
 * @param options - Pruning options
 * @param options.shouldInclude - Predicate to determine if a node should be included (default: always true)
 * @param options.transform - Optional transformation function to apply to node data
 * @param options.includeRoot - If true, always include root node regardless of shouldInclude (default: true)
 * @returns Pruned tree with promoted children, or null if:
 *          - Root is excluded without children, or
 *          - Root is excluded with multiple children (no higher parent to promote to)
 */
export function conditionalPrune<T, R = T>(
	tree: TreeNode<T>,
	options: {
		shouldInclude?: (data: T) => boolean;
		transform?: (data: T) => R;
		includeRoot?: boolean;
	} = {},
): TreeNode<R> | null {
	const ctx: PrunerContext<T, R> = {
		shouldInclude: options.shouldInclude ?? (() => true),
		transform: options.transform ?? ((data) => data as unknown as R),
		includeRoot: options.includeRoot ?? true,
	};

	const result = pruneNodeHelper(tree, true, ctx);

	if (result.type === "keep") {
		return result.node;
	}
	if (result.children.length === 1) {
		return result.children[0];
	}
	return null;
}

/**
 * Maps a tree to an array of tuples [path, value]
 * @param node - The root node to map
 * @param mapFn - Optional function to transform node data before adding to result
 * @returns Array of tuples where path is a dot-separated string of indices (e.g., "0.1.2") and value is the node data (or mapped value)
 *
 * @example
 * ```ts
 * const tree = {
 *   data: 'root',
 *   children: [
 *     { data: 'child1' },
 *     { data: 'child2', children: [{ data: 'grandchild' }] }
 *   ]
 * };
 * const result = treeToPathValueArray(tree);
 * // [
 * //   ['0', 'root'],
 * //   ['0.0', 'child1'],
 * //   ['0.1', 'child2'],
 * //   ['0.1.0', 'grandchild']
 * // ]
 *
 * // With mapping function
 * const mapped = treeToPathValueArray(tree, (data) => data.toUpperCase());
 * // [
 * //   ['0', 'ROOT'],
 * //   ['0.0', 'CHILD1'],
 * //   ['0.1', 'CHILD2'],
 * //   ['0.1.0', 'GRANDCHILD']
 * // ]
 * ```
 */
export function treeToPathValueArray<T, U = T>(
	node: TreeNode<T>,
	mapFn?: (data: T) => U,
): Array<
	[
		string,
		U,
	]
> {
	const result: Array<
		[
			string,
			U,
		]
	> = [];

	function traverse(current: TreeNode<T>, path: string): void {
		const value = mapFn ? mapFn(current.data) : (current.data as unknown as U);
		result.push([
			path,
			value,
		]);

		if (current.children) {
			current.children.forEach((child, index) => {
				traverse(child, `${path}.${index}`);
			});
		}
	}

	traverse(node, "0");

	return result;
}

/**
 * Finds a node in the tree by its path
 * @param tree - The root node to search
 * @param path - Dot-separated path of indices (e.g., "0" for root, "0.1" for second child, "0.1.0" for its first grandchild)
 * @returns The node at the specified path, or null if not found
 *
 * @example
 * ```ts
 * const tree = {
 *   data: 'root',
 *   children: [
 *     { data: 'child1' },
 *     { data: 'child2', children: [{ data: 'grandchild' }] }
 *   ]
 * };
 * const node = findNodeByPath(tree, "0.1.0");
 * // { data: 'grandchild' }
 *
 * const notFound = findNodeByPath(tree, "0.5");
 * // null
 * ```
 */
export function findNodeByPath<T>(
	tree: TreeNode<T>,
	path: string,
): TreeNode<T> | null {
	const indices = path.split(".").map(Number);

	// Validate path starts with root index (0)
	if (indices.length === 0 || indices[0] !== 0 || indices.some(Number.isNaN)) {
		return null;
	}

	let current: TreeNode<T> = tree;

	// Traverse from index 1 onwards (index 0 is the root)
	for (let i = 1; i < indices.length; i++) {
		const childIndex = indices[i];

		if (
			!current.children ||
			childIndex < 0 ||
			childIndex >= current.children.length
		) {
			return null;
		}

		current = current.children[childIndex];
	}

	return current;
}
