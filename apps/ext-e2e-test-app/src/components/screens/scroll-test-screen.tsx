import { useEffect, useRef, useState } from "react";
import { TestScreenLayout } from "../layouts/test-screen-layout";

export function meta() {
	return [
		{
			title: "Scroll Test",
		},
	];
}

export function ScrollTestScreen() {
	const [scrollX, setScrollX] = useState(0);
	const [scrollY, setScrollY] = useState(0);
	const [containerScrollTop, setContainerScrollTop] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleScroll = () => {
			setScrollX(Math.round(window.scrollX));
			setScrollY(Math.round(window.scrollY));
		};
		handleScroll();
		window.addEventListener("scroll", handleScroll, {
			passive: true,
		});
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<div className="p-5 font-sans">
			<TestScreenLayout>
				{/* Fixed readout so the current scroll position is always visible */}
				<div className="fixed top-2.5 right-2.5 z-50 p-2.5 bg-gray-900 text-white rounded text-sm">
					<p data-testid="scroll-y" className="m-0">
						scrollY: {scrollY}
					</p>
					<p data-testid="scroll-x" className="m-0">
						scrollX: {scrollX}
					</p>
					<p data-testid="container-scroll-top" className="m-0">
						containerScrollTop: {containerScrollTop}
					</p>
				</div>

				<h1 data-testid="page-title" className="text-3xl font-bold mb-6">
					Scroll Test Screen
				</h1>

				<p className="mb-6">
					This page overflows both vertically and horizontally so scrollPage can
					be exercised in every direction.
				</p>

				{/* Scrollable container with its own scrollbar (for scrollElement) */}
				<div
					ref={containerRef}
					aria-label="Scrollable list"
					data-testid="scroll-container"
					onScroll={(e) =>
						setContainerScrollTop(Math.round(e.currentTarget.scrollTop))
					}
					className="mb-8 overflow-auto bg-green-100 rounded border border-green-400"
					style={{
						height: "200px",
					}}
				>
					<button
						type="button"
						data-testid="container-top-button"
						className="m-2"
					>
						Container top button
					</button>
					<div
						style={{
							minHeight: "1500px",
						}}
					>
						<p className="p-2">Top of scrollable container</p>
						<p
							data-testid="container-bottom-marker"
							className="p-2"
							style={{
								marginTop: "1400px",
							}}
						>
							Bottom of scrollable container
						</p>
					</div>
				</div>

				{/* Wide block to create horizontal overflow */}
				<div
					data-testid="wide-block"
					className="mb-8 bg-gradient-to-r from-blue-200 to-purple-200 rounded"
					style={{
						width: "3000px",
						height: "120px",
					}}
				>
					<span className="inline-block p-4 font-bold">Far left edge</span>
					<span
						data-testid="wide-block-end"
						className="float-right p-4 font-bold"
					>
						Far right edge
					</span>
				</div>

				{/* Tall spacer to create vertical overflow */}
				<div
					data-testid="tall-block"
					className="bg-gray-100 rounded"
					style={{
						minHeight: "4000px",
					}}
				>
					<span className="inline-block p-4 font-bold">Top of tall block</span>
					<div
						className="absolute"
						style={{
							top: "3900px",
						}}
					>
						<span data-testid="bottom-marker" className="p-4 font-bold">
							Bottom of tall block
						</span>
					</div>
				</div>
			</TestScreenLayout>
		</div>
	);
}
