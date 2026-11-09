# Design de IA

## Contrato do provider

`LLMProvider.investigate()` devolve `AsyncGenerator<StreamEvent>`. O domínio HTTP conhece apenas esse port; Demo e OpenAI precisam emitir os mesmos eventos e respeitar o mesmo `analysisSchema`.

O contexto inclui incidente, pergunta, `AbortSignal`, correlation ID e um `ToolExecutor` injetado. O provider nunca recebe conexão de banco, shell ou filesystem.

## Demo provider

O Demo Mode não envia eventos decorativos: ele chama o executor real das tools com argumentos validados. A diferença está somente na seleção determinística das tools e na composição determinística da análise. Isso permite testar o pipeline inteiro sem custo externo.

## OpenAI provider

1. cria uma resposta com functions estritas;
2. valida o nome contra `toolNameSchema`;
3. valida argumentos com o schema Zod específico;
4. executa a tool controlada;
5. devolve `function_call_output` pelo `call_id` correto;
6. solicita a análise final com JSON Schema estrito;
7. revalida o JSON com Zod.

O provider configura `store: false`, timeout, retry limitado e cancelamento. Saídas inválidas não chegam ao frontend.

## Fronteira de tools

Cada tool possui:

- nome em enum/allowlist;
- descrição objetiva;
- input Zod;
- JSON Schema para o provider real;
- timeout de execução;
- limite de resultados;
- resultado resumido;
- audit event com ator/correlation ID.

Não existem parâmetros como `command`, `sql`, `url` ou `path`. `propose_remediation` sempre devolve `executable: false`; `simulate_remediation` não altera estado.

## RAG

Runbooks Markdown possuem ID, título, versão, serviço e categoria. No Demo Mode, a busca usa similaridade lexical determinística com limiar mínimo. O resultado normalizado inclui:

```ts
{
  id: string; // documento + chunk
  document: string;
  excerpt: string;
  version: string;
  similarity: number;
}
```

A migration instala pgvector, cria `vector(1536)` e índice HNSW. Um provider de embeddings externo não é acionado por testes. Se nenhuma fonte atingir o limiar, a tool declara evidência insuficiente.

## Prompt injection

- mensagens, logs e documentos são descritos como dados não confiáveis;
- texto recuperado nunca autoriza tools;
- seleção final passa por allowlist e validação, independentemente do modelo;
- tools mutáveis não existem;
- a resposta mostra evidências, não chain of thought;
- custo e quantidade de calls são limitáveis no orquestrador.

## Structured Output

O contrato final contém resumo, severidade, causas, evidências favoráveis/contrárias, próximos passos, ações, fontes, confiança, limitações e necessidade de aprovação. JSON Schema reduz variação no provider; Zod é a autoridade na fronteira da aplicação.

## Avaliação

`pnpm eval` executa cenários conhecidos e verifica schema, tools autorizadas, citações e aprovação humana. O relatório é um artefato local e não pretende medir qualidade universal de modelos.
