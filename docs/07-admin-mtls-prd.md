# PRD: Hardware-key admin access with backend-terminated mTLS

**Status:** proposed; documentation only, not a deployed feature.

**Owner / only admin:** Ishaan Zaveri.

**Date:** 2026-11-01.

`iz@web:~/admin$ authenticate --certificate`

## 1. Problem and intent

The portfolio must remain public, while its authoring UI and administrative API
are accessible only to the owner. There must be no website username/password,
public signup, emailed login link, or password-reset bypass.

This is deliberately a **security-engineering and Go-learning project**, not an
attempt to minimize authentication infrastructure. The learning surface is TLS,
private PKI, hardware-backed credentials, authorization, credential lifecycle,
and adversarial testing. Use established TLS/X.509 implementations; do not
invent cryptographic primitives or an authentication protocol.

**Implementation ownership is unchanged:** everything in `backend/` remains
handwritten by the owner. This document specifies behavior and acceptance tests;
it does not authorize AI-generated Go code or scaffolding.

## 2. Goals and boundaries

### Goals

- Keep Home, About, Blog, Photo, Contact, images, and public API access unchanged.
- Serve a private admin UI and its API from one dedicated HTTPS origin.
- Terminate the browser's TLS connection in Go and authenticate a client
  certificate backed by an enrolled YubiKey.
- Represent exactly one owner, with independently revocable primary and spare
  credentials. Multiple keys must not imply multiple accounts.
- Exercise enrollment, renewal, revocation, recovery, auditability, and negative
  security tests as first-class project work.

### Non-goals for v1

- Cloudflare Access, edge-terminated mTLS, or trusting forwarded certificate
  headers as the admin authentication authority.
- Multi-user accounts, roles, invitations, password/email recovery, or a public
  certificate-enrollment endpoint.
- A custom JWT-signing protocol, bearer-token fallback, or separate login cookie
  that can bypass the certificate requirement.
- Full content-editor implementation. The existing
  [admin route contract](01-backend-api-routes.md#7-admin--authoring-private)
  remains the source for eventual authoring operations.
- Transparent 1Password passkey support. A WebAuthn passkey is a different
  credential mechanism, not a browser TLS client certificate. Adding it requires
  a separate design decision; do not silently weaken the hardware-key policy.
- Proof of physical key presence on every HTTP request, protection from a
  compromised admin computer, or immunity to denial of service.

Software client keys are permitted only as isolated local/CI test fixtures,
never as an undocumented production recovery path. Do not commit their private
keys.

## 3. Proposed decisions

| Area | Requirement / proposed default |
|---|---|
| Identity | One internal owner identity; no username input. |
| Production credentials | PIV-capable YubiKey primary and spare, each with a different on-device key and client certificate. |
| Admin origin | `admin.yoursite.com`; all hostnames here are placeholders. |
| TLS termination | Go itself; no intervening HTTP proxy terminating browser TLS. |
| Client trust | A private client CA, plus an explicit enrolled-certificate allowlist. |
| Server certificate | Browser-trusted public certificate recommended; a private server CA is an intentional alternative requiring workstation trust setup. Issuer is not locked to Let's Encrypt. |
| Authorization | Check current certificate validity and enrollment state on every admin request, including reused connections. |
| Application sessions | No JWT or authentication cookie in v1; derive the owner from the verified TLS credential. |
| TLS baseline | TLS 1.3; disable session resumption for v1 to make connection authentication easier to reason about and test. |
| Client certificate lifetime | Proposed 90 days, with an expiry warning at 14 days; confirm operational practicality before launch. |
| Revocation objective | Requests beginning more than 5 seconds after an acknowledged revocation must be denied, even on an existing HTTP/2 connection. |

These are proposed requirements, not claims about the current implementation.
The server-certificate choice and actual hardware/browser support must be
resolved before production exposure.

## 4. Architecture and network boundary

The public deployment keeps Cloudflare Pages, R2, and the existing public API
Tunnel described in [hosting architecture](04-hosting-architecture.md).

The new admin origin is a **separate ingress path**:

- `yoursite.com`: public frontend on Cloudflare Pages; no client certificate.
- `images.yoursite.com`: public derivatives; no client certificate.
- `api.yoursite.com`: public API through the existing Tunnel to a loopback-bound
  public listener. Administrative handlers must not exist on this listener.
- `admin.yoursite.com`: DNS-only A/AAAA records to the VPS; browser TLS reaches
  the Go admin listener directly on TCP 443. Go serves both the compiled admin
  frontend and `/api/admin/**` on this origin.

Normal Cloudflare HTTP proxying terminates browser TLS, so it cannot sit in this
admin path while preserving direct browser-to-Go client authentication [3].
Cloudflare can remain the DNS provider without being the admin HTTPS proxy.

This is an explicit future exception to the current **zero inbound ports**
baseline. Enabling it requires owner approval to expose the VPS address and
open TCP 443. Port 80, public SSH, database ports, and the public API listener
remain closed. Apply the same policy to IPv4 and IPv6; publish no AAAA record
until the IPv6 listener and firewall have been verified.

Go must use distinct public and admin listeners/routers, even if they share a
process and database. The tunnel must not forward to the admin listener. The
admin listener must reject unexpected TLS names and HTTP authorities, and must
not fall back to serving public routes on an authentication failure. Headers
such as `X-Client-Cert` and Cloudflare certificate metadata are untrusted input,
not alternative credentials.

Because this origin bypasses Cloudflare's HTTP edge, its WAF and HTTP rate
limiting are not admin protections. Configure bounded TLS/HTTP timeouts,
handshake concurrency, request sizes, upload limits, and application rate
limits before exposure. The owner must accept the increased direct-origin
attack and denial-of-service surface.

## 5. Certificates and trust

### Server authentication: the browser verifies Go

The Go listener needs a server certificate for the exact admin hostname and its
corresponding private key. The two supported deployment choices are:

1. A publicly trusted server certificate installed on Go. Let's Encrypt is one
   option, not a requirement. If using ACME, prefer DNS-01 so renewal does not
   require an unauthenticated HTTP listener or TLS exception [6].
2. A server certificate issued by a private server CA, explicitly trusted on
   the owner's admin devices. Do not normalize bypassing browser warnings.

Cloudflare Universal SSL is an edge certificate, not the certificate presented
by this direct Go listener. Cloudflare Origin CA certificates are not
browser-trusted by default and are not a drop-in solution for this path [7][8].

### Client authentication: Go verifies the YubiKey credential

- Create a private client CA and configure its public trust anchor explicitly
  in Go's client-authentication trust pool. Do not accept all roots from the
  operating system's general-purpose trust store [1].
- The client CA's root certificate may be self-signed. Client leaf certificates
  are signed by that CA, not self-signed. They must have client-authentication
  usage, digital-signature capability, and must not be CA certificates.
- Generate each production client key on its own PIV-capable YubiKey, then issue
  and install its certificate. Never export or copy a production client key.
  Harden default PIV PIN/PUK/management credentials and document lockout and
  recovery behavior. Choose and test PIN/touch policies at provisioning [4].
- Store the CA signing key offline, outside the web server, source control,
  frontend assets, and CI. Back up signing/recovery material securely and
  separately from the primary hardware key. The server needs only the client
  CA's public certificate, not its signing key.
- A private CA is not made trustworthy by its self-signature. Go trusts it
  because the owner deliberately provisions that trust. Public CA endorsement
  is unnecessary for this private client-authentication boundary.
- Do not install the client CA as a browser website-trust root merely to make
  Go trust clients. Keep server-trust provisioning separate.

TLS verification establishes possession of a certified key, not its physical
storage location. The trusted provisioning process must record hardware-key
generation; verified PIV attestation is a stretch goal rather than an assumed
property of every incoming TLS connection [4]. Browser/smart-card integration
must be validated on the owner's real hardware, OS, and browser.

## 6. Identity and request authorization

### Enrollment record

Keep one owner record and an explicit record for each client leaf certificate:

- Stable credential identifier and a human-readable label, such as primary or
  spare; both map to the same owner.
- SHA-256 fingerprint of the leaf certificate as the enrollment lookup key.
- Issuer/serial, validity interval, and public-key fingerprint for lifecycle
  diagnostics; these are metadata, not substitutes for chain verification.
- Active/revoked state, enrollment time, revocation time, and reason.

A certificate common name is not authorization. A CA-signed but unenrolled
certificate must be denied. Reissuing a certificate changes its fingerprint and
requires an explicit enrollment update, even when its public key is unchanged.

### Request lifecycle

1. Go requires a verified client certificate during TLS establishment, checks
   the dedicated client trust chain and client-authentication usage, and rejects
   missing or invalid credentials before serving admin HTTP content [1][2].
2. Every admin request rechecks the presented certificate against current client
   trust, validity, and enrollment state. Derive the sole owner identity only
   from this verified and active credential. Missing or unavailable policy
   state fails closed.
3. Only then may the admin router serve UI bytes, identity/bootstrap data, or
   authoring operations. Apply authorization to reads and assets, not just
   mutations. Serve unknown admin routes only after authorization.
4. `GET /api/admin/auth` returns minimal owner/credential display information,
   certificate expiry, and a short-lived CSRF token. It is a protected bootstrap
   endpoint, not a credential-issuance or login endpoint. Do not return the full
   client certificate or secrets.
5. Authoring operations use the existing `/api/admin/**` contract, same-origin
   requests, and server-side validation. They remain entirely absent from the
   public listener regardless of HTTP method, path encoding, Host, or headers.

Invalid TLS credentials may produce a browser TLS error, not a branded React
login page. A TLS-valid but unauthorized credential receives `403` with no admin
UI content. API denials use the existing JSON error envelope where an HTTP
response is possible. An unavailable authorization store must not degrade into
allowing access.

## 7. Web security and user experience

- Preserve the existing terminal aesthetic and accessibility conventions:
  JetBrains Mono, shell/file chrome, keyboard focus, and readable status output.
  The initial screen can display `◢ admin`, the credential label, and expiry.
- No username/password form or public registration UI. Certificate selection,
  PIN entry, and touch are browser/OS/hardware interactions, not JavaScript
  handling private keys.
- Require the exact admin `Origin` on unsafe requests; reject missing or `null`
  origins. Require a custom-header CSRF token bound server-side to the enrolled
  certificate, with a proposed 10-minute lifetime. Fetch it only through the
  authorized, non-cacheable bootstrap endpoint. Check Fetch Metadata where
  available, deny cross-origin CORS, and never treat a sibling subdomain as the
  same origin. Test JSON writes and multipart uploads [5].
- No state-changing `GET`s. Set `Cache-Control: no-store` on admin responses,
  exclude them from service-worker/offline caches, block framing, and apply a
  restrictive CSP and the existing content-sanitization rules.
- Browser-managed client authentication does not eliminate CSRF or XSS. Do not
  rely on a certificate, CORS, or cookie settings as the only write protection.
- Do not promise logout on key removal: an established TLS connection can carry
  further requests without a new hardware operation. V1 must not show a logout
  control that claims to revoke certificate access. Emergency lockout means
  revocation or disabling the admin listener, not merely closing a tab.
- Connection reuse is permitted, but TLS resumption is disabled in v1 and must
  be tested. Any later resumption support needs a reviewed design that rechecks
  authentication policy on resumed connections; Go verification callbacks do
  not all have the same resumption behavior [1].

## 8. Operations, recovery, and observability

### Bootstrap and recovery

Provision the first owner and both credential records through an authenticated
operator workflow, never a public first-visitor-wins endpoint. Keep initial
issuance and recovery outside the web UI for v1. Existing private operator
access to the VPS remains a separate trust boundary, not a website-login
fallback.

Test loss of the primary key using the spare. Test total key loss using the
documented operator workflow: disable admin access if needed, revoke lost
credentials, provision a new on-device key, issue/enroll its certificate, and
restore access. No password, bearer token, or soft-fail TLS mode may be enabled
as part of recovery.

### Renewal and revocation

- Monitor server and client certificate expiry separately. Renew server
  certificates without relaxing client authentication or opening a public
  challenge path. Client renewal requires the offline signing workflow and an
  explicit enrollment update; any overlap must be bounded and documented.
- Acknowledge revocation only after policy is durably stored and visible to the
  request-authorization path. Enforce the 5-second objective on new and reused
  connections. Already authorized in-flight work may finish; do not claim that
  revocation rolls back completed or running transactions.
- Refuse expired client certificates on existing connections as well as new
  ones. A certificate accepted at connection establishment is not indefinitely
  valid for later requests.
- Document CA rotation, trust-anchor removal, and CA-key compromise recovery.
  Reevaluate policy on existing connections; do not leave a second listener,
  stale trust store, or restart-only allowlist as a bypass.
- Failed trust/policy reloads must not silently preserve a revoked credential
  beyond the stated objective; deny admin requests or disable the listener
  until a valid policy is available. Keep the public site available.

### Audit and resource controls

Record bounded, structured events for authentication/authorization failures,
credential enrollment/revocation, expiry warnings, and successful admin writes.
Include timestamp, request ID when available, operation, outcome, and credential
identifier/fingerprint where available. Handshake failures occur before an HTTP
request ID or verified identity may exist; do not fabricate either.

Never log private keys, PINs, CSRF tokens, request bodies, or full certificates.
Define log retention, rotation, and secret-file permissions before deployment.
Do not trust forwarded source-IP headers on the direct listener. Resource limits
must cover pre-authentication traffic, not only authenticated HTTP requests.

## 9. Delivery plan

Each phase is owner-implemented and must leave the public deployment unchanged.

1. **Local trust lab:** temporary local CA, server/client certificate fixtures,
   dedicated Go listeners, one protected identity screen, and negative TLS tests.
   Keep fixture private keys out of git and away from production trust stores.
2. **Hardware enrollment:** provision primary and spare YubiKeys, choose
   PIN/touch policies, document the verified OS/browser matrix, and complete
   successful and failed browser authentication tests.
3. **Direct ingress:** resolve the server-certificate choice, deploy the admin
   build behind Go mTLS, configure DNS-only routing and the firewall exception,
   and prove the Tunnel/public listener cannot reach admin operations.
4. **Lifecycle and hardening:** implement expiry, per-request authorization,
   revocation, CSRF controls, audit/resource limits, recovery, and acceptance
   tests before enabling real authoring operations.

Rollback disables the admin listener and removes its public ingress rule/DNS
record as appropriate. It must not fall back to unauthenticated admin access,
and must not interrupt the public frontend, images, or public API.

## 10. Acceptance criteria

| Scenario | Required result |
|---|---|
| Visitor without a certificate browses public pages, images, and public API | Existing behavior; no admin certificate prompt or new dependency. |
| No client certificate, wrong CA, expired/not-yet-valid certificate, or wrong certificate usage | No admin HTTP content; failed verification cannot be bypassed with headers. |
| Enrolled primary or spare hardware key | Same owner is authorized; no website username/password. |
| Valid private-CA certificate not explicitly enrolled | Denied; no UI/assets/bootstrap data. |
| Revoked credential on a new connection or reused HTTP/2 connection | Requests starting after the 5-second revocation window are denied. |
| Certificate expires while its connection is open | Subsequent requests are denied. |
| Client CA removed or authorization state unavailable | Admin access fails closed, including existing connections. |
| Attempted session resumption | No resumed session is accepted in v1. |
| `/api/admin/**` through the public hostname, loopback public listener, or Tunnel; forged certificate headers and alternate path encodings | No admin handler is reachable, regardless of supplied identity claims. |
| Wrong SNI/HTTP authority, direct-IP request, or unexpected IPv6 ingress | Rejected or unreachable; no alternate admin route. |
| Cross-site/sibling-origin write, missing/wrong/expired CSRF token, simple form POST, or missing/null Origin | No state change; same-origin authorized writes still work. |
| Browser rejects the server certificate | Fix issuance/trust; never require clicking through a warning. |
| Key unplugged after connection establishment | UI/runbook accurately explains continued-connection behavior; revocation still works. |
| Primary lost, then all client keys lost | Spare and operator-recovery drills succeed without weakening authentication. |
| Oversized upload, slow handshake, abusive connection burst, or audit-log flood | Configured limits apply; no authentication bypass or unbounded resource growth. |
| Production certificate/key inspection and repository secret scan | No production CA signing key or client private key on the server, in assets, git, CI, or logs; only the server's own private key is deployed there. |

Acceptance requires both automated negative tests and a recorded manual test on
the owner's actual primary and recovery hardware/browser combinations. Do not
claim production readiness from software-client fixtures alone.

## 11. Decisions to close before deployment

- Actual YubiKey models, PIV capabilities, browser/OS support, and chosen
  PIN/touch policies. Mobile support is not assumed.
- Publicly trusted versus private server CA, issuance tooling, and renewal/trust
  distribution workflow. Public server trust and private client trust remain
  separate either way.
- Whether the admin listener shares the public API VPS or uses a separate host
  to reduce the shared denial-of-service/failure domain.
- Offline CA storage/backup, trusted operator recovery access, and the tested
  credential/CA rotation runbooks.
- Confirmation of proposed lifetime, warning, and revocation targets, plus
  concrete timeout, concurrency, upload, and log-retention limits.
- Whether attestation verification or a later independently designed 1Password
  credential path is worth extending the scope. Neither blocks the v1 lab.

## 12. Primary references

1. [Go `crypto/tls`: client authentication, trust configuration, verification callbacks, and session tickets](https://pkg.go.dev/crypto/tls).
2. [Go `crypto/x509`: certificate verification and extended key usage](https://pkg.go.dev/crypto/x509).
3. [Cloudflare DNS proxy use cases: TLS termination and client-certificate limitations](https://developers.cloudflare.com/dns/proxy-status/use-cases/).
4. [YubiKey PIV technical manual: capabilities, PIN/touch policies, and attestation](https://docs.yubico.com/hardware/yubikey/yk-tech-manual/yk5-apps-piv.html).
5. [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
6. [Let's Encrypt challenge types: DNS-01](https://letsencrypt.org/docs/challenge-types/#dns-01-challenge).
7. [Cloudflare Universal SSL limitations](https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/).
8. [Cloudflare Origin CA: purpose and browser-trust limitations](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/).
