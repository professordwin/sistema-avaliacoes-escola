import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface LinhaPlanilha {
  nome_aluno: string
  turma: string
  serie: string
  observacoes: string
}

export async function POST(req: NextRequest) {
  try {
    const { arquivoBase64, professorId } = await req.json()

    if (!arquivoBase64) {
      return NextResponse.json(
        { erro: 'Arquivo obrigatório.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(arquivoBase64, 'base64')

    const workbook = XLSX.read(buffer, {
      type: 'buffer',
    })

    const worksheet =
      workbook.Sheets['Alunos'] ??
      workbook.Sheets[workbook.SheetNames[0]]

    if (!worksheet) {
      return NextResponse.json(
        { erro: 'Nenhuma planilha encontrada no arquivo.' },
        { status: 400 }
      )
    }

    const rows = XLSX.utils.sheet_to_json<LinhaPlanilha>(worksheet, {
      header: ['nome_aluno', 'turma', 'serie', 'observacoes'],
      range: 5,
      defval: '',
    })

    const alunos = rows
      .filter(
        (row) =>
          row.nome_aluno?.trim() &&
          row.turma?.trim() &&
          row.serie?.trim()
      )
      .map((row) => ({
        nome: row.nome_aluno.trim(),
        turma: row.turma.trim(),
        serie: row.serie.trim(),
        observacoes: row.observacoes?.trim() || null,
        professor_id: professorId || null,
      }))

    if (alunos.length === 0) {
      return NextResponse.json(
        { erro: 'Nenhum aluno válido encontrado na planilha.' },
        { status: 422 }
      )
    }

    const { data, error } = await supabase
      .from('alunos')
      .insert(alunos)
      .select()

    if (error) {
      console.error('Erro Supabase:', error)

      return NextResponse.json(
        {
          erro: 'Erro ao salvar alunos no banco de dados.',
          detalhes: error.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sucesso: true,
      importados: data?.length ?? alunos.length,
    })
  } catch (error) {
    console.error('Erro na importação:', error)

    return NextResponse.json(
      {
        erro: 'Erro ao processar a planilha.',
      },
      { status: 500 }
    )
  }
}