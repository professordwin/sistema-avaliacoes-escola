import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { id } = await params
  const { acao } = await req.json()
  const novoStatus = acao === 'aprovar' ? 'aprovada' : 'em_montagem'
  const { data, error } = await admin.from('avaliacoes').update({ status: novoStatus }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (acao === 'aprovar') {
    await admin.from('avaliacao_disciplinas').update({ status: 'aprovado' }).eq('avaliacao_id', id)
  }
  return NextResponse.json(data)
}