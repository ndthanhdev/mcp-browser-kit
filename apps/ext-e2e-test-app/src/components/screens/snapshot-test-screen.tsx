import { TestScreenLayout } from "../layouts/test-screen-layout";

export function meta() {
	return [
		{
			title: "Snapshot Test",
		},
	];
}

export function SnapshotTestScreen() {
	// Generate 25 paragraphs of ~520 characters each = ~13,000 characters total.
	const paragraphs = Array.from({
		length: 25,
	}).map((_, i) => ({
		id: `large-para-${i}`,
		text: `This is paragraph number ${i + 1}. It is part of a very large document designed to test the snapshot capabilities of the MCP Browser Kit. We need a lot of characters to exceed the 5,000 character limit of a single page, so we are repeating this text many times. This ensures that the document is split across multiple pages, allowing us to test that fetching subsequent pages retrieves the correct content, that the cache is properly invalidated, and that all metadata fields like totalPages, pageNumber, hasNextPage, and nextPageNumber are correct.`,
	}));

	// Generate 220 buttons to test element snapshot (>2 pages of 100 elements each).
	const buttons = Array.from({
		length: 220,
	}).map((_, i) => {
		return {
			id: `btn-${i}`,
			label: `Button Number ${i + 1}`,
		};
	});

	return (
		<div className="p-5 font-sans max-w-4xl">
			<TestScreenLayout>
				<h1 data-testid="page-title" className="text-3xl font-bold mb-6">
					Snapshot Test Screen
				</h1>

				<section className="mb-8 bg-gray-50 p-4 rounded border">
					<h2 className="text-2xl font-bold mb-4">Large Text Section</h2>
					<div data-testid="large-text-container">
						{paragraphs.map((p) => (
							<p
								key={p.id}
								data-testid={p.id}
								className="mb-4 text-gray-700 leading-relaxed"
							>
								{p.text}
							</p>
						))}
					</div>
				</section>

				<section className="mb-8 bg-gray-50 p-4 rounded border">
					<h2 className="text-2xl font-bold mb-4">
						Large Interactive Elements Section
					</h2>
					<div
						data-testid="large-elements-container"
						className="flex flex-wrap gap-2"
					>
						{buttons.map((btn) => (
							<button
								key={btn.id}
								type="button"
								data-testid={btn.id}
								className="px-3 py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-100 cursor-pointer"
							>
								{btn.label}
							</button>
						))}
					</div>
				</section>
			</TestScreenLayout>
		</div>
	);
}
