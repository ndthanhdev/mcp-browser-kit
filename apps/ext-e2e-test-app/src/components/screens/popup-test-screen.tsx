import { useState } from "react";
import { TestScreenLayout } from "../layouts/test-screen-layout";

export function meta() {
	return [
		{
			title: "Popup Test",
		},
	];
}

export function PopupTestScreen() {
	const [openerClickCount, setOpenerClickCount] = useState(0);

	const handleOpenPopup = () => {
		window.open("/iframe-test", "_blank", "popup,width=400,height=300");
	};

	return (
		<div className="p-5 font-sans">
			<TestScreenLayout>
				<h1 data-testid="page-title" className="text-3xl font-bold mb-6">
					Popup Test Screen
				</h1>

				<div className="mb-5 p-2.5 bg-gray-100 rounded">
					<p data-testid="opener-click-count" className="m-0">
						Opener Click Count: {openerClickCount}
					</p>
				</div>

				<div className="flex gap-2.5">
					<button
						type="button"
						data-testid="opener-button"
						onClick={() => setOpenerClickCount((prev) => prev + 1)}
						className="px-5 py-2.5 bg-blue-600 text-white border-none rounded cursor-pointer hover:bg-blue-700"
					>
						Opener Button
					</button>
					<button
						type="button"
						data-testid="open-popup-button"
						onClick={handleOpenPopup}
						className="px-5 py-2.5 bg-purple-600 text-white border-none rounded cursor-pointer hover:bg-purple-700"
					>
						Open Popup
					</button>
				</div>
			</TestScreenLayout>
		</div>
	);
}
