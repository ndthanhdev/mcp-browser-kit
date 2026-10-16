import type {
	AgentProgressEvent,
	AgentSession,
	BrowserAgentInputPort,
} from "@mcp-browser-kit/core-extension";
import type { LoggerFactoryOutputPort } from "@mcp-browser-kit/core-extension/output-ports";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFakePortPair } from "../testing/fake-runtime-port";
import {
	fireOnConnect,
	resetRuntimeStub,
	setConnectHandler,
} from "../testing/webextension-polyfill-stub";
import { AgentPortGate } from "./agent-port-gate";
import { AgentRpcClient } from "./agent-rpc-client";
import { ExtensionDrivingAgentRpc } from "./extension-driving-agent-rpc";

const silentLoggerFactory = {
	create: () => ({
		verbose: () => {},
		info: () => {},
		warn: () => {},
		error: () => {},
		debug: () => {},
	}),
} as unknown as LoggerFactoryOutputPort;

const session = (sessionId: string): AgentSession => ({
	sessionId,
	status: "idle",
	createdAt: 0,
	updatedAt: 0,
});

/** A stand-in agent whose event stream the test drives by hand. */
const fakeAgent = () => {
	const listeners = new Set<(event: AgentProgressEvent) => void>();
	const sessions: AgentSession[] = [
		session("s1"),
	];

	const agent = {
		createSession: vi.fn(async () => session("created")),
		endSession: vi.fn(async () => {}),
		sendMessage: vi.fn(async () => {}),
		cancel: vi.fn(async () => {}),
		getSession: vi.fn(async (id: string) =>
			sessions.find((entry) => entry.sessionId === id),
		),
		listSessions: vi.fn(async () => sessions),
		getHistory: vi.fn(async () => [] as AgentProgressEvent[]),
		subscribe: vi.fn((listener: (event: AgentProgressEvent) => void) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}),
	} satisfies BrowserAgentInputPort;

	return {
		agent,
		emit: (event: AgentProgressEvent) => {
			for (const listener of listeners) {
				listener(event);
			}
		},
		listenerCount: () => listeners.size,
	};
};

/**
 * Stand up the controller, then point the runtime stub at a fresh port pair so
 * `client` and controller are talking over a real transport.
 */
const connectClient = (controller: ExtensionDrivingAgentRpc) => {
	const pair = createFakePortPair();
	const gate = new AgentPortGate();
	setConnectHandler(() => {
		// The background sees the connection at the moment the UI connects.
		queueMicrotask(() => fireOnConnect(pair.background));
		return pair.ui;
	});
	controller.start(gate);
	return pair;
};

/**
 * Emittery dispatches asynchronously, so a pushed event lands a microtask after
 * the agent emits it. Nothing in production cares; tests have to wait.
 */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
	resetRuntimeStub();
});

describe("agent RPC over a runtime port", () => {
	it("round-trips a call from the UI to the agent", async () => {
		const { agent } = fakeAgent();
		const controller = new ExtensionDrivingAgentRpc(agent, silentLoggerFactory);
		connectClient(controller);

		const client = new AgentRpcClient();
		expect(await client.listSessions()).toEqual([
			session("s1"),
		]);
		expect(agent.listSessions).toHaveBeenCalledOnce();
	});

	it("passes arguments through", async () => {
		const { agent } = fakeAgent();
		const controller = new ExtensionDrivingAgentRpc(agent, silentLoggerFactory);
		connectClient(controller);

		const client = new AgentRpcClient();
		await client.sendMessage({
			sessionId: "s1",
			message: {
				content: "click the button",
			},
		});

		expect(agent.sendMessage).toHaveBeenCalledWith({
			sessionId: "s1",
			message: {
				content: "click the button",
			},
		});
	});

	it("omits the argument entirely when createSession is called bare", async () => {
		const { agent } = fakeAgent();
		const controller = new ExtensionDrivingAgentRpc(agent, silentLoggerFactory);
		connectClient(controller);

		const client = new AgentRpcClient();
		await client.createSession();

		expect(agent.createSession).toHaveBeenCalledWith();
	});

	it("surfaces an agent error as a rejection on the UI side", async () => {
		const { agent } = fakeAgent();
		// A plain function, not `vi.fn().mockRejectedValue(...)`: the spy tracks
		// settled results on a derived promise nobody handles, which surfaces as a
		// spurious unhandled rejection even though the RPC server catches this.
		const throwing = {
			...agent,
			listSessions: async () => {
				throw new Error("agent exploded");
			},
		};
		const controller = new ExtensionDrivingAgentRpc(
			throwing,
			silentLoggerFactory,
		);
		connectClient(controller);

		const client = new AgentRpcClient();
		await expect(client.listSessions()).rejects.toThrow("agent exploded");
	});

	it("pushes progress events to a subscribed UI", async () => {
		const harness = fakeAgent();
		const controller = new ExtensionDrivingAgentRpc(
			harness.agent,
			silentLoggerFactory,
		);
		connectClient(controller);

		const client = new AgentRpcClient();
		const received: AgentProgressEvent[] = [];
		client.subscribe((event) => received.push(event));

		// Let the background observe the connection before emitting.
		await client.listSessions();

		const event: AgentProgressEvent = {
			type: "turn-started",
			sessionId: "s1",
			turnId: "t1",
			at: 1,
		};
		harness.emit(event);
		await flush();

		expect(received).toEqual([
			event,
		]);
	});

	it("keeps RPC replies and event pushes from being confused for each other", async () => {
		const harness = fakeAgent();
		const controller = new ExtensionDrivingAgentRpc(
			harness.agent,
			silentLoggerFactory,
		);
		const pair = connectClient(controller);

		const client = new AgentRpcClient();
		const received: AgentProgressEvent[] = [];
		client.subscribe((event) => received.push(event));

		await client.listSessions();
		harness.emit({
			type: "turn-started",
			sessionId: "s1",
			turnId: "t1",
			at: 1,
		});
		await flush();

		const keys = pair.postedToUi.map(
			(frame) => Object.keys(frame as object)[0],
		);
		expect(keys).toEqual([
			"resolve",
			"agentEvent",
		]);
		expect(received).toHaveLength(1);
	});

	it("unsubscribes from the agent when the UI disconnects", async () => {
		const harness = fakeAgent();
		const controller = new ExtensionDrivingAgentRpc(
			harness.agent,
			silentLoggerFactory,
		);
		const pair = connectClient(controller);

		const client = new AgentRpcClient();
		await client.listSessions();
		expect(harness.listenerCount()).toBe(1);

		pair.disconnect();
		expect(harness.listenerCount()).toBe(0);
	});
});

describe("reconnection", () => {
	it("reconnects lazily on the next call after the worker is evicted", async () => {
		const { agent } = fakeAgent();
		const controller = new ExtensionDrivingAgentRpc(agent, silentLoggerFactory);
		const first = connectClient(controller);

		const client = new AgentRpcClient();
		await client.listSessions();

		// The service worker is evicted: the port drops.
		first.disconnect();

		connectClient(controller);
		expect(await client.listSessions()).toEqual([
			session("s1"),
		]);
	});

	it("does not reconnect eagerly on disconnect — that would revive the worker", async () => {
		const { agent } = fakeAgent();
		const controller = new ExtensionDrivingAgentRpc(agent, silentLoggerFactory);
		const pair = connectClient(controller);

		const client = new AgentRpcClient();
		await client.listSessions();

		let reconnected = false;
		setConnectHandler(() => {
			reconnected = true;
			throw new Error("should not have been called");
		});
		pair.disconnect();

		expect(reconnected).toBe(false);
	});

	it("tells the UI to re-hydrate after a reconnect, but not on first connect", async () => {
		const { agent } = fakeAgent();
		const controller = new ExtensionDrivingAgentRpc(agent, silentLoggerFactory);
		const first = connectClient(controller);

		const client = new AgentRpcClient();
		const onReconnect = vi.fn();
		client.onReconnect(onReconnect);

		await client.listSessions();
		expect(onReconnect).not.toHaveBeenCalled();

		first.disconnect();
		connectClient(controller);
		await client.listSessions();

		expect(onReconnect).toHaveBeenCalledOnce();
	});

	it("re-delivers events over the new port to the original subscriber", async () => {
		const harness = fakeAgent();
		const controller = new ExtensionDrivingAgentRpc(
			harness.agent,
			silentLoggerFactory,
		);
		const first = connectClient(controller);

		const client = new AgentRpcClient();
		const received: AgentProgressEvent[] = [];
		client.subscribe((event) => received.push(event));
		await client.listSessions();

		first.disconnect();
		connectClient(controller);
		await client.listSessions();

		harness.emit({
			type: "turn-started",
			sessionId: "s1",
			turnId: "t2",
			at: 2,
		});
		await flush();

		expect(received).toHaveLength(1);
	});
});

describe("controller lifecycle", () => {
	it("is idempotent to start", () => {
		const { agent } = fakeAgent();
		const controller = new ExtensionDrivingAgentRpc(agent, silentLoggerFactory);
		const pair = createFakePortPair();
		const gate = new AgentPortGate();
		setConnectHandler(() => pair.ui);

		controller.start(gate);
		controller.start(gate);

		// Two registrations would accept the same port twice and double every event.
		fireOnConnect(pair.background);
		expect(agent.subscribe).toHaveBeenCalledOnce();
	});

	it("ignores ports opened under another name", () => {
		const { agent } = fakeAgent();
		const controller = new ExtensionDrivingAgentRpc(agent, silentLoggerFactory);
		controller.start(new AgentPortGate());

		fireOnConnect(createFakePortPair("some-other-feature").background);

		expect(agent.subscribe).not.toHaveBeenCalled();
	});
});

describe("connecting before the agent is ready", () => {
	/**
	 * The bug this exists to prevent: MV3 only delivers `onConnect` to listeners
	 * registered during the worker's initial synchronous evaluation, and the
	 * connection that *wakes* the worker is dispatched while composition is still
	 * suspended on an `await`. Registering after that window drops exactly the
	 * connection that caused the wake — every first open of the sidepanel.
	 */
	it("serves a port that arrived before the controller started", async () => {
		const harness = fakeAgent();
		const controller = new ExtensionDrivingAgentRpc(
			harness.agent,
			silentLoggerFactory,
		);

		// Gate is constructed first, as it is in the background's initial
		// evaluation. The connection lands while the agent is still being built.
		const gate = new AgentPortGate();
		const pair = createFakePortPair();
		setConnectHandler(() => pair.ui);
		const client = new AgentRpcClient();
		const pending = client.listSessions();

		fireOnConnect(pair.background);
		expect(gate.bufferedCount).toBe(1);

		// Composition finishes late; the buffered port is replayed.
		controller.start(gate);

		expect(await pending).toEqual([
			session("s1"),
		]);
	});

	it("serves ports arriving after start without buffering", () => {
		const { agent } = fakeAgent();
		const controller = new ExtensionDrivingAgentRpc(agent, silentLoggerFactory);
		const gate = new AgentPortGate();
		controller.start(gate);

		fireOnConnect(createFakePortPair().background);

		expect(gate.bufferedCount).toBe(0);
		expect(agent.subscribe).toHaveBeenCalledOnce();
	});
});

describe("when the agent never starts", () => {
	/**
	 * Buffering a port forever is worse than refusing it: the UI waits with
	 * neither a result nor an error. That is how a disabled feature flag showed
	 * up as a chat stuck on "Loading…".
	 */
	it("fails in-flight calls instead of hanging when the gate refuses", async () => {
		const gate = new AgentPortGate();
		const pair = createFakePortPair();
		setConnectHandler(() => pair.ui);

		const client = new AgentRpcClient();
		const pending = client.listSessions();
		fireOnConnect(pair.background);

		gate.refuse();

		await expect(pending).rejects.toThrow(/disconnected before answering/);
	});

	it("closes connections that arrive after refusing", () => {
		const gate = new AgentPortGate();
		gate.refuse();

		const pair = createFakePortPair();
		fireOnConnect(pair.background);

		expect(gate.bufferedCount).toBe(0);
	});
});

describe("a dying port fails its calls", () => {
	it("rejects in-flight calls when the background disconnects", async () => {
		const { agent } = fakeAgent();
		// Accept the connection but never answer, then drop the port.
		agent.listSessions.mockImplementation(() => new Promise(() => {}));
		const controller = new ExtensionDrivingAgentRpc(agent, silentLoggerFactory);
		const pair = connectClient(controller);

		const client = new AgentRpcClient();
		const pending = client.listSessions();
		await flush();
		pair.disconnect();

		await expect(pending).rejects.toThrow(/disconnected before answering/);
	});
});
