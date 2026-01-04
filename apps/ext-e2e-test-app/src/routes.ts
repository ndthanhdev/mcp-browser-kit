import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	route("click-test", "routes/click-test.tsx"),
	route("form-test", "routes/form-test.tsx"),
	route("text-test", "routes/text-test.tsx"),
	route("javascript-test", "routes/javascript-test.tsx"),
] satisfies RouteConfig;
