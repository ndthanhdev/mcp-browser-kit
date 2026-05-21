import { useEffect, useRef, useState } from "react";
import { TestScreenLayout } from "../layouts/test-screen-layout";

export function meta() {
	return [
		{
			title: "Fallback Test",
		},
	];
}

export function FallbackTestScreen() {
	const [mousedownCount, setMousedownCount] = useState(0);
	const [standardClickCount, setStandardClickCount] = useState(0);

	const resistantRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		const el = resistantRef.current;
		if (!el) return;
		const handler = () => setMousedownCount((c) => c + 1);
		el.addEventListener("mousedown", handler);
		return () => el.removeEventListener("mousedown", handler);
	}, []);

	return (
		<div className="p-5 font-sans">
			<TestScreenLayout>
				<h1 data-testid="page-title" className="text-3xl font-bold mb-6">
					Fallback Test Screen
				</h1>

				<section className="mb-8">
					<h2 className="text-2xl font-bold mb-4">Resistant Button</h2>
					<p className="mb-3 text-gray-600">
						This button only listens to <code>mousedown</code> via a raw DOM
						listener. It does not have a React <code>onClick</code> handler, so{" "}
						<code>element.click()</code> will not trigger it. The fallback
						mouse-event-chain strategy is required.
					</p>
					<button
						ref={resistantRef}
						type="button"
						data-testid="resistant-button"
						className="px-5 py-2.5 bg-red-600 text-white border-none rounded cursor-pointer hover:bg-red-700"
					>
						Resistant Button (mousedown only)
					</button>
					<p data-testid="mousedown-count" className="mt-3">
						Mousedown Count: {mousedownCount}
					</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-bold mb-4">
						Standard Button (baseline)
					</h2>
					<p className="mb-3 text-gray-600">
						Normal React <code>onClick</code> button. Primary strategy succeeds
						immediately.
					</p>
					<button
						type="button"
						data-testid="standard-button"
						onClick={() => setStandardClickCount((c) => c + 1)}
						className="px-5 py-2.5 bg-blue-600 text-white border-none rounded cursor-pointer hover:bg-blue-700"
					>
						Standard Button
					</button>
					<p data-testid="standard-click-count" className="mt-3">
						Standard Click Count: {standardClickCount}
					</p>
				</section>
			</TestScreenLayout>
		</div>
	);
}
