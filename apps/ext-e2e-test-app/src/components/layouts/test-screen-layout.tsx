import { Link } from "react-router";

interface TestScreenLayoutProps {
	children: React.ReactNode;
}

export function TestScreenLayout({ children }: TestScreenLayoutProps) {
	return (
		<>
			<Link
				to="/"
				data-testid="back-to-home"
				className="inline-block mb-4 text-blue-600 hover:underline"
			>
				← Back to Home
			</Link>
			{children}
		</>
	);
}
