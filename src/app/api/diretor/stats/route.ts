import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Buscar usuário via admin (sem RLS)
  const { data: usuario } = await admin
    .from('usuarios')
    .select('tenant_id, papel')
    .eq('id', user.id)
    .single()

  // Log para debug
  console.log('usuario encontrado:', usuario)

  if (!usuario) {
    return NextResponse.json({ error: 'Usuário não encontrado', uid: user.id }, { status: 404 })
  }

  const tenant_id = usuario.tenant_id

  const [provasRes, questoesRes, professoresRes, disciplinasRes] = await Promise.all([
    admin.from('provas').select('id, status, criado_em, disciplinas(nome)').eq('tenant_id', tenant_id),
    admin.from('questoes').select('id').eq('tenant_id', tenant_id),
    admin.from('usuarios').select('id, nome, email').eq('tenant_id', tenant_id).eq('papel', 'professor'),
    admin.from('disciplinas').select('*').eq('tenant_id', tenant_id).eq('ativo', true),
  ])

  const provas = provasRes.data ?? []
  const questoes = questoesRes.data ?? []
  const professores = professoresRes.data ?? []
  const disciplinas = disciplinasRes.data ?? []

  return NextResponse.json({
    totais: { provas: provas.length, questoes: questoes.length, professores: professores.length },
    provasPorStatus: {
      rascunho: provas.filter(p => p.status === 'rascunho').length,
      aguardando: provas.filter(p => p.status === 'aguardando_aprovacao').length,
      aprovada: provas.filter(p => p.status === 'aprovada').length,
      aplicada: provas.filter(p => p.status === 'aplicada').length,
    },
    provasRecentes: provas.slice(0, 10),
    professores,
    disciplinas,
  })
}