import { useEffect, useState } from "react";
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
				</div>

				<h1 data-testid="page-title" className="text-3xl font-bold mb-6">
					Scroll Test Screen
				</h1>

				<p className="mb-6">
					This page overflows both vertically and horizontally so scrollPage can
					be exercised in every direction.
				</p>

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
