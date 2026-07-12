import {
	ExtensionLifecycleInputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension";
import { KeepAlive } from "@mcp-browser-kit/helper-extension-keep-alive";
import type { Container } from "inversify";
import { inject, injectable } from "inversify";

/**
 * Driving component that triggers extension startup. The app composition root
 * resolves this and calls `start()`. It performs the runtime startup steps
 * that are not part of the core orchestration (keep-alive listening) and then
 * delegates to the lifecycle use case.
 */
@injectable()
export class ExtensionLifecycle {
	private readonly logger: ReturnType<LoggerFactoryOutputPort["create"]>;

	constructor(
		@inject(ExtensionLifecycleInputPort)
		private readonly lifecycleUseCase: ExtensionLifecycleInputPort,
		@inject(KeepAlive)
		private readonly keepAlive: KeepAlive,
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = loggerFactory.create("ExtensionLifecycle");
	}

	static setupContainer(container: Container): void {
		// Register KeepAlive helper.
		container.bind<KeepAlive>(KeepAlive).to(KeepAlive);

		// Register the driving component itself.
		container
			.bind<ExtensionLifecycle>(ExtensionLifecycle)
			.to(ExtensionLifecycle);
	}

	start(): void {
		this.logger.info("Starting ExtensionLifecycle...");

		// Start keep-alive listening (runtime startup concern).
		this.keepAlive.startListening();

		// Delegate to the lifecycle use case (starts the other use cases).
		this.lifecycleUseCase.start().catch((error) => {
			this.logger.error("Error during extension lifecycle start:", error);
		});

		this.logger.info("ExtensionLifecycle start complete");
	}
}
