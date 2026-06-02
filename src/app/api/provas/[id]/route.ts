import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { questao_ids, ...provaData } = body

  // Atualiza dados da prova
  const { data: prova, error } = await supabase
    .from('provas')
    .update(provaData)
    .eq('id', id)
    .eq('professor_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Substitui as questões
  if (questao_ids?.length) {
    await supabase.from('prova_questoes').delete().eq('prova_id', id)
    const relacoes = questao_ids.map((qid: string, i: number) => ({
      prova_id: id, questao_id: qid, ordem: i + 1, peso: 1.0
    }))
    await supabase.from('prova_questoes').insert(relacoes)
  }

  return NextResponse.json(prova)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { id } = await params
  const body = await request.json()

  const { data, error } = await supabase
    .from('provas')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}