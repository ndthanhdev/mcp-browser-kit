const Constants = {
	name: "mcpBrowserKit",
};

export const addDevTool = (value: object) => {
	const obj = (globalThis as any);
	if (obj[Constants.name] === undefined) {
		obj[Constants.name] = {};
	}

	obj[Constants.name] = {
		...obj[Constants.name],
		...value,
	};
};
