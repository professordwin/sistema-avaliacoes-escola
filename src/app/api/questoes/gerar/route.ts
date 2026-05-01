import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { tema, disciplina, nivel, quantidade } = await request.json()

  const prompt = `Você é um professor brasileiro experiente do Ensino Médio.
Gere ${quantidade || 3} questões de múltipla escolha sobre: "${tema}" para a disciplina de ${disciplina}.
Nível de dificuldade: ${nivel || 'médio'}.

REGRAS OBRIGATÓRIAS:
- Cada questão deve ter exatamente 5 alternativas (A, B, C, D, E)
- Apenas UMA alternativa correta por questão
- As alternativas incorretas devem ser plausíveis
- Linguagem clara e adequada ao Ensino Médio brasileiro
- Baseie-se no estilo ENEM/vestibulares conceituados

Responda APENAS com JSON válido, sem texto adicional, no formato:
[
  {
    "enunciado": "texto da questão",
    "nivel_dificuldade": "facil|medio|dificil",
    "alternativas": [
      {"letra": "A", "texto": "texto", "correta": false},
      {"letra": "B", "texto": "texto", "correta": true},
      {"letra": "C", "texto": "texto", "correta": false},
      {"letra": "D", "texto": "texto", "correta": false},
      {"letra": "E", "texto": "texto", "correta": false}
    ]
  }
]`

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  })

  const data = await response.json()
  const texto = data.choices?.[0]?.message?.content ?? ''

  try {
    const clean = texto.replace(/```json|```/g, '').trim()
    const questoes = JSON.parse(clean)
    return NextResponse.json(questoes)
  } catch {
    return NextResponse.json({ error: 'Erro ao interpretar resposta da IA', raw: texto }, { status: 500 })
  }
}