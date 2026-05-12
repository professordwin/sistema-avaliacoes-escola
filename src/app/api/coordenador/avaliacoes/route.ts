import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { data: avaliacoes, error } = await admin.from('avaliacoes').select('*,avaliacao_disciplinas(*,disciplinas(id,nome,cor_hex))').order('criado_em', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const profIds = [...new Set((avaliacoes??[]).flatMap(a=>(a.avaliacao_disciplinas??[]).map((d:any)=>d.professor_id).filter(Boolean)))] as string[]
  let profMap:Record<string,{id:string;nome:string;email:string}> = {}
  if (profIds.length > 0) {
    const { data: profs } = await admin.from('usuarios').select('id,nome,email').in('id', profIds)
    profMap = Object.fromEntries((profs??[]).map(p=>[p.id,p]))
  }
  const resultado = (avaliacoes??[]).map(av => ({
    ...av,
    avaliacao_disciplinas: (av.avaliacao_disciplinas??[]).map((d:any) => ({
      ...d,
      usuarios: d.professor_id ? profMap[d.professor_id]??null : null
    }))
  }))
  return NextResponse.json(resultado)
}
export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const body = await req.json()
  const { titulo, bimestre, ano, serie, turmas, data_aplicacao, instrucoes, disciplinas_professores } = body
  const { data: usuario } = await admin.from('usuarios').select('tenant_id').eq('id', user.id).single()
  const { data: av, error } = await admin.from('avaliacoes').insert({ titulo, bimestre, ano, serie, turmas, data_aplicacao, instrucoes, criado_por: user.id, tenant_id: usuario?.tenant_id, status: 'aguardando_professores' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (disciplinas_professores?.length > 0) {
    const partes = disciplinas_professores.map((dp:{disciplina_id:string;professor_id:string}, i:number) => ({ avaliacao_id: av.id, disciplina_id: dp.disciplina_id, professor_id: dp.professor_id, status: 'pendente', ordem: i+1 }))
    await admin.from('avaliacao_disciplinas').insert(partes)
  }
  return NextResponse.json(av, { status: 201 })
}