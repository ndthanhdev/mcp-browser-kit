import { useEffect, useState } from "react";
import { TestScreenLayout } from "../layouts/test-screen-layout";

export function meta() {
	return [
		{
			title: "Auto Wait Test",
		},
	];
}

const ENABLE_DELAY_MS = 800;
const RESULTS_DELAY_MS = 100;
const MANY_COUNT = 300;

export function AutoWaitTestScreen() {
	const [armed, setArmed] = useState(false);
	const [delayedEnabled, setDelayedEnabled] = useState(false);
	const [delayedCount, setDelayedCount] = useState(0);
	const [loading, setLoading] = useState(false);
	const [results, setResults] = useState<string[]>([]);
	const [picked, setPicked] = useState<string | null>(null);
	const [manyVisible, setManyVisible] = useState(false);
	const [note, setNote] = useState("");

	useEffect(() => {
		if (!armed) return;
		const timer = setTimeout(() => setDelayedEnabled(true), ENABLE_DELAY_MS);
		return () => clearTimeout(timer);
	}, [
		armed,
	]);

	const loadResults = () => {
		setLoading(true);
		setTimeout(() => {
			setLoading(false);
			setResults([
				"Result 1",
				"Result 2",
				"Result 3",
			]);
		}, RESULTS_DELAY_MS);
	};

	return (
		<div className="p-5 font-sans">
			<TestScreenLayout>
				<h1 data-testid="page-title" className="text-3xl font-bold mb-6">
					Auto Wait Test Screen
				</h1>

				<section className="mb-8">
					<h2 className="text-2xl font-bold mb-4">Delayed enable</h2>
					<div className="flex gap-2.5">
						<button
							type="button"
							data-testid="arm-button"
							onClick={() => setArmed(true)}
							className="px-4 py-2 bg-blue-600 text-white rounded"
						>
							Arm Delayed Button
						</button>
						<button
							type="button"
							data-testid="delayed-button"
							disabled={!delayedEnabled}
							onClick={() => setDelayedCount((count) => count + 1)}
							className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
						>
							Delayed Action
						</button>
					</div>
					<p data-testid="delayed-count">Delayed Count: {delayedCount}</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-bold mb-4">Covered button</h2>
					<div className="relative inline-block">
						<button
							type="button"
							data-testid="covered-button"
							className="px-4 py-2 bg-gray-600 text-white rounded"
						>
							Covered Button
						</button>
						<div
							data-testid="cover"
							className="absolute inset-0 bg-black/40"
							aria-hidden="true"
						/>
					</div>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-bold mb-4">Async results</h2>
					<button
						type="button"
						data-testid="load-results-button"
						onClick={loadResults}
						className="px-4 py-2 bg-blue-600 text-white rounded"
					>
						Load Results
					</button>
					{loading && <p data-testid="loading">Loading…</p>}
					<div className="flex gap-2.5 mt-2">
						{results.map((result) => (
							<button
								type="button"
								key={result}
								onClick={() => setPicked(result)}
								className="px-3 py-1 bg-gray-200 rounded"
							>
								{result}
							</button>
						))}
					</div>
					<p data-testid="picked-result">Picked: {picked ?? "None"}</p>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-bold mb-4">Text field</h2>
					<input
						type="text"
						data-testid="note-input"
						aria-label="Note"
						placeholder="Note"
						value={note}
						onChange={(event) => setNote(event.target.value)}
						className="border px-2 py-1"
					/>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-bold mb-4">Navigation</h2>
					<a
						href="/click-test"
						data-testid="navigate-link"
						className="text-blue-600 underline"
					>
						Go To Click Test
					</a>
				</section>

				<section>
					<h2 className="text-2xl font-bold mb-4">Large change</h2>
					<button
						type="button"
						data-testid="render-many-button"
						onClick={() => setManyVisible(true)}
						className="px-4 py-2 bg-blue-600 text-white rounded"
					>
						Render Many
					</button>
					{manyVisible && (
						<div className="flex flex-wrap gap-1 mt-2">
							{Array.from(
								{
									length: MANY_COUNT,
								},
								(_, index) => (
									<button
										type="button"
										// biome-ignore lint/suspicious/noArrayIndexKey: static list
										key={index}
										className="px-1 text-xs bg-gray-100"
									>
										Item {index + 1}
									</button>
								),
							)}
						</div>
					)}
				</section>
			</TestScreenLayout>
		</div>
	);
}
