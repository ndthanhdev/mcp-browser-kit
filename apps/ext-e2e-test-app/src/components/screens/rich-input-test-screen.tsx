import "quill/dist/quill.snow.css";
import { useEffect, useRef, useState } from "react";
import { TestScreenLayout } from "../layouts/test-screen-layout";

export function meta() {
	return [
		{
			title: "Rich Input Test",
		},
	];
}

interface NativeInputs {
	date: string;
	time: string;
	quantity: string;
	color: string;
	volume: string;
	nickname: string;
}

const formatPhone = (raw: string): string => {
	const digits = raw.replace(/\D/g, "").slice(0, 10);
	if (digits.length <= 3) return digits;
	if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
	return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

function QuillEditor({
	onTextChange,
}: {
	onTextChange: (text: string) => void;
}) {
	const wrapperRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const wrapper = wrapperRef.current;
		if (!wrapper) return;
		let disposed = false;
		// Quill touches `document` on import, so load it on the client only.
		import("quill").then(({ default: Quill }) => {
			if (disposed) return;
			const container = document.createElement("div");
			wrapper.append(container);
			const quill = new Quill(container, {
				theme: "snow",
				placeholder: "Compose a message...",
			});
			quill.on("text-change", () => {
				onTextChange(quill.getText().trimEnd());
			});
		});
		return () => {
			disposed = true;
			wrapper.replaceChildren();
		};
	}, [
		onTextChange,
	]);

	return <div ref={wrapperRef} data-testid="quill-editor" />;
}

export function RichInputTestScreen() {
	const [quillText, setQuillText] = useState("");
	const [phone, setPhone] = useState("");
	const [inputs, setInputs] = useState<NativeInputs>({
		date: "",
		time: "",
		quantity: "",
		color: "#000000",
		volume: "50",
		nickname: "",
	});

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setInputs((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	return (
		<div className="p-5 font-sans max-w-3xl">
			<TestScreenLayout>
				<h1 data-testid="page-title" className="text-3xl font-bold mb-6">
					Rich Input Test Screen
				</h1>

				<section className="mb-8">
					<h2 className="text-2xl font-bold mb-4">Quill Editor</h2>
					<QuillEditor onTextChange={setQuillText} />
					<pre data-testid="quill-text" className="mt-2 p-2 bg-gray-100">
						{quillText}
					</pre>
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-bold mb-4">Native Inputs</h2>
					<div className="flex flex-col gap-3">
						<input
							type="date"
							name="date"
							aria-label="Appointment date"
							data-testid="date-input"
							value={inputs.date}
							onChange={handleChange}
						/>
						<input
							type="time"
							name="time"
							aria-label="Appointment time"
							data-testid="time-input"
							value={inputs.time}
							onChange={handleChange}
						/>
						<input
							type="number"
							name="quantity"
							aria-label="Quantity"
							data-testid="number-input"
							value={inputs.quantity}
							onChange={handleChange}
						/>
						<input
							type="color"
							name="color"
							aria-label="Favorite color"
							data-testid="color-input"
							value={inputs.color}
							onChange={handleChange}
						/>
						<input
							type="range"
							name="volume"
							aria-label="Volume"
							data-testid="range-input"
							min={0}
							max={100}
							step={5}
							value={inputs.volume}
							onChange={handleChange}
						/>
						<div>
							<label htmlFor="nickname" className="block mb-1.5">
								Nickname
							</label>
							<input
								type="text"
								id="nickname"
								name="nickname"
								data-testid="nickname-input"
								value={inputs.nickname}
								onChange={handleChange}
								className="px-4 py-2.5 border border-gray-300 rounded"
							/>
						</div>
						<input
							type="tel"
							aria-label="Phone number"
							data-testid="phone-input"
							value={phone}
							onChange={(e) => setPhone(formatPhone(e.target.value))}
						/>
						<label className="block">
							<input
								type="checkbox"
								aria-label="Accept terms"
								data-testid="terms-checkbox"
								className="mr-2"
							/>
							Accept terms
						</label>
					</div>
				</section>

				<section>
					<h2 className="text-2xl font-bold mb-4">Current State</h2>
					<pre data-testid="native-state" className="p-4 bg-gray-100">
						{JSON.stringify(
							{
								...inputs,
								phone,
							},
							null,
							2,
						)}
					</pre>
				</section>
			</TestScreenLayout>
		</div>
	);
}
