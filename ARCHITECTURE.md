# Arquitetura

O monorepo separa UI (`apps/web`), API/orquestração (`apps/api`), contratos Zod (`packages/contracts`), providers/tools (`packages/ai`) e configuração (`packages/config`). Contratos compartilhados evitam divergência entre SSE, backend e frontend.

O domínio não confia na LLM: o registry resolve apenas nomes allowlisted, valida argumentos e resume resultados. Mutação vira proposta; decisão humana passa por rota RBAC e gera auditoria. PostgreSQL é a fonte persistente, pgvector atende similaridade e Redis isola tarefas assíncronas.

Decisões: REST para recursos; SSE para fluxo unidirecional cancelável; Zod nas fronteiras; provider port para trocar LLM; Demo Mode para execução offline e testes determinísticos.
