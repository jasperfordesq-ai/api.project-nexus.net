# AI Service Boundary – Project Nexus

This document defines the security boundary for the LLaMA AI service. Read this before adding any AI features.

---

## What is the LLaMA Service?

The LLaMA service is an internal AI assistant that helps users with tasks like:

- Answering questions about timebanking
- Suggesting listings based on user needs
- Summarizing conversation threads
- Generating helpful prompts

It runs on `localhost:8000` and is never exposed to the public internet.

---

## Who Can Call the LLaMA Service?

**Only the ASP.NET API can call the LLaMA service.**

The API acts as a gatekeeper. When a user wants AI assistance:

1. The user's browser sends a request to the API
2. The API validates the user's JWT token
3. The API checks rate limits and permissions
4. The API calls the LLaMA service internally
5. The API sanitizes the response
6. The API returns the safe response to the browser

No exceptions. No shortcuts.

---

## What the LLaMA Service is Allowed to Do

- Receive prompts from the ASP.NET API
- Process text and return responses
- Access read-only context provided by the API (user name, tenant info, conversation history)
- Return structured JSON responses

---

## What the LLaMA Service is NOT Allowed to Do

- Receive requests directly from browsers
- Receive requests from any external source
- Access the database directly
- Make outbound network requests
- Store conversation history (the API handles persistence)
- Authenticate users (the API handles authentication)
- Know which tenant or user is making the request (the API strips identifying info if needed)

---

## Why Browsers Must Never Talk to the LLaMA Service Directly

### 1. No Authentication

The LLaMA service doesn't know who's calling it. It has no concept of users, tokens, or permissions. If exposed directly, anyone could use it without logging in.

### 2. No Rate Limiting

AI inference is expensive. Without the API as a gatekeeper, a malicious actor could send thousands of requests and run up costs or exhaust resources.

### 3. Prompt Injection Risk

Users can craft malicious prompts that try to manipulate the AI into revealing system prompts, bypassing restrictions, or generating harmful content. The API layer sanitizes inputs before they reach the LLaMA service.

### 4. Response Sanitization

The AI might generate content that needs filtering before it reaches users. The API can detect and block inappropriate responses. A direct browser connection bypasses this protection.

### 5. Audit Logging

The API logs all AI interactions for debugging and compliance. Direct browser access would bypass logging entirely.

### 6. Cost Control

The API can enforce per-user or per-tenant quotas. Without it, there's no way to limit usage or bill appropriately.

---

## How This is Enforced

1. **Network isolation:** The LLaMA service listens only on `localhost:8000`. It is not accessible from outside the server.

2. **No CORS configuration:** The LLaMA service is not in the CORS allowlist because browsers should never call it.

3. **No public DNS:** There is no `llama.project-nexus.net` domain. The service has no public URL.

4. **Firewall rules:** Port 8000 is blocked at the firewall. Only localhost connections are allowed.

---

## Common Mistakes to Avoid

**Mistake:** "Let's add the LLaMA endpoint to CORS so the frontend can call it faster."

**Why it's wrong:** This bypasses all security controls. Never do this.

---

**Mistake:** "Let's expose the LLaMA service on a subdomain for testing."

**Why it's wrong:** Test endpoints get forgotten and become attack vectors. Keep it internal.

---

**Mistake:** "The API is just a passthrough anyway, why not call LLaMA directly?"

**Why it's wrong:** The API is not a passthrough. It validates, rate-limits, logs, and sanitizes. Every step matters.

---

## If You Need to Add AI Features

1. Add a new endpoint in the ASP.NET API (e.g., `/api/ai/suggest`)
2. Validate the user's JWT token
3. Check rate limits
4. Sanitize the user's input
5. Call the LLaMA service from the API
6. Sanitize the response
7. Log the interaction
8. Return the response to the browser

Never expose the LLaMA service directly. Always go through the API.

---

## Summary

| Question | Answer |
|----------|--------|
| Can browsers call LLaMA? | No |
| Can mobile apps call LLaMA? | No |
| Can the API call LLaMA? | Yes |
| Is LLaMA in the CORS allowlist? | No |
| Does LLaMA have a public URL? | No |
| Is port 8000 open to the internet? | No |

---

## Contact

If you're unsure whether something violates this boundary, ask before implementing. Security mistakes are easier to prevent than to fix.
