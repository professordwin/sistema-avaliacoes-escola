// app/api/corrigir-omr/salvar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { provaId, alunoId, respostas, resultado } = await req.json()

    if (!provaId || !alunoId) {
      return NextResponse.json({ erro: 'provaId e alunoId obrigatórios' }, { status: 400 })
    }

    const { error } = await supabase
      .from('resultados_omr')
      .upsert({
        prova_id: provaId,
        aluno_id: alunoId,
        respostas,
        nota: resultado.nota,
        acertos: resultado.acertos,
        erros: resultado.erros,
        nao_respondidas: resultado.naoRespondidas,
        corrigido_em: new Date().toISOString(),
      }, { onConflict: 'prova_id,aluno_id' })

    if (error) throw error

    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ erro: 'Erro ao salvar resultado' }, { status: 500 })
  }
}