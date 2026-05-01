import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: prova } = await admin
    .from('provas')
    .select(`
      *,
      disciplinas(nome),
      usuarios!provas_professor_id_fkey(nome),
      prova_questoes(
        ordem, peso,
        questoes(enunciado, nivel_dificuldade, alternativas(*))
      )
    `)
    .eq('id', id)
    .single()

  if (!prova) return NextResponse.json({ error: 'Prova não encontrada' }, { status: 404 })

  // Ordenar questões
  const questoes = (prova.prova_questoes ?? [])
    .sort((a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem)
    .map((pq: { ordem: number; questoes: { enunciado: string; alternativas: { letra: string; texto: string; correta: boolean }[] } }) => pq.questoes)

  return NextResponse.json({
    prova: {
      id: prova.id,
      titulo: prova.titulo,
      instrucoes: prova.instrucoes,
      tempo_minutos: prova.tempo_minutos,
      disciplina: prova.disciplinas?.nome,
      professor: prova.usuarios?.nome,
    },
    questoes,
  })
}