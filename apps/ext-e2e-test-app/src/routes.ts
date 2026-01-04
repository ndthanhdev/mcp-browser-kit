import { index, type RouteConfig, route } from "@react-router/dev/routes";

const routes = [
	index("pages/home.tsx"),
	route("click-test", "pages/click-test.tsx"),
	route("form-test", "pages/form-test.tsx"),
	route("text-test", "pages/text-test.tsx"),
	route("javascript-test", "pages/javascript-test.tsx"),
] satisfies RouteConfig;

export default routes;
