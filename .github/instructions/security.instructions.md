---
applyTo: "**/.env*,**/*secret*,**/*credential*,**/*token*,**/auth*"
---

# Security-Sensitive File Rules

- NEVER commit secrets, API keys, tokens, or passwords to source control
- Use environment variables or VS Code SecretStorage for sensitive values
- `.env` files must be in `.gitignore`
- Review all changes to auth files for: broken access control, privilege escalation, token leakage
- Passwords must be hashed (bcrypt/argon2), never stored in plaintext
- API keys in config should use placeholder values: `your-api-key-here`
- Validate and sanitize ALL user input — SQL injection, XSS, command injection
- HTTPS only for external API calls
- Check OWASP Top 10 for any security-sensitive file changes
