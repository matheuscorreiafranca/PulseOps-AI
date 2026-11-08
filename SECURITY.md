# Segurança

- JWT/cookie `httpOnly`, RBAC e autorização em cada rota sensível.
- CORS restrito, Helmet, payload de 1 MiB e rate limit global/específico.
- Zod para entradas, tools e saída final da IA.
- Tool allowlist sem shell, SQL arbitrário, filesystem ou URLs livres.
- Conteúdo de incidente é não confiável; tentativas comuns de prompt injection são neutralizadas.
- Logs JSON com redaction de cookies, authorization, senhas e chave OpenAI.
- Request ID, correlation ID e auditoria de decisões.
- OpenAI `store: false`, timeout, cancelamento e retry limitado.

Em produção use TLS, secret manager, rotação de chaves, SSO/MFA, CSRF adicional, retenção, WAF e SIEM. Credenciais deste projeto são somente demo.
