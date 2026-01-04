import { useState } from "react";
import { TestScreenLayout } from "../layouts/test-screen-layout";

export function meta() {
	return [
		{
			title: "Form Test",
		},
	];
}

interface FormData {
	username: string;
	email: string;
	password: string;
	search: string;
	message: string;
	selectOption: string;
}

export function FormTestScreen() {
	const [formData, setFormData] = useState<FormData>({
		username: "",
		email: "",
		password: "",
		search: "",
		message: "",
		selectOption: "",
	});
	const [submittedData, setSubmittedData] = useState<FormData | null>(null);
	const [searchSubmitted, setSearchSubmitted] = useState<string | null>(null);

	const handleChange = (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setSubmittedData({
			...formData,
		});
	};

	const handleSearchSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setSearchSubmitted(formData.search);
	};

	return (
		<div className="p-5 font-sans max-w-3xl">
			<TestScreenLayout>
				<h1 data-testid="page-title" className="text-3xl font-bold mb-6">
					Form Test Screen
				</h1>

				{submittedData && (
					<div
						data-testid="submitted-data"
						className="mb-5 p-4 bg-green-100 rounded border border-green-300"
					>
						<h3 className="text-xl font-bold mb-2">Submitted Data:</h3>
						<pre className="m-0">{JSON.stringify(submittedData, null, 2)}</pre>
					</div>
				)}

				<section className="mb-8">
					<h2 className="text-2xl font-bold mb-4">
						Search Form (Enter to Submit)
					</h2>
					<form onSubmit={handleSearchSubmit}>
						<div className="flex gap-2.5 items-center">
							<input
								type="text"
								name="search"
								data-testid="search-input"
								placeholder="Search..."
								value={formData.search}
								onChange={handleChange}
								className="px-4 py-2.5 text-base border border-gray-300 rounded w-72"
							/>
							<button
								type="submit"
								data-testid="search-button"
								className="px-5 py-2.5 bg-blue-600 text-white border-none rounded cursor-pointer hover:bg-blue-700"
							>
								Search
							</button>
						</div>
					</form>
					{searchSubmitted && (
						<p data-testid="search-result" className="mt-2">
							Search submitted: <strong>{searchSubmitted}</strong>
						</p>
					)}
				</section>

				<section className="mb-8">
					<h2 className="text-2xl font-bold mb-4">Registration Form</h2>
					<form onSubmit={handleSubmit}>
						<div className="mb-4">
							<label htmlFor="username" className="block mb-1.5">
								Username
							</label>
							<input
								type="text"
								id="username"
								name="username"
								data-testid="username-input"
								placeholder="Enter username"
								value={formData.username}
								onChange={handleChange}
								className="px-4 py-2.5 text-base border border-gray-300 rounded w-full box-border"
							/>
						</div>

						<div className="mb-4">
							<label htmlFor="email" className="block mb-1.5">
								Email
							</label>
							<input
								type="email"
								id="email"
								name="email"
								data-testid="email-input"
								placeholder="Enter email"
								value={formData.email}
								onChange={handleChange}
								className="px-4 py-2.5 text-base border border-gray-300 rounded w-full box-border"
							/>
						</div>

						<div className="mb-4">
							<label htmlFor="password" className="block mb-1.5">
								Password
							</label>
							<input
								type="password"
								id="password"
								name="password"
								data-testid="password-input"
								placeholder="Enter password"
								value={formData.password}
								onChange={handleChange}
								className="px-4 py-2.5 text-base border border-gray-300 rounded w-full box-border"
							/>
						</div>

						<div className="mb-4">
							<label htmlFor="selectOption" className="block mb-1.5">
								Select Option
							</label>
							<select
								id="selectOption"
								name="selectOption"
								data-testid="select-input"
								value={formData.selectOption}
								onChange={handleChange}
								className="px-4 py-2.5 text-base border border-gray-300 rounded w-full box-border"
							>
								<option value="">Choose an option</option>
								<option value="option1">Option 1</option>
								<option value="option2">Option 2</option>
								<option value="option3">Option 3</option>
							</select>
						</div>

						<div className="mb-4">
							<label htmlFor="message" className="block mb-1.5">
								Message
							</label>
							<textarea
								id="message"
								name="message"
								data-testid="message-textarea"
								placeholder="Enter your message"
								value={formData.message}
								onChange={handleChange}
								rows={4}
								className="px-4 py-2.5 text-base border border-gray-300 rounded w-full box-border resize-y"
							/>
						</div>

						<button
							type="submit"
							data-testid="submit-button"
							className="px-6 py-3 bg-green-600 text-white border-none rounded text-base cursor-pointer hover:bg-green-700"
						>
							Submit Form
						</button>
					</form>
				</section>

				<section>
					<h2 className="text-2xl font-bold mb-4">Current Form State</h2>
					<div
						data-testid="form-state"
						className="p-4 bg-gray-100 rounded border border-gray-300"
					>
						<pre className="m-0">{JSON.stringify(formData, null, 2)}</pre>
					</div>
				</section>
			</TestScreenLayout>
		</div>
	);
}
