O que está faltando — item por item, com impacto direto

1. Recuperação de evidências (RAG) antes da geração

Impacto: o LLM “chuta” tópicos comuns ao invés de consolidar o que fontes acadêmicas e ementas realmente cobrem.

O que implementar: para cada requisição, recupere 3–6 trechos (capítulos, ementas, sumários) de Perplexity e entregue esses trechos ao LLM para fundamentar a geração (e registrar as fontes no JSON).

2. Grafo de tópicos / taxonomia com pré-requisitos

Impacto: sequência pedagógica frágil; tópicos grandes agrupados de forma aleatória.

O que implementar: uma ontologia simples (vetores → momento → DCL → reações → tensões) com dependências. Use para orientar seleção e ordenação de módulos.

3. Granularidade e regras de divisão de módulos

Impacto: módulos amplos demais (ex.: “Análise de Estruturas” cobre treliças, apoios, tensões) que não explicam subcapítulos.

O que implementar: políticas (ex.: módulo ≈ 45–120 min; subtopic ≈ 1–3 outcomes; não mais que 4 subtopics por módulo). Forçar o LLM a quebrar grandes blocos.

4. Prompt pedagógico especializado e contexto detalhado

Impacto: instruções insuficientes ao LLM; ele cria títulos genéricos.

O que implementar: prompt que inclui (a) nível do usuário, (b) objetivos de aprendizagem (outcomes), (c) exemplos de títulos aceitáveis e inaceitáveis, (d) estilo (português técnico, porém didático), (e) formato de saída estrito. Incluir trechos de evidência no prompt.

5. Seleção e ranqueamento de recursos por confiabilidade

Impacto: o sistema não recomenda fontes específicas para cada subtopic (ou recomenda genéricas).

O que implementar: regra de priorização: livro-texto > ementa universitária > apostila > vídeo; atribuir score e anexar nos evidence.

6. Checks automáticos de cobertura e coerência pedagógica

Impacto: falta de critérios que dizem quando o syllabus está “completo o suficiente”.

O que implementar: validações pós-geração:

Cobertura mínima de outcomes (p.ex. se objetivo inclui “momentos 3D”, módulo correspondente existe).

Topological check de pré-requisitos.

Número de módulos dentro do max_modules.

7. Confiança / provenance / explainability

Impacto: usuário não sabe por que o tópico está ali; difícil revisar.

O que implementar: para cada módulo, confidence_score + lista de 1–3 evidence com snippet + URL.

8. Gerador de exercícios e exemplos específicos

Impacto: syllabus frio, sem aplicação prática; AiCoursify adiciona exercícios/exemplos práticos.

O que implementar: templates de exercícios por tipo de tópico (moment, DCL, reações) e pedir ao LLM 1 exemplo resolvido por módulo (verificado ou marcado para revisão).

9. Human-in-the-loop para conteúdos críticos

Impacto: erros não detectados (e LLM pode inventar).

O que implementar: workflow de revisão humana quando confidence_score < threshold ou módulo toca normas/segurança.

10. Diagnóstico inicial e personalização

Impacto: syllabus genérico — AiCoursify adapta ao perfil/tempo do usuário.

O que implementar: usa as respostas do formulário (nível, tempo por sessão) para:

modularizar o syllabus (fast-track vs full-track),

ajustar estimated_time_minutes por módulo.

11. Prompt/version control e templates de saída

Impacto: inconsistência entre chamadas; difícil melhorar.

O que implementar: versionar o prompt, armazenar exemplos “golden” (ex.: o syllabus AiCoursify) e comparar outputs automaticamente.

Ordem de prioridade (o que fazer primeiro para ver impacto rápido)

1. Adicionar RAG com 3 trechos por tópico — maior impacto imediato.

2. Melhorar prompt pedagógico (incluir outcomes, estilo, exemplos e evidências).

3. Implementar grafo simples de pré-requisitos e usar para ordenar módulos.

4. Validação pós-geração: cobertura mínima + confidences.

5. Documentar sources e adicionar evidence em cada módulo.

6. Adicionar templates de exercícios e pedir 1 exercício resolvido por módulo (marcado para verificação).

7. Pipeline de revisão humana para confidence < 0.6.

8. Métricas e versão de prompt.