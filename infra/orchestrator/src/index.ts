import { config } from "@/config";
import { resolveMachineInput } from "@/machine";
import {
	chooseFramework,
	chooseLoadGenerator,
	chooseUploadOptions,
} from "@/prompts";
import { runFramework } from "@/runner";
import type { MachineInput } from "@/types";

async function main(): Promise<void> {
	const frameworks = await chooseFramework(config);
	const generator = await chooseLoadGenerator(config);
	const uploadOptions = await chooseUploadOptions();

	// One machine record per API server (the machine under test), resolved once
	// per session; remote servers are queried over SSH.
	const machines = new Map<string, MachineInput>();

	for (const serverName of new Set(frameworks.map((f) => f.server))) {
		const server = config.servers.find((s) => s.name === serverName);

		if (!server) continue;

		machines.set(
			server.name,
			await resolveMachineInput(
				server.sshAlias ? { sshAlias: server.sshAlias } : null,
			),
		);
	}

	for (const f of frameworks) {
		await runFramework(config, f, {
			generator,
			machines,
			upload: {
				enabled: uploadOptions.enabled,
				displayApiUrl: uploadOptions.displayApiUrl,
			},
		});
	}

	console.log("All benchmarks completed");
}

main();
