// app/api/omr-claude/route.ts
// ⚠️  API INATIVA — para ativar:
// 1. Configure ANTHROPIC_API_KEY no .env.local e no Vercel
// 2. No omr-engine.ts, descomente MotorClaudeVision
// 3. Em getMotorAtivo(), troque para: return new MotorClaudeVision()

import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { imagemBase64, totalQuestoes } = await req.json()

    if (!imagemBase64 || !totalQuestoes) {
      return NextResponse.json({ erro: 'imagemBase64 e totalQuestoes obrigatórios' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ erro: 'ANTHROPIC_API_KEY não configurada' }, { status: 500 })
    }

    const prompt = `Você está analisando uma folha de respostas de prova escolar.

A folha tem uma grade com ${totalQuestoes} questões numeradas de 1 a ${totalQuestoes}.
Cada questão tem 5 bolhas: A, B, C, D, E.
O aluno preencheu/marcou UMA bolha por questão.

Analise a imagem e retorne APENAS um JSON válido, sem nenhum texto adicional, no formato:
[
  {"questao": 1, "alternativa": "C", "confianca": 0.95},
  {"questao": 2, "alternativa": "A", "confianca": 0.90},
  ...
]

Regras:
- "alternativa" deve ser A, B, C, D ou E
- Se a bolha estiver claramente marcada/preenchida, "confianca" >= 0.8
- Se não conseguir identificar, use "alternativa": null e "confianca": 0
- Retorne TODAS as ${totalQuestoes} questões, mesmo as não respondidas
- Retorne SOMENTE o array JSON, sem markdown, sem explicação`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imagemBase64,
                },
              },
              {
                type: 'text',
                text: prompt,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message ?? 'Erro na API Claude')
    }

    const data = await response.json()
    const textoResposta = data.content?.[0]?.text ?? ''

    // Parse do JSON retornado pelo Claude
    const jsonLimpo = textoResposta.replace(/```json|```/g, '').trim()
    const respostas = JSON.parse(jsonLimpo)

    if (!Array.isArray(respostas)) {
      throw new Error('Resposta inválida do Claude')
    }

    return NextResponse.json(respostas)
  } catch (error) {
    console.error('Erro OMR Claude:', error)
    return NextResponse.json(
      { erro: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}