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
	const {
		shouldInclude = () => true,
		transform = (data) => data as unknown as R,
		includeRoot = true,
	} = options;

	function pruneNode(node: TreeNode<T>, isRoot: boolean): PruneResult<R> {
		// Step 1: Postorder Traversal - Process children first
		const processedChildren: TreeNode<R>[] = [];

		if (node.children) {
			for (const childNode of node.children) {
				const result = pruneNode(childNode, false);

				if (result.type === "keep") {
					// Step 4: Keep child node as-is
					processedChildren.push(result.node);
				} else {
					// Step 3: Promote Children - child is removed, add grandchildren
					processedChildren.push(...result.children);
				}
			}
		}

		// Step 2: Evaluate Condition - Check if current node should be included
		const shouldIncludeNode =
			(isRoot && includeRoot) || shouldInclude(node.data);

		if (!shouldIncludeNode) {
			// Node is removed - return its children for promotion
			return {
				type: "promote",
				children: processedChildren,
			};
		}

		// Node is kept - return with processed children
		return {
			type: "keep",
			node: {
				data: transform(node.data),
				children: processedChildren.length > 0 ? processedChildren : undefined,
			},
		};
	}

	// Step 5: Recursive Processing - Start pruning
	const result = pruneNode(tree, true);

	// Handle root result
	if (result.type === "keep") {
		return result.node;
	}

	// Root was removed - handle promoted children
	if (result.children.length === 0) {
		return null;
	}

	if (result.children.length === 1) {
		// Single child promoted - it becomes the new root
		return result.children[0];
	}

	// Multiple promoted children - no higher parent to promote to, return null
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
