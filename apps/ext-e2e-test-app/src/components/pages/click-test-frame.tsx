import { useState } from "react";
import { Link } from "react-router";

export function meta() {
	return [
		{
			title: "Click Test",
		},
	];
}

export default function ClickTestFrame() {
	const [clickCount, setClickCount] = useState(0);
	const [lastClicked, setLastClicked] = useState<string | null>(null);

	const handleButtonClick = (name: string) => {
		setClickCount((prev) => prev + 1);
		setLastClicked(name);
	};

	return (
		<div className="p-5 font-sans">
			<Link
				to="/"
				data-testid="back-to-home"
				className="inline-block mb-4 text-blue-600 hover:underline"
			>
				← Back to Home
			</Link>
			<h1 data-testid="page-title" className="text-3xl font-bold mb-6">
				Click Test Frame
			</h1>

			<div className="mb-5 p-2.5 bg-gray-100 rounded">
				<p data-testid="click-count" className="m-0 mb-2">
					Click Count: {clickCount}
				</p>
				<p data-testid="last-clicked" className="m-0">
					Last Clicked: {lastClicked ?? "None"}
				</p>
			</div>

			<section className="mb-8">
				<h2 className="text-2xl font-bold mb-4">Basic Buttons</h2>
				<div className="flex gap-2.5 flex-wrap">
					<button
						type="button"
						data-testid="primary-button"
						onClick={() => handleButtonClick("primary-button")}
						className="px-5 py-2.5 bg-blue-600 text-white border-none rounded cursor-pointer hover:bg-blue-700"
					>
						Primary Button
					</button>
					<button
						type="button"
						data-testid="secondary-button"
						onClick={() => handleButtonClick("secondary-button")}
						className="px-5 py-2.5 bg-gray-600 text-white border-none rounded cursor-pointer hover:bg-gray-700"
					>
						Secondary Button
					</button>
					<button
						type="button"
						data-testid="danger-button"
						onClick={() => handleButtonClick("danger-button")}
						className="px-5 py-2.5 bg-red-600 text-white border-none rounded cursor-pointer hover:bg-red-700"
					>
						Danger Button
					</button>
				</div>
			</section>

			<section className="mb-8">
				<h2 className="text-2xl font-bold mb-4">Links</h2>
				<div className="flex gap-5">
					<button
						type="button"
						data-testid="internal-link"
						onClick={() => handleButtonClick("internal-link")}
						className="bg-transparent border-none text-blue-600 underline cursor-pointer p-0 font-inherit hover:text-blue-800"
					>
						Internal Link
					</button>
					<button
						type="button"
						data-testid="styled-link"
						onClick={() => handleButtonClick("styled-link")}
						className="bg-transparent border-none text-green-600 underline cursor-pointer p-0 font-inherit hover:text-green-800"
					>
						Styled Link
					</button>
				</div>
			</section>

			<section className="mb-8">
				<h2 className="text-2xl font-bold mb-4">Positioned Elements</h2>
				<div className="relative w-96 h-48 bg-gray-200 rounded-lg">
					<button
						type="button"
						data-testid="top-left-button"
						onClick={() => handleButtonClick("top-left-button")}
						className="absolute top-2.5 left-2.5 px-4 py-2 bg-cyan-600 text-white border-none rounded cursor-pointer hover:bg-cyan-700"
					>
						Top Left
					</button>
					<button
						type="button"
						data-testid="top-right-button"
						onClick={() => handleButtonClick("top-right-button")}
						className="absolute top-2.5 right-2.5 px-4 py-2 bg-yellow-400 text-black border-none rounded cursor-pointer hover:bg-yellow-500"
					>
						Top Right
					</button>
					<button
						type="button"
						data-testid="center-button"
						onClick={() => handleButtonClick("center-button")}
						className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-purple-600 text-white border-none rounded cursor-pointer hover:bg-purple-700"
					>
						Center
					</button>
					<button
						type="button"
						data-testid="bottom-left-button"
						onClick={() => handleButtonClick("bottom-left-button")}
						className="absolute bottom-2.5 left-2.5 px-4 py-2 bg-teal-500 text-white border-none rounded cursor-pointer hover:bg-teal-600"
					>
						Bottom Left
					</button>
					<button
						type="button"
						data-testid="bottom-right-button"
						onClick={() => handleButtonClick("bottom-right-button")}
						className="absolute bottom-2.5 right-2.5 px-4 py-2 bg-orange-600 text-white border-none rounded cursor-pointer hover:bg-orange-700"
					>
						Bottom Right
					</button>
				</div>
			</section>

			<section>
				<h2 className="text-2xl font-bold mb-4">Nested Elements</h2>
				<button
					type="button"
					data-testid="outer-container"
					onClick={() => handleButtonClick("outer-container")}
					className="p-5 bg-gray-300 rounded-lg cursor-pointer border-none w-full text-left hover:bg-gray-400"
				>
					<p className="m-0">Outer Container (clickable)</p>
				</button>
				<div className="mt-2.5 ml-5">
					<button
						type="button"
						data-testid="inner-container"
						onClick={() => handleButtonClick("inner-container")}
						className="p-4 bg-gray-400 rounded cursor-pointer border-none w-full text-left hover:bg-gray-500"
					>
						<p className="m-0">Inner Container (clickable)</p>
					</button>
					<div className="mt-2.5 ml-4">
						<button
							type="button"
							data-testid="nested-button"
							onClick={() => handleButtonClick("nested-button")}
							className="px-4 py-2 bg-gray-800 text-white border-none rounded cursor-pointer hover:bg-gray-900"
						>
							Nested Button
						</button>
					</div>
				</div>
			</section>
		</div>
	);
}
