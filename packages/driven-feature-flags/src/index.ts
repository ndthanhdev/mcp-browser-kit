// No shared root export: the server and web adapters are registered into separate DI
// containers (core-server vs core-extension) and built for separate tsup targets.
// Import the runtime-specific class via its subpath instead: "./server" or "./web".
export type {};
