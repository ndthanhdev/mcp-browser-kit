import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
	return [
		{
			title: "Home",
		},
	];
}

export default function Home() {
	return <div>Home</div>;
}
