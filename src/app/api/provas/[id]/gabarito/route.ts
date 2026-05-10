import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await admin.from('gabarito_prova').select('questao_numero,alternativa_correta').eq('prova_id', id).order('questao_numero')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { id } = await params
  const { gabarito, totalQuestoes } = await req.json()
  if (!gabarito || !totalQuestoes) return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  await admin.from('gabarito_prova').delete().eq('prova_id', id)
  const rows = Object.entries(gabarito).filter(([,alt]) => alt).map(([questao, alt]) => ({ prova_id: id, questao_numero: parseInt(questao), alternativa_correta: alt as string }))
  if (rows.length === 0) return NextResponse.json({ error: 'Nenhuma resposta' }, { status: 400 })
  const { error } = await admin.from('gabarito_prova').insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sucesso: true, questoes: rows.length })
}