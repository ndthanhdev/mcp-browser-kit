import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { TestScreenLayout } from "../layouts/test-screen-layout";

const CROSS_ORIGIN_IFRAME_SRC = "http://127.0.0.1:3001/iframe-test/inner";
const SAME_ORIGIN_IFRAME_SRC = "/iframe-test/inner";

export function meta() {
	return [
		{
			title: "Iframe Test",
		},
	];
}

export function IframeTestScreen() {
	const [searchParams] = useSearchParams();
	const isCrossOrigin = searchParams.get("crossOrigin") === "1";
	const iframeSrc = isCrossOrigin
		? CROSS_ORIGIN_IFRAME_SRC
		: SAME_ORIGIN_IFRAME_SRC;

	const [outerClickCount, setOuterClickCount] = useState(0);
	const [iframeClickCountMirror, setIframeClickCountMirror] = useState(0);

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.data?.type === "iframe-click") {
				setIframeClickCountMirror(event.data.count);
			}
		};
		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, []);

	return (
		<div className="p-5 font-sans">
			<TestScreenLayout>
				<h1 data-testid="page-title" className="text-3xl font-bold mb-6">
					Iframe Test Screen
				</h1>

				<div className="mb-5 p-2.5 bg-gray-100 rounded">
					<p data-testid="outer-click-count" className="m-0 mb-2">
						Outer Click Count: {outerClickCount}
					</p>
					<p data-testid="iframe-click-count-mirror" className="m-0">
						Iframe Click Count (mirrored): {iframeClickCountMirror}
					</p>
				</div>

				<button
					type="button"
					data-testid="outer-button"
					onClick={() => setOuterClickCount((prev) => prev + 1)}
					className="mb-6 px-5 py-2.5 bg-blue-600 text-white border-none rounded cursor-pointer hover:bg-blue-700"
				>
					Outer Button
				</button>

				<iframe
					data-testid="test-iframe"
					src={iframeSrc}
					title="Iframe Test Inner"
					className="w-full border border-gray-300 rounded"
					style={{
						height: "220px",
					}}
				/>
			</TestScreenLayout>
		</div>
	);
}
