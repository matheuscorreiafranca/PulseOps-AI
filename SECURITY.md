# Segurança

## Threat model resumido

| Ameaça                  | Impacto                 | Controle                                                            |
| ----------------------- | ----------------------- | ------------------------------------------------------------------- |
| credential stuffing     | acesso indevido         | bcrypt, resposta genérica e rate limit de login                     |
| privilege escalation    | mutação por viewer      | RBAC no backend em cada rota                                        |
| prompt injection        | tool/ação indevida      | conteúdo não confiável, allowlist e schemas independentes do modelo |
| tool argument abuse     | consultas amplas/custo  | limites Zod, timeout e top-k                                        |
| secret leakage          | exposição em logs       | redaction Pino e chave somente server-side                          |
| arbitrary execution     | comprometimento do host | nenhuma tool de shell, SQL, URL ou filesystem                       |
| unsafe remediation      | indisponibilidade/dados | proposta não executável + decisão humana auditada                   |
| invalid model output    | corrupção de UI/domínio | JSON Schema + Zod antes da resposta final                           |
| replay/duplicate events | estado visual incorreto | IDs de SSE e deduplicação no cliente                                |
| dependency outage       | falha silenciosa        | health detalhado e `503` para PostgreSQL obrigatório indisponível   |

## Autenticação

- senhas com bcrypt cost 12;
- JWT com expiração de oito horas;
- cookie `httpOnly`, `sameSite=lax` e `secure` em produção;
- `SESSION_SECRET` de desenvolvimento é rejeitado quando `NODE_ENV=production`;
- erros de login não indicam se o e-mail existe.

## Autorização

`viewer < operator < admin`. O frontend adapta navegação, mas a decisão real é sempre do `requireRole` na API. A investigação e decisões de remediação exigem `operator`; auditoria e observabilidade administrativa exigem `admin`.

## Proteção da camada de IA

O modelo pode sugerir uma tool, mas não pode criar tools ou executar o resultado diretamente. Nome e argumentos atravessam enum + Zod. Resultados são limitados e resumidos; remediações são objetos de proposta/simulação.

## Logging e dados

Authorization, cookies, senhas e `OPENAI_API_KEY` são redigidos. Logs e auditoria usam request/correlation ID. O projeto não contém dados pessoais ou corporativos reais.

## Produção

Antes de uso real seriam necessários TLS/edge proxy, secret manager, rotação/revogação de sessão, CSRF token adicional, SSO/MFA, políticas de retenção, backups, SAST/DAST, SBOM, WAF e SIEM.

## Reporte

Não abra issue pública contendo uma credencial ou vulnerabilidade explorável. Revogue qualquer credencial exposta antes de investigar e compartilhe somente uma reprodução sanitizada.
