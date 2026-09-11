import { existsSync, mkdirSync } from "node:fs";
import type { Config, LoadGenerator, ResolvedFramework } from "@/config";
import { wrapResult } from "@/formatter";
import { runOha } from "@/oha";
import type { MachineInput } from "@/types";
import { uploadResult } from "@/upload";

const DURATION = "10s";

export interface RunnerOptions {
	generator: LoadGenerator;
	machines: Map<string, MachineInput>;
	upload: {
		enabled: boolean;
		displayApiUrl?: string;
	};
}

export async function runFramework(
	config: Config,
	framework: ResolvedFramework,
	options: RunnerOptions,
): Promise<void> {
	const server = config.servers.find((s) => s.name === framework.server);

	if (!server) {
		throw new Error(
			`Server "${framework.server}" (framework ${framework.name}) not found in config.servers`,
		);
	}

	if (!existsSync("results")) mkdirSync("results", { recursive: true });

	for (const t of framework.tests) {
		const url = `http://${server.address}:${framework.port}${t.endpoint}`;

		console.log(
			`Running ${framework.language}/${framework.name} -> ${t.id} (${url})`,
		);

		const raw = await runOha(options.generator, {
			url,
			duration: DURATION,
		});

		const wrapped = wrapResult(
			framework.language,
			framework.name,
			t.id,
			t.endpoint,
			raw,
		);

		const machine = options.machines.get(framework.server);

		if (options.upload.enabled && options.upload.displayApiUrl && machine) {
			await uploadResult({ ...wrapped, machine }, options.upload.displayApiUrl);
			console.log(
				`Uploaded ${framework.language}/${framework.name} -> ${t.id}`,
			);
		}
	}
}
