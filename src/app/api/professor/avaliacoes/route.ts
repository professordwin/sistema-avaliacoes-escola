import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { data: partes, error } = await admin.from('avaliacao_disciplinas').select('*,disciplinas(id,nome,cor_hex),avaliacoes(id,titulo,bimestre,ano,serie,turmas,data_aplicacao,instrucoes,status)').eq('professor_id', user.id).order('criado_em', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(partes ?? [])
}
export async function PATCH(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { id, questoes_ids, acao } = await req.json()
  const novoStatus = acao === 'submeter' ? 'submetido' : 'em_elaboracao'
  const updateData: Record<string,unknown> = { status: novoStatus }
  if (questoes_ids) updateData.questoes_ids = questoes_ids
  const { data, error } = await admin.from('avaliacao_disciplinas').update(updateData).eq('id', id).eq('professor_id', user.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}