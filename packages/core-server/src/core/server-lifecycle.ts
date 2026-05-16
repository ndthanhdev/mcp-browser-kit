import { inject, injectable, multiInject } from "inversify";
import type { ServerLifecycleInputPort } from "../input-ports";
import {
	LifecycleParticipantOutputPort,
	LoggerFactoryOutputPort,
} from "../output-ports";

type State = "idle" | "starting" | "running" | "stopping" | "stopped";

@injectable()
export class ServerLifecycle implements ServerLifecycleInputPort {
	private readonly logger;
	private readonly started: LifecycleParticipantOutputPort[] = [];
	private state: State = "idle";

	constructor(
		@multiInject(LifecycleParticipantOutputPort)
		private readonly participants: LifecycleParticipantOutputPort[],
		@inject(LoggerFactoryOutputPort)
		loggerFactory: LoggerFactoryOutputPort,
	) {
		this.logger = loggerFactory.create("ServerLifecycle");
	}

	start = async (): Promise<void> => {
		if (this.state !== "idle") {
			this.logger.verbose(
				`start() called while state=${this.state} — ignoring`,
			);
			return;
		}
		this.state = "starting";
		this.logger.info(
			`Starting ${this.participants.length} lifecycle participant(s)`,
		);

		for (const participant of this.participants) {
			try {
				this.logger.verbose(`Starting participant: ${participant.name}`);
				await participant.start();
				this.started.push(participant);
			} catch (err) {
				this.logger.error(
					`Failed to start participant: ${participant.name}`,
					err,
				);
				await this.stopStarted();
				this.state = "stopped";
				throw err;
			}
		}

		this.state = "running";
		this.logger.info("All lifecycle participants started");
	};

	stop = async (): Promise<void> => {
		if (this.state !== "running" && this.state !== "starting") {
			this.logger.verbose(`stop() called while state=${this.state} — ignoring`);
			return;
		}
		this.state = "stopping";
		await this.stopStarted();
		this.state = "stopped";
		this.logger.info("All lifecycle participants stopped");
	};

	private stopStarted = async (): Promise<void> => {
		while (this.started.length > 0) {
			const participant = this.started.pop();
			if (!participant) continue;
			try {
				this.logger.verbose(`Stopping participant: ${participant.name}`);
				await participant.stop();
			} catch (err) {
				this.logger.error(
					`Error stopping participant: ${participant.name}`,
					err,
				);
			}
		}
	};
}
