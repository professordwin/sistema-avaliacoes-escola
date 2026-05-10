// lib/omr-processor.ts

export interface RespostaDetectada {
  questao: number
  alternativa: string | null
  confianca: number
}

export interface ResultadoOMR {
  respostas: RespostaDetectada[]
  totalQuestoes: number
  totalRespondidas: number
  imagemProcessada: boolean
  erro?: string
}

export interface GabaritoItem {
  questao: number
  alternativaCorreta: string
}

export interface ResultadoCorrecao {
  acertos: number
  erros: number
  naoRespondidas: number
  nota: number
  totalQuestoes: number
  detalhe: {
    questao: number
    respostaAluno: string | null
    respostaCorreta: string
    correto: boolean
  }[]
}

function normalizarAlternativa(texto: string): string | null {
  const t = texto.trim().toUpperCase()
  if (['A', 'B', 'C', 'D', 'E'].includes(t)) return t
  const match = t.match(/^[(\s]*([ABCDE])[)\s.]*$/)
  return match ? match[1] : null
}

export function processarRespostasVision(
  anotacoes: { description: string }[]
): RespostaDetectada[] {
  const respostas: RespostaDetectada[] = []
  const textoCompleto = anotacoes.map(a => a.description).join('\n')
  const linhas = textoCompleto.split('\n')

  for (const linha of linhas) {
    const match = linha.match(/^(\d{1,2})[.\s)]*\s*([ABCDE])\s*$/i)
    if (match) {
      const questao = parseInt(match[1])
      const alternativa = normalizarAlternativa(match[2])
      if (questao >= 1 && questao <= 50 && alternativa) {
        if (!respostas.find(r => r.questao === questao)) {
          respostas.push({ questao, alternativa, confianca: 0.9 })
        }
      }
    }
  }

  return respostas.sort((a, b) => a.questao - b.questao)
}

export function calcularNota(
  respostas: RespostaDetectada[],
  gabarito: GabaritoItem[],
  totalQuestoes: number,
  notaMaxima: number = 10
): ResultadoCorrecao {
  let acertos = 0
  let erros = 0
  let naoRespondidas = 0

  const detalhe = gabarito.map(g => {
    const resposta = respostas.find(r => r.questao === g.questao)
    const respostaAluno = resposta?.alternativa ?? null
    const correto = respostaAluno === g.alternativaCorreta

    if (!respostaAluno) naoRespondidas++
    else if (correto) acertos++
    else erros++

    return {
      questao: g.questao,
      respostaAluno,
      respostaCorreta: g.alternativaCorreta,
      correto,
    }
  })

  const nota = parseFloat(((acertos / totalQuestoes) * notaMaxima).toFixed(1))
  return { acertos, erros, naoRespondidas, nota, totalQuestoes, detalhe }
}

// Decodifica QR Code no formato: PROVA:{provaId}|ALUNO:{alunoId}
export function decodificarQRCode(texto: string): { provaId: string; alunoId: string } | null {
  try {
    const match = texto.match(/PROVA:([a-f0-9-]+)\|ALUNO:([a-f0-9-]+)/i)
    if (match) return { provaId: match[1], alunoId: match[2] }
    return null
  } catch {
    return null
  }
}