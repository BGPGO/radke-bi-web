#!/usr/bin/env node
/**
 * Gera reports pré-escritos pra RADKE BI (sem chamar API Anthropic).
 * Análises escritas pela engine Claude direto, baseadas nos dados reais
 * de data.js. Saída: report.json + report-2026-{MM}.json (jan-mai).
 */
'use strict';
const fs = require('fs');

const NOW = new Date('2026-05-05T01:36:00-03:00').toISOString();
const empresa = 'RADKE SOLUÇÕES INSTRALOGISTICAS';

const REPORTS = {
  // === YTD 2026 ===
  'report.json': {
    generated_at: NOW,
    empresa,
    periodo: 'Ano 2026 (YTD) — Realizado',
    secoes: {
      visao_geral: {
        title: 'Visão Geral',
        analysis:
          'O acumulado de 2026 até abril/maio fecha com receita realizada de R$ 2.589.892 e despesa de R$ 2.531.934, gerando resultado líquido positivo de apenas R$ 57.958, equivalente a margem líquida de 2,24%. O comportamento mensal é volátil: janeiro fechou no vermelho com -R$ 149 mil, fevereiro reagiu com +R$ 197 mil, março manteve a recuperação em +R$ 200 mil, mas abril voltou ao prejuízo com -R$ 161 mil. A operação está rodando no limite, com ciclos curtos de geração e consumo de caixa.\n\nO ponto mais sensível é a estrutura a vencer: há R$ 529 mil a receber contra R$ 2,26 milhões a pagar. Esse descasamento de 4,3x exige gestão ativa de cobrança, antecipação de recebíveis ou renegociação de prazos com fornecedores nas próximas semanas. Sem ação corretiva, a queima de caixa de abril pode se repetir e comprometer o capital de giro até o final do segundo trimestre.',
      },
      receita: {
        title: 'Receita',
        analysis:
          'A receita realizada YTD soma R$ 2.589.892, dominada por "Venda — Mercadoria Fabricadas" (R$ 1.765.081, 68% do total) seguida pelos serviços de Restauração (R$ 380.097), Serralheria (R$ 365.175) e Instalação (R$ 54.032). O mix mostra que o negócio é primariamente industrial (fabricação) com camada complementar de serviços técnicos. A FITESA (Cosmópolis) responde por R$ 1.075.799 sozinha, ou 41,5% da receita total — concentração que amplifica o risco se essa conta sofrer atraso ou redução.\n\nNa fila de a-receber estão R$ 529.638 ainda não recebidos, sendo R$ 266 mil concentrados em abril (sinal positivo de receita recente que entrará em maio/junho). Recomenda-se priorizar a cobrança proativa dos R$ 529 mil pendentes e ampliar a base de clientes top com participação acima de R$ 100 mil para reduzir a dependência da FITESA, que hoje representa risco de concentração elevado.',
      },
      despesa: {
        title: 'Despesa',
        analysis:
          'As despesas realizadas YTD totalizam R$ 2.531.934, com "Compras de Matéria Prima" liderando (R$ 582.682, 23%), seguida por Benefícios LD (R$ 233.219), Industrialização Terceirizada (R$ 228.244), Adiantamento de Lucros ao sócio Diogo (R$ 132.280) e IRPJ (R$ 105.900). A carga tributária com Receita Federal somando R$ 299.736 representa 11,8% das saídas — patamar elevado que merece revisão de regime tributário e análise de elegibilidade a benefícios fiscais setoriais.\n\nO mês de abril foi atípico: R$ 838 mil em despesas (maior do ano), puxado por R$ 274 mil em Matéria Prima — possivelmente reposição de estoque após a aceleração de março. Há R$ 2,26 milhões em despesas a pagar nos próximos meses, com maio já registrando R$ 486 mil de saídas previstas mesmo sem qualquer receita realizada ainda. A gestão de fluxo precisa equacionar essa pressão antes que se converta em atrasos com fornecedores ou tributos.',
      },
      fluxo: {
        title: 'Fluxo de Caixa',
        analysis:
          'O fluxo mensal de 2026 mostra comportamento de "serra": janeiro fechou em -R$ 149 mil, fevereiro reagiu para +R$ 197 mil, março consolidou em +R$ 200 mil, abril mergulhou para -R$ 161 mil. O acumulado YTD é apenas +R$ 57.958, ou seja, todo o ganho de fev+mar foi quase totalmente apagado pelos prejuízos de jan+abr. Maio, com receita ainda zerada e despesas iniciais de R$ 29 mil, indica que o mês começa pressionado.\n\nA leitura estratégica é que a empresa precisa transformar pelo menos dois dos próximos quatro meses em superávit acima de R$ 200 mil para fechar o ano com margem operacional saudável (acima de 8%). O padrão histórico sugere que isso é viável, dado que março entregou +R$ 200 mil. O foco deve ser converter o pipeline de a-receber em caixa rápido e segurar despesas variáveis (matéria-prima, terceirização) durante meses de receita mais baixa.',
      },
      tesouraria: {
        title: 'Tesouraria',
        analysis:
          'A posição de tesouraria atual é apertada porém manejável: saldo bancário consolidado de R$ 1.593.977 (Sicredi + Sicoob + Santander + BTG) cobre o caixa imediato. Recebido YTD R$ 2,59 milhões / Pago R$ 2,53 milhões — saldo operacional próximo do equilíbrio. Os R$ 529 mil a receber representam reforço de caixa para os próximos 30-60 dias, enquanto os R$ 2,26 milhões a pagar exigem distribuição cuidadosa nos meses seguintes para não pressionar o saldo bancário.\n\nA projeção saldo + a-receber − a-pagar indica trajetória de queda gradual se a empresa não acelerar a entrada de novas receitas. Recomenda-se criar política de antecipação de recebíveis para clientes top (FITESA, PRIMA SOLE, BERTOLINI), priorizar pagamentos por relevância estratégica e manter monitoramento semanal do saldo consolidado dos 3 bancos prioritários (Santander, Sicredi, Sicoob).',
      },
      comparativo: {
        title: 'Comparativo entre Períodos',
        analysis:
          'Comparando o primeiro trimestre (jan-mar) com o segundo trimestre parcial (abr) de 2026: o T1 fechou com receita de R$ 1.912.498 e resultado líquido de +R$ 247.998 (margem 13%). Abril sozinho — primeiro mês do T2 — entregou receita de R$ 677.394 mas com despesas de R$ 838.106, gerando -R$ 160.712 e puxando a margem YTD para baixo. O contraste evidencia que abril foi um mês de investimento operacional (pico em compras de matéria prima de R$ 274 mil) que ainda não converteu em receita.\n\nA expectativa é que esse investimento se materialize em receita nos meses seguintes (maio-junho). Se isso não ocorrer no prazo, o resultado consolidado do semestre pode fechar próximo do break-even. Métricas a monitorar: conversão da matéria prima de abril em produto faturado em maio/junho, e confirmação de que os R$ 266 mil a receber gerados em abril entrarão no caixa antes do fim de maio.',
      },
      conclusao: {
        title: 'Conclusão e Recomendações',
        analysis:
          'A RADKE encerrou o quadrimestre com resultado próximo do break-even (margem 2,2%) em meio a alta volatilidade mensal — janeiro e abril foram negativos enquanto fevereiro e março compensaram. A operação demonstra capacidade de gerar margem em meses bons, mas o desafio é manter consistência. A concentração de 41,5% da receita na FITESA e o desbalanceamento entre R$ 529 mil a receber × R$ 2,26 milhões a pagar são os dois principais focos de atenção estratégica.\n\nRecomendações: (1) implementar gestão semanal de cobrança dos R$ 529 mil pendentes, com meta de reduzir o saldo a 50% até o fim de maio; (2) diversificar a carteira de clientes ampliando a participação de PRIMA SOLE, BERTOLINI e ZAFFARI para cada um superar R$ 50 mil/mês recorrente; (3) revisar a carga tributária junto a contador especializado dado os R$ 300 mil em Receita Federal — possíveis ganhos com mudança de regime ou créditos não aproveitados.',
      },
    },
  },

  // === Janeiro 2026 ===
  'report-2026-01.json': {
    generated_at: NOW,
    empresa,
    periodo: 'Janeiro de 2026 — Realizado',
    secoes: {
      visao_geral: {
        title: 'Visão Geral',
        analysis:
          'Janeiro fechou no vermelho: R$ 439.775 de receita realizada contra R$ 588.948 de despesas, totalizando prejuízo de R$ 149.173 e margem líquida de -33,9%. É um início de ano pressionado, típico de empresas industriais com sazonalidade — janeiro tradicionalmente concentra férias coletivas, paradas técnicas e baixa demanda. O mix de receita do mês foi atípico: serviços (Restauração R$ 199 mil + Serralheria R$ 61 mil + Engenharia menor) representaram 60% da receita, enquanto a venda de mercadoria caiu para apenas R$ 170.586 — bem abaixo da média mensal anual de R$ 441 mil.\n\nA boa notícia é que praticamente não havia ainda contas a vencer relevantes (R$ 19 mil a pagar, sem nada a receber). Isso sugere que a empresa entrou no ano com posição de caixa relativamente limpa, sem arrastar dívidas operacionais do exercício anterior. Janeiro funcionou como um mês de recomposição, com despesas necessárias para sustentar a operação enquanto a receita ainda não acelera.',
      },
      receita: {
        title: 'Receita',
        analysis:
          'Receita realizada de R$ 439.775 em janeiro, com destaque para Serviços de Restauração (R$ 199.084) liderando o mix — comportamento incomum frente ao padrão anual onde a fabricação domina. Esse pico em restauração indica que a empresa fechou um contrato relevante de manutenção/reforma no início do ano, possivelmente serviço pós-feriado que clientes priorizam quando reabrem operação. Cliente principal foi a CIA Zaffari (Loja 08 — Ipiranga) com R$ 136.689, sugerindo trabalho de adequação ou expansão na rede de supermercados.\n\nA categoria Venda de Mercadoria caiu para R$ 170.586, cerca de 1/3 da média mensal vista em fev-abr. Esse padrão indica que a fábrica operou em ritmo reduzido em janeiro — coerente com retomada gradual após férias coletivas. Não há receita a receber pendente do mês, sinal de boa pontualidade dos clientes neste período.',
      },
      despesa: {
        title: 'Despesa',
        analysis:
          'Despesa de R$ 588.948 em janeiro, puxada por Compras de Matéria Prima (R$ 87.456), Industrialização por Terceiros (R$ 76.768) e Benefícios LD (R$ 54.200). O fornecedor que mais consumiu caixa foi a Receita Federal com R$ 57.963 — antecipações de tributos do início do exercício. O peso dos benefícios trabalhistas (LD) sugere encargos de férias e 13º proporcional ainda sendo quitados em janeiro, comum em empresas que adotam pagamento dividido.\n\nA combinação despesa-pesada-receita-leve gerou o pior resultado mensal de 2026 até agora. Apenas R$ 19 mil ficaram a pagar para o futuro — sinal de que a empresa pagou em dia, evitando juros e mantendo crédito limpo. Estrategicamente, manter essa disciplina é positivo, mas o impacto no caixa do mês foi severo.',
      },
      fluxo: {
        title: 'Fluxo de Caixa',
        analysis:
          'Janeiro registrou fluxo líquido negativo de R$ 149.173, exigindo consumo do saldo bancário para cobrir o gap. Entrada total R$ 439.775, saída R$ 588.948 — relação saída/entrada de 1,34, ou seja, para cada R$ 1 de receita houve R$ 1,34 de despesa. É o tipo de mês em que a tesouraria sustenta a operação esperando a recuperação posterior.\n\nO fato de fevereiro e março terem revertido com +R$ 197 mil e +R$ 200 mil mostra que o consumo de caixa de janeiro foi reposto rapidamente. Para o futuro, vale considerar política de provisionamento: reservar mensalmente uma fatia da margem dos meses bons para cobrir pelo menos 1,5 mês de operação no caixa, garantindo travessia tranquila de janeiros futuros.',
      },
      tesouraria: {
        title: 'Tesouraria',
        analysis:
          'A posição de tesouraria em janeiro foi pressionada pelo déficit de R$ 149 mil. Com R$ 439.775 recebidos e R$ 588.948 pagos, a empresa precisou consumir saldo bancário acumulado do exercício anterior. Não havia recebíveis pendentes do mês (R$ 0 a receber) e apenas R$ 19 mil a pagar deslizou para o mês seguinte — o que indica disciplina de pagamento mas também intensa pressão de caixa imediato.\n\nA recomendação para janeiros futuros é manter saldo mínimo de tesouraria equivalente a 1,5x a despesa média mensal (≈ R$ 950 mil) antes de entrar no mês, garantindo que a operação atravesse o início do ano sem stress. Acompanhar diariamente o saldo nos 3 bancos prioritários e evitar concentrar pagamentos grandes nas duas primeiras semanas do mês.',
      },
      comparativo: {
        title: 'Comparativo entre Períodos',
        analysis:
          'Janeiro vs. média dos demais meses do quadrimestre (fev-abr): a receita de janeiro (R$ 440 mil) ficou 35% abaixo da média (R$ 717 mil/mês), enquanto a despesa (R$ 589 mil) ficou apenas 5% abaixo da média (R$ 638 mil). O descompasso é claro — receita caiu muito mais que despesa, o que torna o resultado mensal extremamente sensível à sazonalidade do faturamento.\n\nEsse padrão sugere que a estrutura de custos da RADKE é majoritariamente fixa: salários, benefícios, terceirização e tributos respondem mesmo quando a fábrica está operando em ritmo reduzido. A cada 10% de queda de receita, a margem cai de forma desproporcional. Para mitigar esse efeito, vale avaliar contratos sazonais com terceirizados ou políticas de banco de horas/escala flexível.',
      },
      conclusao: {
        title: 'Conclusão e Recomendações',
        analysis:
          'Janeiro foi um mês de prejuízo esperado dentro da sazonalidade do setor industrial, com -R$ 149 mil de resultado líquido. A operação consumiu caixa para sustentar a estrutura fixa enquanto a receita não acelerava. A boa execução foi pagar em dia (apenas R$ 19 mil deslizou) e manter a base de clientes pontual (zero a-receber). A má notícia é o tamanho da estrutura de custos fixos — quase R$ 590 mil por mês.\n\nRecomendações para os próximos janeiros: (1) construir reserva técnica equivalente a 1,5x a despesa média mensal antes do encerramento do exercício anterior; (2) negociar com fornecedores estratégicos prazos mais flexíveis para janeiro/fevereiro; (3) avaliar viabilidade de receita complementar de menor margem mas alta liquidez (estoque pronto, serviços padronizados) que possa ser ativada nos primeiros 30 dias do ano.',
      },
    },
  },

  // === Fevereiro 2026 ===
  'report-2026-02.json': {
    generated_at: NOW,
    empresa,
    periodo: 'Fevereiro de 2026 — Realizado',
    secoes: {
      visao_geral: {
        title: 'Visão Geral',
        analysis:
          'Fevereiro foi o mês de virada: receita realizada de R$ 595.455 contra R$ 398.608 de despesas, gerando resultado líquido positivo de R$ 196.846 e margem de 33,1% — a melhor margem mensal do quadrimestre. O ritmo da fábrica voltou ao normal e a categoria de Venda de Mercadoria Fabricadas saltou de R$ 170 mil em janeiro para R$ 502 mil em fevereiro, recuperação de quase 200%. A FITESA reapareceu como maior cliente (R$ 329.233), confirmando que o contrato com a planta de Cosmópolis é a espinha dorsal do faturamento.\n\nO mês também trouxe disciplina nas despesas: queda de R$ 588 mil para R$ 398 mil em saídas (redução de 32%), o que junto com a recuperação da receita transformou janeiro -R$ 149 mil em fevereiro +R$ 197 mil — virada de R$ 346 mil em apenas um mês. Esse desempenho prova que a operação tem alavancagem positiva: quando a fábrica acelera, o resultado escala bem.',
      },
      receita: {
        title: 'Receita',
        analysis:
          'A receita de R$ 595.455 em fevereiro foi dominada por Venda de Mercadoria Fabricadas (R$ 502.320, 84% do total) — sinal claro de que a operação industrial retomou ritmo. Serviços de Serralheria (R$ 52.111) e Restauração (R$ 31.471) contribuíram com volumes menores, mas estáveis. A FITESA — Cosmópolis foi o cliente principal com R$ 329.233, ou 55% da receita do mês: continuou sendo o vetor que faz o mês ser bom ou ruim.\n\nDos R$ 595 mil faturados, apenas R$ 26 mil ficaram pendentes (R$ 26.211 a receber) — taxa de recebimento de 95,6%, excelente. Isso indica que os clientes top (FITESA principalmente) estão pagando em dia ou no curto prazo. O desafio estratégico de fevereiro foi positivo: o problema da empresa não é cobrar — é gerar volume. Quando há produção, há receita confirmada.',
      },
      despesa: {
        title: 'Despesa',
        analysis:
          'Despesa de R$ 398.608 em fevereiro, queda significativa de R$ 190 mil vs. janeiro. As principais saídas foram Compras de Matéria Prima (R$ 51.788), Benefícios LD (R$ 31.402) e Adiantamento de Lucros para o sócio Diogo (R$ 29.600). A redução nas compras de matéria prima — de R$ 87 mil em jan para R$ 52 mil em fev — sugere que a empresa entrou no mês com estoque suficiente, evitando reposição agressiva. A Receita Federal continuou cobrando R$ 56.782 (estável vs. janeiro), confirmando que tributos federais são despesa fixa mensal.\n\nApenas R$ 15 mil ficaram a pagar — pagamento ainda mais limpo que janeiro. Não há indícios de inadimplência ou descontrole nas saídas. A despesa de fevereiro reflete uma operação com produção rodando e estoque equilibrado, sem necessidade de injeções emergenciais de capital de giro.',
      },
      fluxo: {
        title: 'Fluxo de Caixa',
        analysis:
          'Fluxo líquido de +R$ 196.846 em fevereiro, com relação despesa/receita de apenas 0,67 — para cada R$ 1 que entrou, saíram R$ 0,67. Esse é o perfil saudável da operação RADKE quando a fábrica está em ritmo normal. A diferença de R$ 197 mil foi absorvida diretamente no saldo bancário, recompondo parte do que janeiro consumiu.\n\nO comportamento de fevereiro mostra que a empresa não tem problema estrutural de margem — quando a receita atinge o patamar de R$ 500-600 mil, a operação gera caixa relevante. O ponto a otimizar é a previsibilidade: se a empresa conseguir manter receita acima de R$ 500 mil por 9-10 meses do ano, o resultado anual fica acima de R$ 1,5 milhão líquido.',
      },
      tesouraria: {
        title: 'Tesouraria',
        analysis:
          'Fevereiro repôs caixa: entrada de R$ 595 mil contra saída de R$ 399 mil, com saldo positivo de R$ 197 mil sendo agregado à tesouraria. Os R$ 26 mil a receber pendentes representam apenas 4,4% do faturamento do mês — taxa de recebimento de 95,6%, indicando excelente disciplina dos clientes. Os R$ 15 mil a pagar para o futuro são valor irrelevante frente ao saldo bancário consolidado.\n\nFevereiro ofereceu janela ideal para reforçar a reserva técnica. O perfil do mês — receita alta + despesa controlada + recebimento rápido — é o que a empresa deve replicar nos próximos meses para construir colchão de tesouraria capaz de atravessar janeiros futuros sem stress operacional.',
      },
      comparativo: {
        title: 'Comparativo entre Períodos',
        analysis:
          'Fevereiro vs. janeiro: receita +35% (R$ 440k → R$ 595k), despesa -32% (R$ 589k → R$ 399k), resultado líquido virou de -R$ 149 mil para +R$ 197 mil — virada de R$ 346 mil em um único mês. A categoria Venda de Mercadoria Fabricadas explodiu (+195%, R$ 170k → R$ 502k) enquanto Serviços de Restauração caiu drasticamente (-84%, R$ 199k → R$ 31k).\n\nEssa rotação no mix de receita é informativa: a empresa parece operar em "modos" — em janeiro o foco foi serviços (manutenção, reforma) e em fevereiro voltou ao foco fabricação. Saber qual modo gera melhor margem ajuda no planejamento. Fevereiro, com fabricação dominante, entregou margem de 33% — significativamente melhor que a média anual de 2,2%. A pergunta estratégica é: como manter o mix dominado por fabricação por mais meses do ano?',
      },
      conclusao: {
        title: 'Conclusão e Recomendações',
        analysis:
          'Fevereiro provou que a operação tem capacidade de gerar margem robusta (33%) quando a fábrica opera em ritmo normal. O resultado +R$ 197 mil compensou parcialmente o prejuízo de janeiro e mostrou alavancagem operacional positiva: cada R$ 1 adicional de receita gerou aproximadamente R$ 0,55 de caixa. A FITESA continua sendo o vetor principal, com 55% da receita do mês — risco de concentração permanece.\n\nRecomendações: (1) replicar o padrão de fevereiro — receita acima de R$ 500 mil + despesa abaixo de R$ 450 mil — em meses pares; (2) usar parte do excedente para construir reserva técnica visando os meses fracos (janeiro 2027); (3) buscar segundo cliente capaz de gerar volume similar à FITESA, idealmente em segmento diferente (não automotivo) para reduzir correlação setorial.',
      },
    },
  },

  // === Março 2026 ===
  'report-2026-03.json': {
    generated_at: NOW,
    empresa,
    periodo: 'Março de 2026 — Realizado',
    secoes: {
      visao_geral: {
        title: 'Visão Geral',
        analysis:
          'Março foi o melhor mês de receita do quadrimestre: R$ 877.268 realizados, alta de 47% sobre fevereiro. Despesas também subiram para R$ 676.943 (+70% vs fev), absorvendo parte do ganho operacional. Resultado líquido de R$ 200.325 com margem de 22,8% — segunda melhor margem do ano e quase idêntico ao volume de fevereiro em valores absolutos. A operação confirma que tem ciclo de aceleração: cada mês entrega volume crescente até o pico de produção.\n\nA composição do mês mostra fábrica em ritmo intenso: Venda de Mercadoria Fabricadas a R$ 553.136, Serviços de Serralheria explodindo a R$ 204.044 (4x o nível de fevereiro), e ainda R$ 69.842 em Restauração. A FITESA continuou liderando com R$ 255.990, mas perdeu participação relativa (29% vs 55% em fev) — sinal positivo de diversificação dentro do mês.',
      },
      receita: {
        title: 'Receita',
        analysis:
          'Receita realizada de R$ 877.268 em março, com Venda de Mercadoria Fabricadas (R$ 553.136) e Serviços de Serralheria (R$ 204.044) puxando o desempenho. A multiplicação da receita de Serralheria — de R$ 52 mil em fevereiro para R$ 204 mil em março — sugere a entrega de um projeto grande de serralheria nesse mês, possivelmente cliente industrial com demanda de estruturas metálicas customizadas.\n\nA distribuição de clientes ficou mais saudável: FITESA com R$ 256 mil (29%), abrindo espaço para outros nomes contribuírem. Não há receita pendente do mês (R$ 0 a receber), confirmando que clientes top continuam pagando em dia ou no mesmo mês. Quando a empresa ativa serralheria pesada além da fabricação padrão, ela escala receita sem comprometer a qualidade do recebimento.',
      },
      despesa: {
        title: 'Despesa',
        analysis:
          'Despesa de R$ 676.943 em março, alta de 70% sobre fevereiro. Compras de Matéria Prima saltaram para R$ 146.400 (vs R$ 51 mil em fev) — coerente com o pico de produção. Industrialização Terceirizada subiu para R$ 87.922 e Benefícios LD para R$ 69.193, tudo proporcional ao volume produzido. A Receita Federal foi mais pesada: R$ 91.132 (vs R$ 56 mil em fev), provavelmente refletindo maior base de cálculo do faturamento de fevereiro.\n\nApenas R$ 32 mil ficaram a pagar, mantendo o padrão de pagamento disciplinado. A elevação proporcional das despesas com a receita mostra estrutura de custo variável bem dimensionada: a empresa gasta mais quando produz mais, o que é eficiente. O risco está nos custos fixos de meses fracos — quando produção cai, esses R$ 220-250 mil de Benefícios+Tributos+Salários permanecem.',
      },
      fluxo: {
        title: 'Fluxo de Caixa',
        analysis:
          'Fluxo líquido positivo de +R$ 200.325 em março, praticamente idêntico ao de fevereiro (+R$ 196 mil). Relação despesa/receita de 0,77 — pior que fevereiro (0,67) mas ainda saudável. Esse leve aperto de margem é o trade-off natural do crescimento: para escalar de R$ 595 mil para R$ 877 mil, a empresa absorveu mais matéria prima e terceirização, sacrificando 10 pontos de margem no mix.\n\nO cumulativo do trimestre fechou em +R$ 248 mil (jan -149 + fev +197 + mar +200), o que normalizado dá margem de 13% sobre R$ 1,9 milhão de receita. Se o segundo trimestre repetir esse perfil, a empresa fecha o semestre com aproximadamente R$ 500 mil de resultado líquido — patamar saudável. O alerta vem de abril, que mostrou que essa repetição não é automática.',
      },
      tesouraria: {
        title: 'Tesouraria',
        analysis:
          'Março continuou reforçando a tesouraria: +R$ 200 mil agregados ao saldo. Recebimento praticamente integral do mês (zero a receber pendente) e apenas R$ 32 mil deslizaram em despesas. A combinação de alto volume + recebimento rápido + pagamento disciplinado coloca a tesouraria em posição confortável ao final do primeiro trimestre.\n\nO saldo de tesouraria ao final de março — após sequência fev/mar de +R$ 397 mil acumulados — provavelmente atingiu o ponto mais alto do quadrimestre. Esse momento ideal seria oportunidade para investimentos estratégicos planejados ou para construir colchão maior. Recomenda-se monitorar o saldo bancário ao fim de março e usar essa visibilidade pra planejar abril/maio com mais segurança.',
      },
      comparativo: {
        title: 'Comparativo entre Períodos',
        analysis:
          'Março vs fevereiro: receita +47% (R$ 595k → R$ 877k), despesa +70% (R$ 399k → R$ 677k), resultado líquido praticamente igual (+R$ 197k → +R$ 200k). A elasticidade despesa/receita foi de 1,49 — para cada 1% de aumento na receita, a despesa subiu 1,49%. Isso explica por que a margem caiu de 33% para 23% mesmo com receita maior.\n\nEsse comportamento é típico de operação industrial em fase de aceleração: variáveis (matéria prima, terceirização) crescem mais rápido que receita por causa de buffers de estoque ou contratação de capacidade extra. O ideal seria buscar margem incremental: quando a receita escala, a margem por unidade deveria subir, não cair. Vale revisitar precificação dos novos contratos de serralheria que entraram em março — possivelmente foram contratados a margens mais apertadas para conquistar volume.',
      },
      conclusao: {
        title: 'Conclusão e Recomendações',
        analysis:
          'Março foi o segundo mês positivo consecutivo, fechando o T1 com +R$ 248 mil de resultado líquido sobre R$ 1,9 milhão de receita (margem 13%). A empresa demonstrou capacidade de escalar receita em quase 50% mês a mês quando há demanda. O ponto de atenção é que a margem caiu 10 pontos no processo, sinal de que crescimento desordenado pode comprometer o resultado.\n\nRecomendações: (1) revisar a estrutura de preços dos contratos de serralheria que entraram em março para garantir margem mínima de 25%; (2) avaliar se vale ampliar capacidade de produção interna para reduzir dependência de industrialização terceirizada (que custou R$ 88 mil só em março); (3) usar o caixa acumulado do T1 para investimentos planejados em vez de deixar parado em conta corrente — possível aplicação em CDB de liquidez diária ou fundos DI.',
      },
    },
  },

  // === Abril 2026 ===
  'report-2026-04.json': {
    generated_at: NOW,
    empresa,
    periodo: 'Abril de 2026 — Realizado',
    secoes: {
      visao_geral: {
        title: 'Visão Geral',
        analysis:
          'Abril quebrou a sequência positiva: receita realizada de R$ 677.394 contra R$ 838.106 de despesas, gerando prejuízo de R$ 160.712 e margem de -23,7%. A receita caiu 23% vs março (R$ 877k → R$ 677k) enquanto a despesa subiu 24% (R$ 677k → R$ 838k) — combinação que apagou todo o ganho operacional. O mês foi o pior do quadrimestre em resultado líquido, anulando praticamente o ganho de fevereiro.\n\nO que chama atenção é o salto em Compras de Matéria Prima: R$ 273.972 só em abril (47% das despesas do mês), mais que o dobro de março. Esse perfil sugere reposição agressiva de estoque ou início de produção para entregas de maio/junho. Se essa interpretação estiver correta, abril foi um mês de "investimento em pipeline futuro" disfarçado de prejuízo operacional. A FITESA recuperou protagonismo com R$ 490.576 — 72% da receita do mês.',
      },
      receita: {
        title: 'Receita',
        analysis:
          'Receita de R$ 677.394 em abril, queda de 23% sobre março. Venda de Mercadoria Fabricadas seguiu como principal categoria (R$ 539.039), mas Serviços de Serralheria desabaram para R$ 48.206 (-76% vs março). A Restauração subiu levemente para R$ 79.700. A leitura é que a empresa entregou os projetos pesados de Serralheria em março e abril voltou ao mix mais regular, dominado pela fabricação para clientes industriais.\n\nA FITESA explodiu para R$ 490.576 em abril — sua maior compra mensal do ano, representando 72% da receita do mês. Essa concentração é simultaneamente positiva (volume garantido) e arriscada (dependência crítica de uma conta). Vale registrar que dos R$ 530 mil de "a receber" do ano, R$ 266 mil foram gerados em abril — sinal de que parte dessa receita só será caixa em maio/junho.',
      },
      despesa: {
        title: 'Despesa',
        analysis:
          'Despesa de R$ 838.106 em abril, alta de 24% sobre março. O grande responsável foi Compras de Matéria Prima a R$ 273.972 — quase o dobro de março e 5x o volume de fevereiro. Esse padrão é típico de operação que está repondo estoque para atender pedidos confirmados de meses seguintes. Benefícios LD subiram para R$ 75.909 (vs R$ 69 mil em mar), Industrialização caiu para R$ 51.370 (vs R$ 88 mil), e a Receita Federal seguiu pesada com R$ 93.860.\n\nA queda na Industrialização Terceirizada combinada com salto na Matéria Prima sugere que a empresa internalizou parte da produção que antes era terceirizada — possivelmente decisão estratégica para capturar margem adicional. Apenas R$ 28 mil ficaram a pagar do mês, mantendo o padrão de pagamento disciplinado mesmo em mês de prejuízo.',
      },
      fluxo: {
        title: 'Fluxo de Caixa',
        analysis:
          'Fluxo líquido de -R$ 160.712 em abril — segundo pior do ano. Relação despesa/receita explodiu para 1,24, a pior do quadrimestre (jan foi 1,34). A combinação receita-em-queda + despesa-em-alta produz o cenário mais hostil para a tesouraria. O mês consumiu praticamente todo o ganho de fevereiro, deixando o cumulativo do quadrimestre em apenas +R$ 87 mil (jan-149 + fev+197 + mar+200 + abr-161 = +R$ 87 mil).\n\nSe o padrão "compra agressiva de matéria prima → produção subsequente → faturamento elevado" se confirmar, maio e junho devem entregar receitas significativamente acima de R$ 700 mil para "pagar de volta" o investimento de abril. Caso contrário, o quadrimestre pode fechar próximo do break-even apesar dos meses bons.',
      },
      tesouraria: {
        title: 'Tesouraria',
        analysis:
          'Abril foi mês de consumo intenso de caixa: -R$ 161 mil queimados, alimentando estoque. Os R$ 266 mil a receber gerados no mês representam reforço de tesouraria para os 30-60 dias seguintes — entrarão entre maio e junho. Os R$ 28 mil a pagar adiados são valor pequeno, sem stress imediato.\n\nO ponto crítico é a posição combinada: o empilhamento de a-pagar do quadrimestre (próximo de R$ 2,3 milhões) é dominado por meses futuros, mas a empresa precisará vencer essa fila com receita real. O saldo bancário ao final de abril provavelmente caiu da posição máxima de março, mas continua confortável (acima de R$ 1,5 milhão). Maio começa pressionado: zero receita realizada na primeira semana e R$ 486 mil em despesas previstas até o fim do mês.',
      },
      comparativo: {
        title: 'Comparativo entre Períodos',
        analysis:
          'Abril vs março: receita -23% (R$ 877k → R$ 677k), despesa +24% (R$ 677k → R$ 838k), resultado líquido inverteu de +R$ 200k para -R$ 161k — variação negativa de R$ 360 mil em um único mês. O efeito tesoura abriu drasticamente: enquanto a receita desinflou (volta ao patamar de fev), a despesa acelerou no maior compras de matéria prima do quadrimestre.\n\nComparando T1 fechado (jan-mar +R$ 248 mil) com T2 incipiente (abr -R$ 161 mil): o segundo trimestre começou no contrapé. Para o T2 manter o ritmo do T1, maio e junho precisam somar +R$ 409 mil entre os dois meses (~R$ 200 mil/mês). Isso é viável com base no histórico de fev/mar, mas exige que a matéria prima comprada em abril se converta em receita rápida.',
      },
      conclusao: {
        title: 'Conclusão e Recomendações',
        analysis:
          'Abril rompeu a sequência positiva com prejuízo de R$ 161 mil, puxado por compras agressivas de matéria prima (R$ 274 mil) que parecem ser preparação para entregas futuras. A FITESA dominou a receita do mês com 72% — concentração elevada amplifica o risco. O quadrimestre acumulado caiu para apenas +R$ 87 mil de resultado líquido, com margem YTD de 2,2%.\n\nRecomendações: (1) confirmar com a equipe operacional se a compra de matéria prima de abril já tem pedidos correspondentes — se sim, projetar maio/junho com receita acima de R$ 800 mil; (2) acompanhar a entrada dos R$ 266 mil a receber gerados em abril com cobrança ativa em maio; (3) avaliar se a internalização de produção (queda em industrialização terceirizada) está gerando margem positiva ou apenas trocou um custo por outro maior. (4) Diversificar receita: a participação da FITESA acima de 70% no mês é zona de alerta — se eles atrasam um pagamento ou reduzem volume, o impacto é direto e imediato.',
      },
    },
  },

  // === Maio 2026 ===
  'report-2026-05.json': {
    generated_at: NOW,
    empresa,
    periodo: 'Maio de 2026 — Realizado',
    secoes: {
      visao_geral: {
        title: 'Visão Geral',
        analysis:
          'Maio começou pressionado: até a data deste relatório (05/05) a receita realizada está em R$ 0 enquanto as despesas já somam R$ 29.329, resultando em -R$ 29.329 de resultado parcial. É natural ainda no início do mês — receitas costumam concentrar nos dias 15-30 quando as faturas vencem, enquanto despesas iniciais (matéria prima, salários da virada) entram nos primeiros dias. O retrato do mês ainda está incompleto.\n\nO que chama atenção é o pipeline confirmado: R$ 109.392 a receber e R$ 485.640 a pagar nos próximos dias. O desbalanceamento de 4,4x entre saídas e entradas previstas exige gestão ativa de tesouraria. Combinado com a queima de caixa de R$ 161 mil em abril, maio é o mês onde a disciplina financeira mais importa para evitar deterioração da posição bancária.',
      },
      receita: {
        title: 'Receita',
        analysis:
          'Receita realizada de R$ 0 até o momento (05/05) — situação típica do início do mês. Os R$ 109.392 a receber dão visibilidade parcial sobre o que entrará nos próximos 30 dias. Adicionalmente, parte dos R$ 266 mil a receber gerados em abril deve cair no caixa de maio, somando potencialmente R$ 250-300 mil em entradas confirmadas até o fim do mês.\n\nO desafio do mês não é cobrança — é geração: a empresa precisa ativar pedidos suficientes para superar R$ 600 mil em receita realizada em maio, equivalente à média dos meses bons. Com a matéria prima comprada em abril, a fábrica deve estar bem suprida para essa produção. Acompanhar nas próximas duas semanas o ritmo de entregas e emissão de notas fiscais é decisivo para avaliar se maio se posiciona como mês de recuperação ou de continuidade do prejuízo.',
      },
      despesa: {
        title: 'Despesa',
        analysis:
          'Despesa de R$ 29.329 nos primeiros dias de maio, com Compras de Matéria Prima a R$ 23.067 e Benefícios LD a R$ 2.514. O peso ainda baixo da matéria prima (vs R$ 274 mil de abril) sugere que a empresa de fato comprou estoque suficiente em abril para cobrir maio. Salários iniciais aparecem em R$ 1.830, valor parcial — o pagamento principal de folha cai tipicamente nos dias 5 ou 30.\n\nA fila de a-pagar de R$ 485.640 para o restante do mês inclui salários completos, benefícios, fornecedores e tributos. ArcelorMittal aparece como fornecedor crítico com R$ 8.228 já registrados — confirma a importância dessa relação para a cadeia produtiva da RADKE. A gestão de pagamentos no mês precisa priorizar tributos (não atraso) e fornecedores estratégicos antes de despesas com sócios ou benefícios variáveis.',
      },
      fluxo: {
        title: 'Fluxo de Caixa',
        analysis:
          'Maio começou com fluxo negativo de R$ 29.329 (sem receita ainda + despesas iniciais). Olhando para o mês completo projetado: se a empresa realizar R$ 600 mil de receita e mantiver despesa próxima da média (R$ 600 mil), o resultado mensal pode fechar próximo do break-even. Para entregar margem positiva, é preciso receita acima de R$ 700 mil — patamar visto em fev/mar/abr.\n\nO comportamento da matéria prima é o sinal mais útil: como as compras de abril foram pesadas, espera-se que maio tenha despesa de matéria prima abaixo da média (R$ 50-100 mil em vez dos R$ 200+ mil) — o que abre espaço para margem positiva mesmo com receita moderada. Acompanhar diariamente a relação entre receita acumulada e despesa acumulada é a métrica chave dos próximos 25 dias.',
      },
      tesouraria: {
        title: 'Tesouraria',
        analysis:
          'A tesouraria começa maio com saldo bancário consolidado de aproximadamente R$ 1,59 milhão (Sicredi + Sicoob + Santander + BTG). Esse saldo precisa atravessar o mês sustentando R$ 486 mil em pagamentos previstos antes que a receita compense. A R$ 109 mil a receber + ~R$ 250 mil esperados de abril deveriam reforçar o caixa em pelo menos R$ 350 mil até o fim do mês.\n\nProjeção realista: saldo final de maio entre R$ 1,3-1,5 milhão se o mês fechar em break-even, ou R$ 1,5-1,7 milhão se houver margem positiva de R$ 100-200 mil. Recomenda-se monitoramento diário do saldo nos 3 bancos prioritários e priorização de pagamentos por criticidade (tributos > fornecedores estratégicos > demais).',
      },
      comparativo: {
        title: 'Comparativo entre Períodos',
        analysis:
          'Maio (parcial até 05/05) vs janeiro (completo): janeiro fechou com -R$ 149 mil de prejuízo. Maio começa com perfil semelhante ao primeiro mês do ano em termos de despesa pesada vs receita ainda vazia. A diferença é que maio inicia com R$ 109 mil já em pipeline de a-receber, enquanto janeiro começou com zero. Isso oferece um colchão de visibilidade positiva.\n\nComparado a abril: o mês começa com despesa de matéria prima muito menor (R$ 23 mil vs R$ 274 mil em abril), o que indica que o esforço de compras já foi feito. Maio tem chance estrutural de fechar melhor que abril mesmo com receita similar, porque a despesa será significativamente mais leve. O cenário base é resultado líquido positivo entre R$ 50-150 mil.',
      },
      conclusao: {
        title: 'Conclusão e Recomendações',
        analysis:
          'Maio começa em -R$ 29 mil parciais, mas com perspectiva favorável: matéria prima já comprada em abril reduz pressão de despesa, R$ 109 mil em a-receber + cauda de abril dão visibilidade de entrada, e a fábrica deve estar suprida para acelerar produção. O cenário base é fechar o mês entre break-even e +R$ 150 mil de resultado.\n\nRecomendações para maio: (1) acelerar emissão de notas fiscais nas duas próximas semanas para garantir receita acima de R$ 600 mil até dia 25; (2) cobrar ativamente os R$ 109 mil a receber e parte dos R$ 266 mil de abril — meta de receber 70% até o fim do mês; (3) priorizar pagamento de tributos e fornecedores estratégicos (ArcelorMittal, Receita Federal) antes de despesas discricionárias; (4) monitorar diariamente o saldo bancário consolidado e ajustar agenda de pagamentos se o saldo cair abaixo de R$ 1,2 milhão.',
      },
    },
  },
};

const OUT_DIR = __dirname;
for (const [filename, content] of Object.entries(REPORTS)) {
  const path = require('path').join(OUT_DIR, filename);
  fs.writeFileSync(path, JSON.stringify(content, null, 2));
  console.log('  ' + filename + ' (' + (fs.statSync(path).size / 1024).toFixed(1) + ' KB)');
}
console.log('=== ' + Object.keys(REPORTS).length + ' reports gerados ===');
