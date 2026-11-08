---
tipo: ideia
estado: a-avaliar
criado: 2026-11-08
---
# Veredito da análise fundamentalista: separar qualidade de risco

**Problema:** em `computeVerdict` (`lib/fundamentalsMetrics.ts`), "Qualidade alta" exige `score >= 0.7` **e** `reds === 0`. Basta um vermelho, em qualquer métrica, para o veredito ficar em "Qualidade moderada". Com a NVDA a 8 nov 2026: 7 verdes, 1 laranja (EV/EBITDA) e 1 vermelho (Beta 2,35) dão score 0,78, mas o veredito fica em moderada só por causa do Beta. O Beta mede a volatilidade da ação, não a qualidade do negócio.
**Ideia:** duas leituras possíveis.
- *Manter:* a regra é conservadora de propósito e avisa do risco. Nesse caso, dizê-lo no texto do veredito (ex.: "moderada por causa do Beta").
- *Rever:* separar as métricas em qualidade (ROE, ROIC, margem, Dív./Capital, Receita/Emp.), avaliação (P/E, PEG, EV/EBITDA) e risco (Beta). O veredito passa a ser, por exemplo, "Qualidade alta · Volatilidade elevada". Decidir onde fica a Dív./Capital, que é risco de balanço e não de preço.
**Para quem:** quem usa a Análise para comparar ações. Hoje uma empresa de crescimento com Beta alto nunca chega a "alta".
**Esforço estimado:** pequeno no código (só `computeVerdict` e o cartão do veredito), mas precisa de build. O que leva tempo é a decisão de produto.

Para decidir: entra na 1.7.0 ou fica para depois. Não mexe nos limites de cada métrica, só na forma de os somar.

## Ligações
- [[02-Features/analise-fundamentalista]]
- [[04-Bugs/fundamentals-chaves-finnhub-erradas]]
