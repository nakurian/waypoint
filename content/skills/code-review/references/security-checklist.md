# Security checklist

Apply in order. Security findings take precedence over correctness findings — a Critical security finding surfaces first in the report.

## 1. Hardcoded secrets

Scan the diff for:

- API keys, tokens, passwords, private keys, connection strings
- `.env*` files committed unintentionally
- Cloud credentials (`AWS_SECRET_*`, `AZURE_*`, `GOOGLE_APPLICATION_CREDENTIALS`)
- Signed URLs or pre-shared keys with long expiries
- Test fixtures containing real-looking data

Any secret in the diff is **Critical**, even if the commit is fresh — secrets leak through mirrors, forks, and backups immediately.

## 2. Authentication and authorization on new endpoints

For every new HTTP endpoint, GraphQL resolver, RPC handler, or queue consumer:

- Does it require authentication? If the rest of the service authenticates and this doesn't, **Critical**.
- Does it check authorization (role / scope / ownership) before acting? Missing authz on a write path is **Critical**; missing authz on a read path that returns another user's data is **Critical**.
- Does it match the pattern used on sibling endpoints (`@PreAuthorize`, middleware, decorator, policy check)? Divergence is **Major**.

## 3. Input validation and injection

Trace every input from the wire into the system:

- **SQL.** Any string-interpolated SQL is **Critical** — flag and suggest parameterised queries / prepared statements / the repo's existing query helper.
- **Shell / OS commands.** `Runtime.exec`, `subprocess.call(..., shell=True)`, template-string shell commands with user input — **Critical**.
- **Template engines.** Server-side template injection in Thymeleaf, Jinja2, Handlebars, Pug, FreeMarker — **Critical** if user input reaches the template body.
- **Path traversal.** User-provided filenames joined with `..` unchecked — **Major** to **Critical** depending on what's reachable.
- **Deserialisation.** Polymorphic deserialisation of untrusted JSON/YAML/XML — **Major** (or **Critical** for Jackson / SnakeYAML / Pickle on untrusted input).

Validation should use the repo's existing validator pattern (Bean Validation, Zod, Pydantic, class-validator), not ad-hoc regex.

## 4. Sensitive-data leakage

Check responses and logs:

- Do response DTOs omit fields that shouldn't leave the service (password hashes, internal IDs, PII not owned by the caller)?
- Do log statements redact payment instruments, tokens, PII to the project's standard (e.g., last-four-only)?
- Are error messages generic to clients and detailed in logs, not the other way around?

Sensitive-field logging is **Critical**. Over-wide response DTOs are **Major**.

## 5. Dependency CVEs

When dependency files change (see the dependencies checklist for the full deps analysis), cross-reference against known CVE databases:

- A pinned version with a known RCE / auth-bypass / SQLi CVE is **Critical**.
- A transitive dependency pulled to a CVE-bearing version is **Major** to **Critical**.
- A deprecated-but-not-vulnerable upgrade is **Minor**.

## 6. Pack-specific concerns

Consult the loaded domain pack's glossary when reviewing domain-adjacent code. Examples of pack-specific checks:

- **Financial / booking verticals.** PCI scope — which code paths touch payment instruments? Logging, error messages, and response bodies must redact.
- **Identity / PII workloads.** GDPR / local-privacy scope — is user data stored in the right region? Is the right-to-erasure path still intact?
- **Healthcare.** HIPAA boundaries — is PHI flowing through logs, caches, or third-party services?

If a pack defines sensitive glossary terms, the review should flag any code path that touches them without the pack's documented safeguards.
