import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const { acao, comentario } = await request.json()

  const novoStatus = acao === 'aprovar' ? 'aprovada' : 'rascunho'

  const { data, error } = await supabase
    .from('provas')
    .update({
      status: novoStatus,
      aprovada_por: acao === 'aprovar' ? user.id : null,
      data_aprovacao: acao === 'aprovar' ? new Date().toISOString() : null,
      comentario_coordenador: comentario ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}