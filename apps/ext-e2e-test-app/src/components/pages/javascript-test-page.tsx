import { useEffect, useState } from "react";
import { Link } from "react-router";

export function meta() {
	return [
		{
			title: "JavaScript Test",
		},
	];
}

declare global {
	interface Window {
		testData: {
			counter: number;
			messages: string[];
			lastAction: string | null;
		};
		incrementCounter: () => number;
		addMessage: (msg: string) => string[];
		getTestData: () => typeof window.testData;
		computeSum: (a: number, b: number) => number;
		asyncOperation: (delay: number) => Promise<string>;
	}
}

export default function JavaScriptTestPage() {
	const [renderCount, setRenderCount] = useState(0);

	useEffect(() => {
		window.testData = {
			counter: 0,
			messages: [],
			lastAction: null,
		};

		window.incrementCounter = () => {
			window.testData.counter += 1;
			window.testData.lastAction = "increment";
			return window.testData.counter;
		};

		window.addMessage = (msg: string) => {
			window.testData.messages.push(msg);
			window.testData.lastAction = "addMessage";
			return [
				...window.testData.messages,
			];
		};

		window.getTestData = () => {
			return {
				...window.testData,
			};
		};

		window.computeSum = (a: number, b: number) => {
			window.testData.lastAction = "computeSum";
			return a + b;
		};

		window.asyncOperation = async (delay: number) => {
			return new Promise((resolve) => {
				setTimeout(() => {
					window.testData.lastAction = "asyncOperation";
					resolve(`Completed after ${delay}ms`);
				}, delay);
			});
		};

		setRenderCount((prev) => prev + 1);
	}, []);

	return (
		<div className="p-5 font-sans max-w-3xl">
			<Link
				to="/"
				data-testid="back-to-home"
				className="inline-block mb-4 text-blue-600 hover:underline"
			>
				← Back to Home
			</Link>
			<h1 data-testid="page-title" className="text-3xl font-bold mb-6">
				JavaScript Test Page
			</h1>

			<section className="mb-8">
				<h2 className="text-2xl font-bold mb-4">Page Info</h2>
				<div
					data-testid="page-info"
					className="p-4 bg-gray-100 rounded-lg border border-gray-300"
				>
					<p data-testid="render-count" className="mb-2">
						Render Count: {renderCount}
					</p>
					<p data-testid="page-url" className="mb-2">
						URL: {typeof window !== "undefined" ? window.location.href : ""}
					</p>
					<p data-testid="page-loaded" className="m-0">
						Page Loaded: Yes
					</p>
				</div>
			</section>

			<section className="mb-8">
				<h2 className="text-2xl font-bold mb-4">Available Global Functions</h2>
				<div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
					<p className="mb-2">
						These functions are available on the window object for testing:
					</p>
					<ul className="list-disc pl-5 space-y-1">
						<li>
							<code className="bg-gray-100 px-1 rounded">
								window.incrementCounter()
							</code>{" "}
							- Increments counter and returns new value
						</li>
						<li>
							<code className="bg-gray-100 px-1 rounded">
								window.addMessage(msg)
							</code>{" "}
							- Adds a message and returns all messages
						</li>
						<li>
							<code className="bg-gray-100 px-1 rounded">
								window.getTestData()
							</code>{" "}
							- Returns current test data object
						</li>
						<li>
							<code className="bg-gray-100 px-1 rounded">
								window.computeSum(a, b)
							</code>{" "}
							- Computes sum of two numbers
						</li>
						<li>
							<code className="bg-gray-100 px-1 rounded">
								window.asyncOperation(delay)
							</code>{" "}
							- Async operation that resolves after delay
						</li>
					</ul>
				</div>
			</section>

			<section className="mb-8">
				<h2 className="text-2xl font-bold mb-4">DOM Elements for Testing</h2>
				<div
					id="test-container"
					data-testid="test-container"
					data-custom-attr="custom-value"
					className="p-4 bg-green-100 rounded-lg border border-green-300"
				>
					<p id="test-paragraph" data-testid="test-paragraph" className="mb-2">
						This paragraph can be accessed via document.getElementById
					</p>
					<div
						id="dynamic-content"
						data-testid="dynamic-content"
						className="mt-2.5 p-2.5 bg-white rounded min-h-[50px]"
					>
						Dynamic content will appear here
					</div>
				</div>
			</section>

			<section className="mb-8">
				<h2 className="text-2xl font-bold mb-4">Style Modification Test</h2>
				<div
					id="style-target"
					data-testid="style-target"
					className="p-5 bg-yellow-400 text-black rounded-lg transition-all duration-300"
				>
					<p className="m-0">
						This element can have its styles modified via JavaScript for testing
					</p>
				</div>
			</section>

			<section className="mb-8">
				<h2 className="text-2xl font-bold mb-4">Data Attributes</h2>
				<div
					id="data-element"
					data-testid="data-element"
					data-value="initial"
					data-count="0"
					data-active="false"
					className="p-4 bg-gray-200 rounded-lg border border-gray-400"
				>
					<p className="mb-2">
						Element with data attributes that can be read/modified:
					</p>
					<ul className="list-disc pl-5 m-0">
						<li>data-value: "initial"</li>
						<li>data-count: "0"</li>
						<li>data-active: "false"</li>
					</ul>
				</div>
			</section>

			<section>
				<h2 className="text-2xl font-bold mb-4">Return Value Tests</h2>
				<div className="p-4 bg-red-100 rounded-lg border border-red-300">
					<p className="mb-2">Test different return types from invokeJsFn:</p>
					<ul className="list-disc pl-5 space-y-1 m-0">
						<li>
							<code className="bg-gray-100 px-1 rounded">
								return document.title;
							</code>{" "}
							- Returns string
						</li>
						<li>
							<code className="bg-gray-100 px-1 rounded">
								return window.testData;
							</code>{" "}
							- Returns object
						</li>
						<li>
							<code className="bg-gray-100 px-1 rounded">
								return [1, 2, 3];
							</code>{" "}
							- Returns array
						</li>
						<li>
							<code className="bg-gray-100 px-1 rounded">return 42;</code> -
							Returns number
						</li>
						<li>
							<code className="bg-gray-100 px-1 rounded">return true;</code> -
							Returns boolean
						</li>
						<li>
							<code className="bg-gray-100 px-1 rounded">return null;</code> -
							Returns null
						</li>
					</ul>
				</div>
			</section>
		</div>
	);
}
