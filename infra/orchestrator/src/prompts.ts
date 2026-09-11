import { isCancel, multiselect, select, text } from "@clack/prompts";
import type { Config, LoadGenerator, ResolvedFramework } from "@/config";
import type { UploadSessionOptions } from "@/types";

interface ResolvedFlat {
	flat: Array<ResolvedFramework>;
	servers: Config["servers"];
}

function flatten(config: Config): ResolvedFlat {
	const flat: Array<ResolvedFramework> = config.langauges.flatMap((lang) =>
		lang.frameworks.map((fw) => ({ ...fw, language: lang.name })),
	);

	return { flat, servers: config.servers };
}

export async function chooseFramework(
	config: Config,
): Promise<Array<ResolvedFramework>> {
	const { flat } = flatten(config);

	const mode = await select({
		message: "Do you want to run all APIs or choose?",
		options: [
			{ label: "Run all", value: "all" },
			{ label: "Let me choose", value: "choose" },
		],
	});

	if (isCancel(mode) || mode === "all") {
		return flat;
	}

	const choices = await multiselect({
		message: "Select APIs to benchmark",
		options: flat.map((f) => ({
			label: `${f.language}/${f.name}`,
			value: f,
		})),
	});

	if (isCancel(choices)) {
		throw new Error("Selection cancelled");
	}

	return choices;
}

export async function chooseLoadGenerator(
	config: Config,
): Promise<LoadGenerator> {
	if (config.loadGenerators.length === 1) {
		const only = config.loadGenerators[0];
		if (only) return only;
	}

	const choice = await select({
		message: "Which load generator should run the benchmarks?",
		options: config.loadGenerators.map((g) => ({
			label: `${g.name} (${g.mode})`,
			value: g,
		})),
	});

	if (isCancel(choice)) {
		throw new Error("Selection cancelled");
	}

	return choice;
}

export async function chooseUploadOptions(): Promise<UploadSessionOptions> {
	const mode = await select({
		message: "Upload each result to display API?",
		options: [
			{ label: "No", value: "no" },
			{ label: "Yes", value: "yes" },
		],
	});

	if (isCancel(mode) || mode === "no") {
		return { enabled: false };
	}

	const displayApiUrl = await text({
		message: "Display API URL",
		placeholder: "http://localhost:4000",
		initialValue: process.env.DISPLAY_API_URL ?? "http://localhost:4000",
	});

	if (isCancel(displayApiUrl)) {
		throw new Error("Selection cancelled");
	}

	return {
		enabled: true,
		displayApiUrl: displayApiUrl.trim(),
	};
}
