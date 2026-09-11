import { confirm, isCancel, text } from "@clack/prompts";
import { spawn } from "node:child_process";
import type { MachineInput, Platform } from "@/types";

interface SshTarget {
	sshAlias: string;
}

function isSshTarget(target: SshTarget | null): target is SshTarget {
	return target !== null;
}

function runCommand(command: string, args: Array<string>): Promise<string> {
	const { promise, resolve, reject } = Promise.withResolvers<string>();
	const proc = spawn(command, args, { stdio: ["ignore", "pipe", "inherit"] });

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
				new Error(`${command} failed with exit code ${code ?? "unknown"}`),
			);
			return;
		}

		resolve(stdout);
	});

	return promise;
}

/**
 * Executes `command` on the given target: directly when running on the server
 * itself, or over SSH when the server is remote.
 */
function execOn(target: SshTarget | null, command: string): Promise<string> {
	if (isSshTarget(target)) {
		return runCommand("ssh", [target.sshAlias, command]);
	}

	return runCommand("sh", ["-c", command]);
}

async function readOsRelease(target: SshTarget | null): Promise<string> {
	try {
		return (await execOn(target, "uname -s")).trim().toLowerCase();
	} catch {
		return "unknown";
	}
}

async function detectCpuModel(target: SshTarget | null): Promise<string> {
	try {
		const model = (
			await execOn(
				target,
				"sh -c \"lscpu | sed -n 's/^Model name:\\s*//p' | head -n 1\"",
			)
		).trim();
		return model.length > 0 ? model : "Unknown CPU";
	} catch {
		return "Unknown CPU";
	}
}

async function detectCpuCores(target: SshTarget | null): Promise<number> {
	try {
		const physical = (
			await execOn(
				target,
				"sh -c \"lscpu | sed -n 's/^Core(s) per socket:\\s*//p'\"",
			)
		).trim();
		const sockets = (
			await execOn(target, "sh -c \"lscpu | sed -n 's/^Socket(s):\\s*//p'\"")
		).trim();
		const coreCount = Number(physical) * Number(sockets || "1");
		if (Number.isFinite(coreCount) && coreCount > 0) return coreCount;
	} catch {
		// fall through
	}

	try {
		const threads = (await execOn(target, "nproc")).trim();
		const parsed = Number(threads);
		if (Number.isFinite(parsed) && parsed > 0) return parsed;
	} catch {
		// fall through
	}

	return 0;
}

async function detectCpuThreads(target: SshTarget | null): Promise<number> {
	try {
		const threads = (await execOn(target, "nproc")).trim();
		const parsed = Number(threads);
		if (Number.isFinite(parsed) && parsed > 0) return parsed;
	} catch {
		// fall through
	}

	return 0;
}

async function detectCpuSpeedGhz(target: SshTarget | null): Promise<number> {
	try {
		const mhz = (
			await execOn(
				target,
				"sh -c \"lscpu | sed -n 's/^CPU MHz:\\s*//p' | head -n 1\"",
			)
		).trim();
		const parsed = Number(mhz);
		if (Number.isFinite(parsed) && parsed > 0) {
			return Number((parsed / 1000).toFixed(2));
		}
	} catch {
		// fall through
	}

	return 0;
}

async function detectRamGb(target: SshTarget | null): Promise<number> {
	try {
		const kb = (
			await execOn(
				target,
				"sh -c \"grep MemTotal /proc/meminfo | sed 's/[^0-9]//g'\"",
			)
		).trim();
		const parsed = Number(kb);
		if (Number.isFinite(parsed) && parsed > 0) {
			return Math.max(1, Math.round(parsed / 1024 / 1024));
		}
	} catch {
		// fall through
	}

	return 0;
}

async function detectPlatform(target: SshTarget | null): Promise<string> {
	return readOsRelease(target);
}

export async function resolveMachineInput(
	target: SshTarget | null,
): Promise<MachineInput> {
	const [platform, cpu_model, cpu_cores, cpu_threads, cpu_speed_ghz, ram_gb] =
		await Promise.all([
			detectPlatform(target),
			detectCpuModel(target),
			detectCpuCores(target),
			detectCpuThreads(target),
			detectCpuSpeedGhz(target),
			detectRamGb(target),
		]);

	const normalizedPlatform: Platform =
		platform === "linux"
			? "linux"
			: platform === "darwin"
				? "macos"
				: platform === "windows"
					? "windows"
					: "unknown";

	const autoDetected: MachineInput = {
		cpu_model,
		cpu_cores,
		cpu_threads,
		cpu_speed_ghz,
		ram_gb,
		platform: normalizedPlatform,
	};

	const useDetected = await confirm({
		message: `Use detected machine specs for this server? (${autoDetected.cpu_model}, ${autoDetected.cpu_cores} cores, ${autoDetected.cpu_threads} threads, ${autoDetected.ram_gb}GB RAM, ${autoDetected.platform})`,
		initialValue: true,
	});

	if (isCancel(useDetected)) {
		throw new Error("Input cancelled");
	}

	if (useDetected) {
		return autoDetected;
	}

	return {
		cpu_model: await askString("CPU model", autoDetected.cpu_model),
		cpu_cores: await askNumber("CPU cores", autoDetected.cpu_cores),
		cpu_threads: await askNumber("CPU threads", autoDetected.cpu_threads),
		cpu_speed_ghz: await askNumber(
			"CPU speed in GHz",
			autoDetected.cpu_speed_ghz,
		),
		ram_gb: await askNumber("RAM in GB", autoDetected.ram_gb),
		platform: await askPlatform(autoDetected.platform),
	};
}

async function askString(
	message: string,
	initialValue: string,
): Promise<string> {
	const value = await text({ message, initialValue });

	if (isCancel(value)) {
		throw new Error("Input cancelled");
	}

	return value.trim().length > 0 ? value : initialValue;
}

async function askNumber(
	message: string,
	initialValue: number,
): Promise<number> {
	const value = await text({ message, initialValue: String(initialValue) });

	if (isCancel(value)) {
		throw new Error("Input cancelled");
	}

	const parsed = Number(value);
	if (!Number.isFinite(parsed)) {
		return initialValue;
	}

	return parsed;
}

async function askPlatform(initialValue: Platform): Promise<Platform> {
	const value = await text({
		message: "Platform (linux/windows/macos/unknown)",
		initialValue,
	});

	if (isCancel(value)) {
		throw new Error("Input cancelled");
	}

	const normalized = value.trim().toLowerCase();
	if (
		normalized === "linux" ||
		normalized === "windows" ||
		normalized === "macos" ||
		normalized === "unknown"
	) {
		return normalized;
	}

	return initialValue;
}
