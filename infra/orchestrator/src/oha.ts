import { spawn } from "node:child_process";
import type { LoadGenerator, LoadGeneratorMode } from "@/config";

export interface OhaRun {
	url: string;
	duration: string;
}

interface ResolvedTarget {
	command: string;
	args: Array<string>;
}

function resolveTarget(generator: LoadGenerator): ResolvedTarget {
	const mode: LoadGeneratorMode = generator.mode;

	switch (mode) {
		case "native-local":
			return { command: generator.name, args: [] };
		case "native-ssh":
			if (!generator.sshAlias) {
				throw new Error(
					`Load generator "${generator.name}": mode "${mode}" requires sshAlias`,
				);
			}
			return { command: "ssh", args: [generator.sshAlias, generator.name] };
		case "docker-local":
			if (!generator.container) {
				throw new Error(
					`Load generator "${generator.name}": mode "${mode}" requires container`,
				);
			}
			return { command: "docker", args: ["exec", generator.container, "oha"] };
		case "docker-ssh":
			if (!generator.sshAlias || !generator.container) {
				throw new Error(
					`Load generator "${generator.name}": mode "${mode}" requires sshAlias and container`,
				);
			}
			return {
				command: "ssh",
				args: [
					generator.sshAlias,
					"docker",
					"exec",
					generator.container,
					"oha",
				],
			};
		default: {
			const exhaustive: never = mode;
			throw new Error(`Unknown load generator mode: ${String(exhaustive)}`);
		}
	}
}

/**
 * Runs oha against `run.url` and resolves with the parsed JSON report.
 *
 * All four modes converge on oha writing its JSON report to stdout; the raw
 * report is never persisted on the load generator host. The caller decides
 * where to keep it.
 */
export function runOha(generator: LoadGenerator, run: OhaRun): Promise<object> {
	const target = resolveTarget(generator);

	const args = [
		...target.args,
		"--output-format",
		"json",
		"-z",
		run.duration,
		run.url,
	];

	const { promise, resolve, reject } = Promise.withResolvers<object>();
	const proc = spawn(target.command, args, {
		stdio: ["ignore", "pipe", "inherit"],
	});

	let stdout = "";

	proc.stdout?.on("data", (chunk: Buffer) => {
		stdout += chunk.toString();
	});

	proc.on("error", (error: Error) => {
		reject(error);
	});

	proc.on("close", (code: number | null) => {
		if (code !== 0) {
			reject(
				new Error(
					`oha failed with exit code ${code ?? "unknown"} (${generator.name})`,
				),
			);
			return;
		}

		try {
			resolve(JSON.parse(stdout) as object);
		} catch (error: unknown) {
			reject(
				new Error(
					`oha produced invalid JSON on stdout (${generator.name}): ${String(error)}`,
				),
			);
		}
	});

	return promise;
}
