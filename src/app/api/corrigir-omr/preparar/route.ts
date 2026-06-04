// app/api/corrigir-omr/preparar/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { provaId, alunoId } = await req.json()

    if (!provaId) {
      return NextResponse.json({ erro: 'provaId obrigatório' }, { status: 400 })
    }

    // Busca gabarito
    const { data: gabaritoData, error } = await supabase
      .from('gabarito_prova')
      .select('questao_numero, alternativa_correta')
      .eq('prova_id', provaId)
      .order('questao_numero')

    if (error || !gabaritoData || gabaritoData.length === 0) {
      return NextResponse.json({ erro: 'Gabarito não encontrado. Cadastre o gabarito antes de corrigir.' }, { status: 404 })
    }

    const gabarito = gabaritoData.map(g => ({
      questao: g.questao_numero,
      alternativaCorreta: g.alternativa_correta,
    }))

    // Busca dados do aluno se informado
    let dadosAluno = null
    if (alunoId) {
      const { data } = await supabase
        .from('alunos')
        .select('id, nome, turma, serie')
        .eq('id', alunoId)
        .single()
      dadosAluno = data
    }

    return NextResponse.json({
      gabarito,
      totalQuestoes: gabaritoData.length,
      dadosAluno,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ erro: 'Erro interno' }, { status: 500 })
  }
}