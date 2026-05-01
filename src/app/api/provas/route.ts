import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data, error } = await supabase
    .from('provas')
    .select(`*, disciplinas(nome, cor_hex), prova_questoes(*, questoes(enunciado))`)
    .eq('professor_id', user.id)
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuarios').select('tenant_id').eq('id', user.id).single()

  const body = await request.json()
  const { questao_ids, ...provaData } = body

  const { data: prova, error } = await supabase
    .from('provas')
    .insert({ ...provaData, professor_id: user.id, tenant_id: usuario?.tenant_id })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (questao_ids?.length) {
    const relacoes = questao_ids.map((id: string, i: number) => ({
      prova_id: prova.id, questao_id: id, ordem: i + 1, peso: 1.0
    }))
    await supabase.from('prova_questoes').insert(relacoes)
  }

  return NextResponse.json(prova, { status: 201 })
}