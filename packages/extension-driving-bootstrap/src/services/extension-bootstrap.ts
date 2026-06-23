import {
	ExtensionBootstrapInputPort,
	LoggerFactoryOutputPort,
} from "@mcp-browser-kit/core-extension";
import { KeepAlive } from "@mcp-browser-kit/helper-extension-keep-alive";
import type { Container } from "inversify";
import { inject, injectable } from "inversify";

/**
 * Driving component that triggers extension startup. The app composition root
 * resolves this and calls `bootstrap()`. It performs the runtime startup steps
 * that are not part of the core orchestration (keep-alive listening) and then
 * delegates to the bootstrap use case.
 */
@injectable()
export class ExtensionBootstrap {
	private readonly logger: ReturnType<LoggerFactoryOutputPort["create"]>;

	constructor(
		@inject(ExtensionBootstrapInputPort)
		private readonly bootstrapUseCase: ExtensionBootstrapInputPort,
		@inject(KeepAlive)
		private readonly keepAlive: KeepAlive,
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = loggerFactory.create("ExtensionBootstrap");
	}

	static setupContainer(container: Container): void {
		// Register KeepAlive helper.
		container.bind<KeepAlive>(KeepAlive).to(KeepAlive);

		// Register the driving component itself.
		container
			.bind<ExtensionBootstrap>(ExtensionBootstrap)
			.to(ExtensionBootstrap);
	}

	bootstrap(): void {
		this.logger.info("Bootstrapping ExtensionBootstrap...");

		// Start keep-alive listening (runtime startup concern).
		this.keepAlive.startListening();

		// Delegate to the bootstrap use case (starts the other use cases).
		this.bootstrapUseCase.start().catch((error) => {
			this.logger.error("Error during extension bootstrap:", error);
		});

		this.logger.info("ExtensionBootstrap bootstrap complete");
	}
}
