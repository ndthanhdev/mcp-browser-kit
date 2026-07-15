import { useState } from "react";

export function meta() {
	return [
		{
			title: "Iframe Inner Test",
		},
	];
}

export function IframeTestInnerScreen() {
	const [clickCount, setClickCount] = useState(0);

	const handleClick = () => {
		const nextCount = clickCount + 1;
		setClickCount(nextCount);
		window.parent.postMessage(
			{
				type: "iframe-click",
				count: nextCount,
			},
			"*",
		);
	};

	return (
		<div className="p-5 font-sans">
			<h1 data-testid="page-title" className="text-xl font-bold mb-4">
				Iframe Inner Screen
			</h1>
			<p data-testid="iframe-click-count" className="mb-4">
				Iframe Click Count: {clickCount}
			</p>
			<button
				type="button"
				data-testid="iframe-inner-button"
				onClick={handleClick}
				className="px-4 py-2 bg-blue-600 text-white border-none rounded cursor-pointer hover:bg-blue-700"
			>
				Iframe Inner Button
			</button>
		</div>
	);
}
