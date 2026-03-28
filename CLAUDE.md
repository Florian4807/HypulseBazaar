<!-- GSD:project-start source:PROJECT.md -->
## Project

**SkyBazaar**

A standalone service for processing and storing Hypixel SkyBlock bazaar data. Forked from Coflnet/SkyBazaar, stripped of microservice dependencies to run as an independent application. Enables historical tracking of bazaar prices and flip detection.

**Core Value:** Track Hypixel SkyBlock bazaar prices over time to identify profitable flips.

### Constraints

- **Tech Stack**: .NET/C# (from original), local database
- **Data Source**: Hypixel SkyBlock bazaar API (public)
- **Scope**: Single self-hosted instance
- **Dependencies**: Minimal - avoid Kafka, Redis, external services
<!-- GSD:project-end -->

<!-- GSD:stack-start source:STACK.md -->
## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
