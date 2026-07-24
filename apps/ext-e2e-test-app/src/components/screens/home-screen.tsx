import { Link } from "react-router";

export function meta() {
	return [
		{
			title: "E2E Test App",
		},
	];
}

const testScreens = [
	{
		path: "/click-test",
		title: "Click Test",
		description: "Test click tools: clickOnCoordinates, clickOnElement",
	},
	{
		path: "/form-test",
		title: "Form Test",
		description:
			"Test form tools: fillTextToCoordinates, fillTextToElement, hitEnterOnCoordinates, hitEnterOnElement",
	},
	{
		path: "/text-test",
		title: "Text Test",
		description:
			"Test text tools: getReadableText, getReadableElements, getSelection",
	},
	{
		path: "/javascript-test",
		title: "JavaScript Test",
		description: "Test JavaScript execution: invokeJsFn",
	},
	{
		path: "/snapshot-test",
		title: "Snapshot Test",
		description:
			"Test text and element snapshot tools and snapshot resource URIs",
	},
	{
		path: "/fallback-test",
		title: "Fallback Test",
		description:
			"Test fallback click strategies when element.click() has no effect",
	},
	{
		path: "/scroll-test",
		title: "Scroll Test",
		description: "Test scroll tools: scrollPage, scrollElement",
	},
	{
		path: "/iframe-test",
		title: "Iframe Test",
		description: "Test tool behavior with content inside an <iframe>",
	},
	{
		path: "/popup-test",
		title: "Popup Test",
		description: "Test tool behavior with a window.open() popup window",
	},
];

export function HomeScreen() {
	return (
		<div className="p-5 font-sans max-w-3xl">
			<h1 data-testid="page-title" className="text-3xl font-bold mb-4">
				MCP Browser Kit E2E Test App
			</h1>
			<p className="mb-6">Select a test screen to navigate to:</p>

			<nav>
				<ul className="list-none p-0 flex flex-col gap-4">
					{testScreens.map((screen) => (
						<li key={screen.path}>
							<Link
								to={screen.path}
								data-testid={`nav-${screen.path.slice(1)}`}
								className="block p-4 bg-gray-100 rounded-lg border border-gray-300 no-underline text-gray-900 transition-colors hover:bg-gray-200"
							>
								<strong className="text-blue-600">{screen.title}</strong>
								<p className="mt-1.5 text-sm text-gray-600 m-0">
									{screen.description}
								</p>
							</Link>
						</li>
					))}
				</ul>
			</nav>
		</div>
	);
}
