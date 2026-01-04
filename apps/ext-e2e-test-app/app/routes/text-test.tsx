import type { Route } from "./+types/text-test";

export function meta(_args: Route.MetaArgs) {
	return [
		{
			title: "Text Test",
		},
	];
}

export default function TextTest() {
	return (
		<div
			style={{
				padding: "20px",
				fontFamily: "system-ui, sans-serif",
				maxWidth: "900px",
			}}
		>
			<h1 data-testid="page-title">Text Test Page</h1>

			<section
				style={{
					marginBottom: "30px",
				}}
			>
				<h2>Headings</h2>
				<h1 data-testid="heading-1">Heading Level 1</h1>
				<h2 data-testid="heading-2">Heading Level 2</h2>
				<h3 data-testid="heading-3">Heading Level 3</h3>
				<h4 data-testid="heading-4">Heading Level 4</h4>
				<h5 data-testid="heading-5">Heading Level 5</h5>
				<h6 data-testid="heading-6">Heading Level 6</h6>
			</section>

			<section
				style={{
					marginBottom: "30px",
				}}
			>
				<h2>Paragraphs</h2>
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
					<code data-testid="inline-code">inline code</code> and a{" "}
					<a href="#link" data-testid="inline-link">
						link inside text
					</a>
					.
				</p>
			</section>

			<section
				style={{
					marginBottom: "30px",
				}}
			>
				<h2>Lists</h2>
				<h3>Unordered List</h3>
				<ul data-testid="unordered-list">
					<li data-testid="ul-item-1">First unordered item</li>
					<li data-testid="ul-item-2">Second unordered item</li>
					<li data-testid="ul-item-3">Third unordered item</li>
				</ul>

				<h3>Ordered List</h3>
				<ol data-testid="ordered-list">
					<li data-testid="ol-item-1">First ordered item</li>
					<li data-testid="ol-item-2">Second ordered item</li>
					<li data-testid="ol-item-3">Third ordered item</li>
				</ol>
			</section>

			<section
				style={{
					marginBottom: "30px",
				}}
			>
				<h2>Selectable Text</h2>
				<div
					data-testid="selectable-text"
					style={{
						padding: "20px",
						backgroundColor: "#f8f9fa",
						borderRadius: "8px",
						border: "1px solid #dee2e6",
						userSelect: "text",
					}}
				>
					<p>
						This text is specifically designed for selection testing. Select any
						portion of this text to test the getSelection tool. You can select
						words, sentences, or entire paragraphs.
					</p>
					<p>
						Here is another paragraph with different content. The quick brown
						fox jumps over the lazy dog. This sentence contains all letters of
						the alphabet and is useful for testing.
					</p>
				</div>
			</section>

			<section
				style={{
					marginBottom: "30px",
				}}
			>
				<h2>Interactive Elements</h2>
				<nav data-testid="navigation" aria-label="Main navigation">
					<a
						href="#home"
						style={{
							marginRight: "15px",
						}}
					>
						Home
					</a>
					<a
						href="#about"
						style={{
							marginRight: "15px",
						}}
					>
						About
					</a>
					<a
						href="#contact"
						style={{
							marginRight: "15px",
						}}
					>
						Contact
					</a>
					<a href="#help">Help</a>
				</nav>
			</section>

			<section
				style={{
					marginBottom: "30px",
				}}
			>
				<h2>Buttons with Different Roles</h2>
				<div
					style={{
						display: "flex",
						gap: "10px",
						flexWrap: "wrap",
					}}
				>
					<button type="button" data-testid="button-action">
						Action Button
					</button>
					<button type="submit" data-testid="button-submit">
						Submit Button
					</button>
					<button type="reset" data-testid="button-reset">
						Reset Button
					</button>
					<button
						type="button"
						data-testid="link-button"
						style={{
							padding: "5px 10px",
							backgroundColor: "#007bff",
							color: "white",
							textDecoration: "none",
							borderRadius: "4px",
							border: "none",
							cursor: "pointer",
						}}
					>
						Link as Button
					</button>
				</div>
			</section>

			<section
				style={{
					marginBottom: "30px",
				}}
			>
				<h2>Table</h2>
				<table
					data-testid="data-table"
					style={{
						width: "100%",
						borderCollapse: "collapse",
						border: "1px solid #dee2e6",
					}}
				>
					<thead>
						<tr
							style={{
								backgroundColor: "#f8f9fa",
							}}
						>
							<th
								style={{
									padding: "10px",
									border: "1px solid #dee2e6",
								}}
							>
								Name
							</th>
							<th
								style={{
									padding: "10px",
									border: "1px solid #dee2e6",
								}}
							>
								Email
							</th>
							<th
								style={{
									padding: "10px",
									border: "1px solid #dee2e6",
								}}
							>
								Role
							</th>
						</tr>
					</thead>
					<tbody>
						<tr data-testid="table-row-1">
							<td
								style={{
									padding: "10px",
									border: "1px solid #dee2e6",
								}}
							>
								John Doe
							</td>
							<td
								style={{
									padding: "10px",
									border: "1px solid #dee2e6",
								}}
							>
								john@example.com
							</td>
							<td
								style={{
									padding: "10px",
									border: "1px solid #dee2e6",
								}}
							>
								Admin
							</td>
						</tr>
						<tr data-testid="table-row-2">
							<td
								style={{
									padding: "10px",
									border: "1px solid #dee2e6",
								}}
							>
								Jane Smith
							</td>
							<td
								style={{
									padding: "10px",
									border: "1px solid #dee2e6",
								}}
							>
								jane@example.com
							</td>
							<td
								style={{
									padding: "10px",
									border: "1px solid #dee2e6",
								}}
							>
								User
							</td>
						</tr>
						<tr data-testid="table-row-3">
							<td
								style={{
									padding: "10px",
									border: "1px solid #dee2e6",
								}}
							>
								Bob Wilson
							</td>
							<td
								style={{
									padding: "10px",
									border: "1px solid #dee2e6",
								}}
							>
								bob@example.com
							</td>
							<td
								style={{
									padding: "10px",
									border: "1px solid #dee2e6",
								}}
							>
								Editor
							</td>
						</tr>
					</tbody>
				</table>
			</section>

			<section>
				<h2>ARIA Labels</h2>
				<div
					style={{
						display: "flex",
						gap: "10px",
						flexWrap: "wrap",
					}}
				>
					<button
						type="button"
						aria-label="Close dialog"
						data-testid="aria-button-close"
					>
						✕
					</button>
					<button
						type="button"
						aria-label="Add new item"
						data-testid="aria-button-add"
					>
						+
					</button>
					<button
						type="button"
						aria-label="Delete item"
						data-testid="aria-button-delete"
					>
						🗑️
					</button>
					<button
						type="button"
						aria-label="Edit content"
						data-testid="aria-button-edit"
					>
						✏️
					</button>
				</div>
			</section>
		</div>
	);
}
