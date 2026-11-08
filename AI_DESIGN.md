# Design de IA

`LLMProvider` expõe `AsyncGenerator<StreamEvent>`. Demo e OpenAI obedecem ao mesmo contrato. O Demo provider emite tools, fontes, deltas e análise validada, permitindo testes sem custo.

O provider real usa Responses API e JSON Schema estrito. O backend revalida com Zod. Tools usam schemas limitados e não recebem primitives capazes de executar código. RAG inclui ID de chunk, documento, versão, trecho e score.

Não exibimos chain of thought. A UI mostra justificativas factuais: evidências, fontes, confiança, limitações e tools. Todas as ações exigem aprovação humana.
