// app/api/corrigir-omr/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processarRespostasVision, calcularNota, decodificarQRCode } from '@/lib/omr-processor'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { textoOCR, provaId: provaIdManual, alunoId: alunoIdManual, gabarito: gabaritoManual, totalQuestoes: totalManual } = await req.json()

    if (!textoOCR) {
      return NextResponse.json({ erro: 'Texto OCR não recebido' }, { status: 400 })
    }

    console.log('TEXTO OCR RECEBIDO:\n', textoOCR)

    // 1. Tenta decodificar QR Code no texto
    const linhas = textoOCR.split('\n')
    let provaId = provaIdManual
    let alunoId = alunoIdManual
    let dadosQR = null

    for (const linha of linhas) {
      dadosQR = decodificarQRCode(linha.trim())
      if (dadosQR) {
        provaId = dadosQR.provaId
        alunoId = dadosQR.alunoId
        console.log('QR Code detectado:', dadosQR)
        break
      }
    }

    if (!provaId) {
      return NextResponse.json({ erro: 'Não foi possível identificar a prova. QR Code não encontrado.' }, { status: 422 })
    }

    // 2. Busca gabarito da prova no Supabase
    let gabarito = gabaritoManual
    let totalQuestoes = totalManual

    if (!gabarito || gabarito.length === 0) {
      const { data: gabaritoData, error } = await supabase
        .from('gabarito_prova')
        .select('questao_numero, alternativa_correta')
        .eq('prova_id', provaId)
        .order('questao_numero')

      if (error || !gabaritoData || gabaritoData.length === 0) {
        return NextResponse.json({ erro: 'Gabarito não encontrado para esta prova.' }, { status: 404 })
      }

      gabarito = gabaritoData.map(g => ({
        questao: g.questao_numero,
        alternativaCorreta: g.alternativa_correta,
      }))
      totalQuestoes = gabaritoData.length
    }

    // 3. Busca dados do aluno se identificado por QR
    let dadosAluno = null
    if (alunoId) {
      const { data } = await supabase
        .from('alunos')
        .select('id, nome, turma, serie')
        .eq('id', alunoId)
        .single()
      dadosAluno = data
    }

    // 4. Processa respostas do OCR
    const anotacoes = linhas.map((l: string) => ({ description: l }))
    const respostasDetectadas = processarRespostasVision(anotacoes)

    // 5. Calcula nota
    const resultado = calcularNota(respostasDetectadas, gabarito, totalQuestoes)

    // 6. Salva resultado
    if (provaId && alunoId) {
      await supabase.from('resultados_omr').upsert({
        prova_id: provaId,
        aluno_id: alunoId,
        respostas: respostasDetectadas,
        nota: resultado.nota,
        acertos: resultado.acertos,
        erros: resultado.erros,
        nao_respondidas: resultado.naoRespondidas,
        corrigido_em: new Date().toISOString(),
      }, { onConflict: 'prova_id,aluno_id' })
    }

    return NextResponse.json({
      sucesso: true,
      qrDetectado: !!dadosQR,
      dadosAluno,
      respostasDetectadas,
      resultado,
    })

  } catch (error) {
    console.error('Erro OMR:', error)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}