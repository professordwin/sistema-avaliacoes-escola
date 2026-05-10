import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { arquivoBase64, professorId } = await req.json()

    if (!arquivoBase64) {
      return NextResponse.json({ erro: 'Arquivo obrigatorio' }, { status: 400 })
    }

    const buffer = Buffer.from(arquivoBase64, 'base64')
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const ws = wb.Sheets['Alunos'] ?? wb.Sheets[wb.SheetNames[0]]

    const rows = XLSX.utils.sheet_to_json(ws, {
      header: ['nome_aluno', 'turma', 'serie', 'observacoes'],
      range: 5,
      defval: '',
    }) as Record<string, string>[]

    const alunos = rows
      .filter(r => r.nome_aluno?.trim() && r.turma?.trim() && r.serie?.trim())
      .map(r => ({
        nome: r.nome_aluno.trim(),
        turma: r.turma.trim(),
        serie: r.serie.trim(),
        observacoes: r.observacoes?.trim() || null,
        professor_id: professorId || null,
      }))

    if (alunos.length === 0) {
      return NextResponse.json({ erro: 'Nenhum aluno valido na planilha' }, { status: 422 })
    }

    const { data, error } = await supabase.from('alunos').insert(alunos).select()

    if (error) throw error

    return NextResponse.json({ sucesso: true, importados: data?.length ?? alunos.length })
  } catch (error) {
    console.error('Erro importacao:', error)
    return NextResponse.json({ erro: 'Erro ao processar planilha' }, { status: 500 })
  }
}