import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('tenant_id, papel, area_coordenacao')
    .eq('id', user.id)
    .single()

  if (usuario?.papel !== 'coordenador' && usuario?.papel !== 'diretor' && usuario?.papel !== 'superadmin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('provas')
    .select(`
      *,
      disciplinas(nome, cor_hex, area_conhecimento),
      usuarios!provas_professor_id_fkey(nome, email),
      prova_questoes(id)
    `)
    .eq('tenant_id', usuario.tenant_id)
    .in('status', ['aguardando_aprovacao', 'aprovada', 'aplicada'])
    .order('criado_em', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}