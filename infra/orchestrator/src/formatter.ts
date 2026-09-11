import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import type { OhaResult, WrappedResult } from "@/types";

export function wrapResult(
	language: string,
	framework: string,
	testId: string,
	endpoint: string,
	raw: object,
): WrappedResult {
	const wrapped: WrappedResult = {
		language,
		framework,
		testId,
		endpoint,
		timestamp: Date.now(),
		oha: raw as OhaResult,
	};

	const dir = `results/${language}/${framework}`;
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

	const out = `${dir}/${testId}.json`;
	writeFileSync(out, JSON.stringify(wrapped, null, 2));

	return wrapped;
}
