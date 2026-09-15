# Security

Do not put credentials, private provider records or visitor data in this repository. Everything in a deployed static artifact is public. `.gitignore` is not a secret scanner and cannot undo a prior disclosure.

Report a suspected vulnerability privately to the repository's maintainers using private vulnerability reporting when enabled. Otherwise use an established private maintainer contact channel; do not open a public issue containing exploit details or secrets. Operators' public correction addresses are for directory facts, not automatically the software security contact. Do not assume a reporting feature is enabled without checking.

Include affected versions, a minimal reproduction, impact and relevant configuration with sensitive values removed. Do not test against other communities without permission. A maintainer should acknowledge, assess and coordinate a fix before disclosure; no unsupported response-time guarantee is implied.

Security review covers schema/runtime validation, HTML/JSON-LD escaping, URL handling, local assets, CSP, host response headers, optional analytics and offline data/cache compatibility. Review dependency updates and run the full check after changes. Production hosts must apply the generated policies and avoid injected third-party scripts.

For a leaked credential, revoke it through the owning system and remove the disclosure before publication. For incorrect or sensitive public data, stop its distribution and issue corrected data; previously downloaded offline copies cannot be remotely recalled reliably.
