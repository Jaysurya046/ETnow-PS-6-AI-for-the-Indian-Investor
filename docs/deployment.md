# Production deployment

## Build and runtime contract

`next.config.ts` enables `output: "standalone"` with the existing Turbopack root. Next traces runtime dependencies into `.next/standalone`; it does not automatically copy `public` or `.next/static`. Docker copies both into its runner. Local `npm start` uses `scripts/start.mjs` to copy them before starting the same generated server. Run `npm run build` first.

The Dockerfile has three stages: dependency installation with `npm ci`, production compilation, and a minimal non-root Alpine runtime (`nextjs:nodejs`, UID/GID 1001). Port defaults to 3000 and the server binds to `0.0.0.0`. The runner contains traced runtime dependencies and assets, rather than the full development dependency tree. No server-side video encoder is needed: export runs in the browser.

The requested default base is `node:20-alpine`. **Node 20 reached end of life on 30 April 2026.** Select a supported release for production, for example `docker build --build-arg NODE_VERSION=24 -t etnow-ai .`, or set `NODE_VERSION=24` in the Compose environment. See the [official Node release schedule](https://github.com/nodejs/Release#release-schedule). Validate the selected runtime and pin image digests in your release process. Framework versions remain pinned as requested; existing framework/tooling audit findings are recorded in [video production notes](video-production.md).

## Credentials and build context

Supply `GEMINI_API_KEY` only as a runtime environment variable or managed secret. The builder's `build-placeholder` is scoped to the build command; a real key is unnecessary for compilation and is never copied from a host environment file. The lazy Gemini getter supports absent credentials and factual fallbacks.

`.dockerignore` excludes `.env*`, `.git`, local dependencies/builds, tests, private key files and rendered videos. Do not pass a real Gemini key as a Docker build argument. `NEXT_PUBLIC_REMOTION_LICENSE_KEY`, if needed, is a deliberately public build argument embedded into browser JavaScript; setting it only at runtime cannot change an existing bundle. Remotion licensing and vendor telemetry are described in [video production](video-production.md).

## Docker and Compose

```sh
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 etnow
docker compose down
```

Compose reads the calling environment or `.env`, not `.env.local`. `GEMINI_API_KEY` can be omitted. `NODE_VERSION` and `NEXT_PUBLIC_REMOTION_LICENSE_KEY` are optional build settings. No secret file or source directory is mounted into the running container.

```sh
docker build --build-arg NODE_VERSION=24 -t etnow-ai .
docker run --rm -p 3000:3000 --env GEMINI_API_KEY etnow-ai
curl --fail http://localhost:3000/api/health
```

`--env GEMINI_API_KEY` forwards an already-set host variable without putting its value in the command. Rebuild after dependency or public build-variable changes. Docker's health probe uses Node's built-in HTTP client, so the runner needs no curl installation. The image honors a runtime `PORT` override; map that container port when overriding it.

## Health probes

`GET /api/health` returns HTTP 200 with `{ "status": "ok", "timestamp": "<ISO UTC>", "uptime": <seconds> }`. It is dynamic and sends `Cache-Control: no-store`. Uptime is for the current Node process, not a whole service or fleet.

The endpoint checks application liveness and HTTP readiness without querying Gemini, Yahoo or NSE. An upstream outage must not cause a restart loop. Configure Kubernetes HTTP liveness/readiness probes and ALB HTTP health checks to `/api/health` on the service port. External-feed freshness requires separate monitoring of the feed contracts' `asOf` and `isStale` fields.

## Vercel

Import the repository with the Next.js preset, install using `npm ci`, and build using `npm run build`. Select a supported Node runtime in project settings and add the server key to the appropriate environment. Add a public Remotion key before building if required. After account/project setup, deploy from the root:

```sh
npx vercel deploy --prod
```

Vercel uses its framework adapter, not the Dockerfile or Compose. Verify `/api/health`, chat streaming and feed status on the deployed URL. Follow [Vercel's CLI deployment guide](https://vercel.com/docs/projects/deploy-from-cli) for project linking and environment setup.

## Google Cloud Run

First configure a project, billing, an Artifact Registry repository, registry authentication and a service identity. Build a Linux image for your target platform and push it to that registry. With an existing image and a service identity authorized to access the named Secret Manager secret:

```sh
gcloud run deploy etnow-ai --image REGION-docker.pkg.dev/PROJECT/REPOSITORY/etnow-ai:TAG --region REGION --port 3000 --set-secrets GEMINI_API_KEY=SECRET_NAME:SECRET_VERSION
```

Replace every uppercase placeholder. Cloud Run injects `PORT`; the generated server listens on it and on `0.0.0.0`. Configure HTTP startup/liveness probes for `/api/health` through the service configuration. Choose service access policy explicitly; this command does not make it public. Omit `--set-secrets` for fallback-only operation. See the [official deploy reference](https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy) for port, secret and probe flags.

## AWS ECS / Fargate

Push the Linux image to ECR and reference its immutable tag/digest in a task definition. Use `awsvpc` networking, container port 3000, CloudWatch logging and execution/task roles appropriate to ECR and secrets. Inject `GEMINI_API_KEY` through the task's `secrets` field with an authorized Secrets Manager or Parameter Store ARN. Route an ALB target group to port 3000 and health path `/api/health`; terminate TLS at the load balancer.

Specify an ECS task-definition health check explicitly: ECS does not automatically adopt image health settings. Use the Dockerfile's Node HTTP probe as a `CMD` command with interval 30s, timeout 5s, retries 3 and startPeriod 20s. See [ECS health check behavior](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html). Task/service creation requires account-specific subnets, security groups, roles, registry and load-balancer resources; this repository does not create those resources.

## Operations and release verification

- Run `npm test`, `npm run lint` and `npm run build`; confirm `.next/standalone/server.js` exists.
- Smoke-test the server's health JSON, homepage, a static asset and dynamic API response. Build/test the Linux container in CI where Docker is available.
- Serve browser video export over HTTPS. Configure proxies to pass SSE incrementally without buffering and allow sufficient request duration for AI responses.
- Permit outbound HTTPS to configured providers. NSE may reject data-center requests; stale fallbacks retain original timestamps. No challenge bypass is implemented.
- Each process has independent bounded caches and rolling feed history. Cold starts use verified stale captures. Add shared durable storage and shared throttling before relying on fleet-wide freshness or quotas.
- Holdings stay in each browser. No database, authentication, broker integration or account backup is provisioned. Public API access and upstream costs need deployment-specific access controls/rate limits.

Deployment assets prepare the application for hosting; they do not constitute a live deployment or guarantee fresh upstream data. Release verification results are recorded in the implementation report.

## Verification record — 23 October 2026

All 32 regression tests, ESLint and the standalone production build passed on Node 22.17.1 / Windows. The actual `npm start` server returned 200 for health, homepage, generated JavaScript and public SVG; invalid video requests returned 400. Health was uncached and reported real process uptime. Compose YAML parsed successfully and README document links resolved. Docker is not installed here: Linux image builds, non-root container execution and cloud provisioning were not exercised. Run those checks in your Docker-enabled release environment, including when selecting the Node 24 build override.
