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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .single()

  if (!['coordenador', 'diretor', 'superadmin'].includes(usuario?.papel)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { id } = await params

  // Deletar dependências primeiro
  await supabase.from('gabarito_prova').delete().eq('prova_id', id)
  await supabase.from('resultados_omr').delete().eq('prova_id', id)
  await supabase.from('prova_questoes').delete().eq('prova_id', id)

  const { error } = await supabase.from('provas').delete().eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}