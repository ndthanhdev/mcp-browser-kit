import { TestScreenLayout } from "../layouts/test-screen-layout";

export function meta() {
	return [
		{
			title: "Text Test",
		},
	];
}

export function TextTestScreen() {
	return (
		<div className="p-5 font-sans max-w-4xl">
			<TestScreenLayout>
				<h1 data-testid="page-title" className="text-3xl font-bold mb-6">
					Text Test Screen
				</h1>

				<section className="mb-8">
					<h2 className="text-2xl font-bold mb-4">Headings</h2>
					<h1 data-testid="heading-1" className="text-4xl font-bold">
						Heading Level 1
					</h1>
					<h2 data-testid="heading-2" className="text-3xl font-bold">
						Heading Level 2
					</h2>
					<h3 data-testid="heading-3" className="text-2xl font-bold">
						Heading Level 3
					</h3>
					<h4 data-testid="heading-4" className="text-xl font-bold">
						Heading Level 4
					</h4>
					<h5 data-testid="heading-5" className="text-lg font-bold">
						Heading Level 5
					</h5>
					<h6 data-testid="heading-6" className="text-base font-bold">
						Heading Level 6
					</h6>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-bold mb-4">Paragraphs</h2>
					<p data-testid="paragraph-1">
						This is the first paragraph with some sample text. It contains
						multiple sentences to test text extraction capabilities. The text
						should be readable and accessible.
					</p>
					<p data-testid="paragraph-2">
						Second paragraph here. This one has{" "}
						<strong data-testid="bold-text">bold text</strong> and{" "}
						<em data-testid="italic-text">italic text</em> and{" "}
						<u data-testid="underline-text">underlined text</u>.
					</p>
					<p data-testid="paragraph-3">
						Third paragraph with{" "}
						<code
							data-testid="inline-code"
							className="bg-gray-100 px-1 rounded"
						>
							inline code
						</code>{" "}
						and a{" "}
						<a
							href="#link"
							data-testid="inline-link"
							className="text-blue-600 hover:underline"
						>
							link inside text
						</a>
						.
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-bold mb-4">Lists</h2>
					<h3 className="text-xl font-bold mb-2">Unordered List</h3>
					<ul data-testid="unordered-list" className="list-disc pl-5">
						<li data-testid="ul-item-1">First unordered item</li>
						<li data-testid="ul-item-2">Second unordered item</li>
						<li data-testid="ul-item-3">Third unordered item</li>
					</ul>

					<h3 className="text-xl font-bold mb-2 mt-4">Ordered List</h3>
					<ol data-testid="ordered-list" className="list-decimal pl-5">
						<li data-testid="ol-item-1">First ordered item</li>
						<li data-testid="ol-item-2">Second ordered item</li>
						<li data-testid="ol-item-3">Third ordered item</li>
					</ol>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-bold mb-4">Selectable Text</h2>
					<div
						data-testid="selectable-text"
						className="p-5 bg-gray-100 rounded-lg border border-gray-300 select-text"
					>
						<p>
							This text is specifically designed for selection testing. Select
							any portion of this text to test the getSelection tool. You can
							select words, sentences, or entire paragraphs.
						</p>
						<p>
							Here is another paragraph with different content. The quick brown
							fox jumps over the lazy dog. This sentence contains all letters of
							the alphabet and is useful for testing.
						</p>
					</div>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-bold mb-4">Interactive Elements</h2>
					<nav data-testid="navigation" aria-label="Main navigation">
						<a href="#home" className="mr-4 text-blue-600 hover:underline">
							Home
						</a>
						<a href="#about" className="mr-4 text-blue-600 hover:underline">
							About
						</a>
						<a href="#contact" className="mr-4 text-blue-600 hover:underline">
							Contact
						</a>
						<a href="#help" className="text-blue-600 hover:underline">
							Help
						</a>
					</nav>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-bold mb-4">
						Buttons with Different Roles
					</h2>
					<div className="flex gap-2.5 flex-wrap">
						<button
							type="button"
							data-testid="button-action"
							className="px-3 py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-100 cursor-pointer"
						>
							Action Button
						</button>
						<button
							type="submit"
							data-testid="button-submit"
							className="px-3 py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-100 cursor-pointer"
						>
							Submit Button
						</button>
						<button
							type="reset"
							data-testid="button-reset"
							className="px-3 py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-100 cursor-pointer"
						>
							Reset Button
						</button>
						<button
							type="button"
							data-testid="link-button"
							className="px-2.5 py-1.5 bg-blue-600 text-white no-underline rounded hover:bg-blue-700"
						>
							Link as Button
						</button>
					</div>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-bold mb-4">Table</h2>
					<table
						data-testid="data-table"
						className="w-full border-collapse border border-gray-300"
					>
						<thead>
							<tr className="bg-gray-100">
								<th className="p-2.5 border border-gray-300">Name</th>
								<th className="p-2.5 border border-gray-300">Email</th>
								<th className="p-2.5 border border-gray-300">Role</th>
							</tr>
						</thead>
						<tbody>
							<tr data-testid="table-row-1">
								<td className="p-2.5 border border-gray-300">John Doe</td>
								<td className="p-2.5 border border-gray-300">
									john@example.com
								</td>
								<td className="p-2.5 border border-gray-300">Admin</td>
							</tr>
							<tr data-testid="table-row-2">
								<td className="p-2.5 border border-gray-300">Jane Smith</td>
								<td className="p-2.5 border border-gray-300">
									jane@example.com
								</td>
								<td className="p-2.5 border border-gray-300">User</td>
							</tr>
							<tr data-testid="table-row-3">
								<td className="p-2.5 border border-gray-300">Bob Wilson</td>
								<td className="p-2.5 border border-gray-300">
									bob@example.com
								</td>
								<td className="p-2.5 border border-gray-300">Editor</td>
							</tr>
						</tbody>
					</table>
				</section>

				<section>
					<h2 className="text-2xl font-bold mb-4">ARIA Labels</h2>
					<div className="flex gap-2.5 flex-wrap">
						<button
							type="button"
							aria-label="Close dialog"
							data-testid="aria-button-close"
							className="px-3 py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-100 cursor-pointer"
						>
							✕
						</button>
						<button
							type="button"
							aria-label="Add new item"
							data-testid="aria-button-add"
							className="px-3 py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-100 cursor-pointer"
						>
							+
						</button>
						<button
							type="button"
							aria-label="Delete item"
							data-testid="aria-button-delete"
							className="px-3 py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-100 cursor-pointer"
						>
							🗑️
						</button>
						<button
							type="button"
							aria-label="Edit content"
							data-testid="aria-button-edit"
							className="px-3 py-1.5 border border-gray-300 rounded bg-white hover:bg-gray-100 cursor-pointer"
						>
							✏️
						</button>
					</div>
				</section>
			</TestScreenLayout>
		</div>
	);
}
