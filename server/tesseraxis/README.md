# Tesseraxis research service

This directory defines the server boundary for work that cannot honestly run as
a static GitHub Pages feature: long optimization jobs, reinforcement-learning
training, shared projects, and synchronized collaborators.

## Services

- **API / control plane** — FastAPI validates jobs, authenticates users, owns
  project permissions, and streams state changes.
- **Simulation workers** — isolated containers claim immutable job specs and
  upload metrics, checkpoints, journals, and artifacts.
- **RL workers** — Python/PyTorch workers expose a Gymnasium-style adapter for
  a plugin and train against the same parameter and observation schema.
- **Persistence** — PostgreSQL stores users, projects, jobs, permissions, and
  version metadata. Object storage holds large journals and model checkpoints.
- **Realtime** — a project WebSocket carries presence, comments, run status,
  and version notifications. It does not stream authoritative physics state.

## Trust boundaries

User scripts are declarative scenario steps, not `eval`. Cloud jobs run in
network-disabled containers with CPU/GPU, memory, wall-time, and artifact-size
limits. A worker receives an immutable job document and never receives another
user's credentials. Collaboration mutations require project-role checks and
append an audit event.

## Deployment sequence

1. Add PostgreSQL and S3-compatible storage.
2. Replace the in-memory repository in `app.py` with transactional adapters.
3. Add OIDC authentication and project roles (`owner`, `editor`, `viewer`).
4. Package the deterministic simulation runner as a worker image.
5. Add the Gymnasium adapter and a separate GPU worker queue.
6. Deploy API and workers independently; never run training inside the API.

The local browser optimizer in `public/tesseraxis/src/research/experiment.js`
uses the same job vocabulary, allowing a job to move from local to cloud
execution without changing its experiment definition.
