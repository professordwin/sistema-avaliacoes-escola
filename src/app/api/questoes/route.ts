import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const disciplina_id = searchParams.get('disciplina_id')

  let query = supabase
    .from('questoes')
    .select(`
      *,
      alternativas(*),
      disciplinas(nome, cor_hex)
    `)
    .order('criado_em', { ascending: false })

  if (disciplina_id) {
    query = query.eq('disciplina_id', disciplina_id)
  }

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const body = await request.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  const { alternativas, ...questaoData } = body

  const { data: questao, error } = await supabase
    .from('questoes')
    .insert({ ...questaoData, professor_id: user.id, tenant_id: usuario?.tenant_id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (alternativas?.length) {
    const altsFormatadas = alternativas.map((alt: { letra: string; texto: string; correta: boolean }) => ({
      questao_id: questao.id,
      letra: alt.letra,
      texto: alt.texto,
      correta: alt.correta,
    }))
    await supabase.from('alternativas').insert(altsFormatadas)
  }

  return NextResponse.json(questao, { status: 201 })
}