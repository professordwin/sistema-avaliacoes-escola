// lib/omr-engine.ts
// Arquitetura em camadas: troque o motor sem mudar o resto do sistema

export interface RespostaDetectada {
  questao: number
  alternativa: string | null
  confianca: number
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

export interface GabaritoItem {
  questao: number
  alternativaCorreta: string
}

// ============================================================
// INTERFACE DO MOTOR (troque a implementação sem mudar a API)
// ============================================================
export interface MotorOMR {
  nome: string
  lerBolhas(imagemBase64: string, totalQuestoes: number): Promise<RespostaDetectada[]>
}

// ============================================================
// MOTOR 1: ANÁLISE DE PIXELS (gratuito, sem API externa)
// ============================================================
export class MotorPixel implements MotorOMR {
  nome = 'pixel-analysis'

  async lerBolhas(imagemBase64: string, totalQuestoes: number): Promise<RespostaDetectada[]> {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)

        const respostas = analisarGradeBolhas(ctx, img.width, img.height, totalQuestoes)
        resolve(respostas)
      }
      img.src = imagemBase64
    })
  }
}

// ============================================================
// MOTOR 2: CLAUDE VISION (melhor precisão, pago ~$0.003/img)
// Descomente quando quiser ativar
// ============================================================
// export class MotorClaudeVision implements MotorOMR {
//   nome = 'claude-vision'
//   async lerBolhas(imagemBase64: string, totalQuestoes: number): Promise<RespostaDetectada[]> {
//     const base64 = imagemBase64.split(',')[1]
//     const res = await fetch('/api/omr-claude', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ imagemBase64: base64, totalQuestoes }),
//     })
//     return res.json()
//   }
// }

// ============================================================
// MOTOR ATIVO — troque aqui quando quiser mudar
// ============================================================
export function getMotorAtivo(): MotorOMR {
  return new MotorPixel()
  // Para usar Claude Vision no futuro:
  // return new MotorClaudeVision()
}

// ============================================================
// ANÁLISE DE PIXELS — detecta bolha preenchida por escuridão
// ============================================================
function analisarGradeBolhas(
  ctx: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  totalQuestoes: number
): RespostaDetectada[] {
  const LETRAS = ['A', 'B', 'C', 'D', 'E']
  const QUESTOES_POR_LINHA = 3
  const respostas: RespostaDetectada[] = []

  // Estima região da grade de bolhas (parte inferior da folha)
  // A grade ocupa aproximadamente os 55% inferiores da folha
  const MARGEM_TOPO_GRADE = Math.floor(altura * 0.38)
  const MARGEM_BASE_GRADE = Math.floor(altura * 0.93)
  const MARGEM_ESQUERDA = Math.floor(largura * 0.04)
  const MARGEM_DIREITA = Math.floor(largura * 0.96)

  const alturaGrade = MARGEM_BASE_GRADE - MARGEM_TOPO_GRADE
  const larguraGrade = MARGEM_DIREITA - MARGEM_ESQUERDA

  const numLinhas = Math.ceil(totalQuestoes / QUESTOES_POR_LINHA)
  const alturaLinha = alturaGrade / numLinhas

  // Cada coluna de questão tem: número (estreito) + 5 bolhas
  const larguraColunaQuestao = larguraGrade / QUESTOES_POR_LINHA
  const larguraNumero = larguraColunaQuestao * 0.12
  const larguraBolha = (larguraColunaQuestao - larguraNumero) / 5

  for (let linha = 0; linha < numLinhas; linha++) {
    for (let col = 0; col < QUESTOES_POR_LINHA; col++) {
      const numQuestao = linha * QUESTOES_POR_LINHA + col + 1
      if (numQuestao > totalQuestoes) break

      const y = MARGEM_TOPO_GRADE + linha * alturaLinha
      const x = MARGEM_ESQUERDA + col * larguraColunaQuestao + larguraNumero

      let melhorLetra: string | null = null
      let menorBrilho = 255
      let confianca = 0

      for (let i = 0; i < 5; i++) {
        const cx = x + i * larguraBolha + larguraBolha / 2
        const cy = y + alturaLinha / 2
        const raio = Math.min(larguraBolha, alturaLinha) * 0.3

        const brilho = calcularBrilhoMedio(ctx, cx, cy, raio)

        if (brilho < menorBrilho) {
          menorBrilho = brilho
          melhorLetra = LETRAS[i]
          confianca = (255 - brilho) / 255
        }
      }

      // Só considera como marcada se a bolha estiver escura o suficiente
      const LIMIAR_PREENCHIMENTO = 0.35
      respostas.push({
        questao: numQuestao,
        alternativa: confianca >= LIMIAR_PREENCHIMENTO ? melhorLetra : null,
        confianca,
      })
    }
  }

  return respostas
}

function calcularBrilhoMedio(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  raio: number
): number {
  const x0 = Math.max(0, Math.floor(cx - raio))
  const y0 = Math.max(0, Math.floor(cy - raio))
  const x1 = Math.ceil(cx + raio)
  const y1 = Math.ceil(cy + raio)

  const dados = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data
  let soma = 0
  let count = 0

  for (let i = 0; i < dados.length; i += 4) {
    const r = dados[i]
    const g = dados[i + 1]
    const b = dados[i + 2]
    soma += (r + g + b) / 3
    count++
  }

  return count > 0 ? soma / count : 255
}

// ============================================================
// CÁLCULO DE NOTA (independente do motor)
// ============================================================
export function calcularNota(
  respostas: RespostaDetectada[],
  gabarito: GabaritoItem[],
  totalQuestoes: number,
  notaMaxima = 10
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

// ============================================================
// DECODIFICAÇÃO QR CODE
// ============================================================
export function decodificarQRCode(texto: string): { provaId: string; alunoId: string } | null {
  try {
    const match = texto.match(/PROVA:([a-f0-9-]+)\|ALUNO:([a-f0-9-]+)/i)
    if (match) return { provaId: match[1], alunoId: match[2] }
    return null
  } catch {
    return null
  }
}