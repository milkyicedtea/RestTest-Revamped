// Topology: servers host APIs and load generators. The orchestrator CLI can
// run anywhere (tester PC, oha server, wherever) as long as it can reach:
//   - each load generator (directly, via SSH, or via docker exec)
//   - the display API (for uploads)
//
// `server.sshAlias` unset  -> this machine (no SSH involved).
// `server.sshAlias` set    -> orchestrator shells out to `ssh <sshAlias>`.
//
// `server.address` is what a load generator dials to reach an API on that
// server (IP or DNS name). It does NOT have to be reachable from the
// orchestrator itself.

export interface Server {
	name: string;
	/** SSH alias for `ssh <alias>`; omit when this orchestrator runs on the server itself */
	sshAlias?: string;
	/** Address (ip/dns) a load generator uses to reach APIs on this server */
	address: string;
}

export type LoadGeneratorMode =
	| "native-local"
	| "native-ssh"
	| "docker-local"
	| "docker-ssh";

export interface LoadGenerator {
	name: string;
	mode: LoadGeneratorMode;
	/** Required for *-ssh modes: SSH alias of the load generator server */
	sshAlias?: string;
	/** Required for docker-* modes: container name running oha */
	container?: string;
}

export interface Test {
	id: string;
	description?: string;
	endpoint: string;
}

export interface Framework {
	name: string;
	/** Name of the Server (from `servers`) hosting this framework */
	server: string;
	port: number | string;
	tests: Array<Test>;
}

export interface Language {
	name: string;
	frameworks: Array<Framework>;
}

export interface ResolvedFramework extends Framework {
	language: string;
}

export interface Config {
	servers: Array<Server>;
	loadGenerators: Array<LoadGenerator>;
	langauges: Array<Language>;
}

// Edit this to add more tests!
export const config: Config = {
	servers: [
		{
			name: "local",
			address: "localhost",
		},
	],
	loadGenerators: [
		{
			name: "local-oha",
			mode: "docker-local",
			container: "infra-oha-1",
		},
	],
	langauges: [
		{
			name: "typescript",
			frameworks: [
				{
					name: "hono",
					server: "local",
					port: 4101,
					tests: [
						{
							id: "basic_hello",
							description: "Simple hello world endpoint",
							endpoint: "/",
						},
						{
							id: "pg_read",
							description: "Postgres read test",
							endpoint: "/pg/read",
						},
					],
				},
			],
		},
	],
};
