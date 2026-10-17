# Agent Instructions & Project Guardrails

<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## 1. Security & Guardrails

The project enforces strict guardrails located in `.agents/hooks/guard.py` and `.claude/settings.json`.

### Permitted Operations
- Running safe build, development, lint, and test scripts:
  - `bun install`, `npm install`
  - `bun run dev`, `npm run dev`
  - `bun run build`, `npm run build`
  - `bun run test`, `npm run test`
  - `bun run lint`, `npm run lint`
- Inspecting files and directories within the repository.
- Edits inside `src/` that preserve existing functionality and behavior.

### Strictly Forbidden Operations (Blocked by Guardrails)
- **Destructive File Commands**: `rm -rf`, `rmdir`, `unlink`, `shred`, `find -delete`.
- **Uncontrolled Git Commands**: `git push`, `git reset --hard`, `git clean -fd`, `git rebase`, rewriting remote history.
- **Direct Database Mutations**: Direct CLI commands like `psql`, `pgcli`, `mysql`, `redis-cli`, raw `DROP TABLE` or `DELETE FROM` statements.
- **Secrets Exposure**: Reading, copying, or printing sensitive `.env` credentials in chat or untrusted contexts.
- **Modifying Guardrail Files**: Modifying `.agents/` or `.claude/` files without explicit user consent.
- **Traversing Outside Workspace**: Any access to parent folders (`../`), `~`, `$HOME`, or system paths.

## 2. Core Development Rules

1. **Incremental & Safe**: Make small, incremental changes. Validate with tests (`bun run test`) and build checks (`bun run build`) after each change.
2. **Preserve Business Logic**: Never remove existing UI, animations, business logic, pricing math, or API integrations unless explicitly requested.
3. **Modular Design**: Avoid creating monolithic single files. Separate features into logical domains and keep shared utilities reusable.
4. **Environment Variables**: All Supabase and API URLs/keys must be loaded via `import.meta.env` (Vite) or `process.env`.
