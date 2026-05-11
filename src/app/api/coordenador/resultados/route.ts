import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { data: provas, error } = await admin.from('provas').select('id,titulo,criado_em,disciplinas(nome,cor_hex),resultados_omr(id,nota,acertos,erros,nao_respondidas,corrigido_em,aluno_id)').order('criado_em', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const alunoIds = [...new Set((provas??[]).flatMap(p=>(p.resultados_omr??[]).map((r:any)=>r.aluno_id).filter(Boolean)))] as string[]
  let alunosMap:Record<string,{nome:string;turma:string;serie:string}> = {}
  if (alunoIds.length > 0) {
    const { data: alunos } = await admin.from('alunos').select('id,nome,turma,serie').in('id', alunoIds)
    alunosMap = Object.fromEntries((alunos??[]).map(a=>[a.id,{nome:a.nome,turma:a.turma,serie:a.serie}]))
  }
  const resultado = (provas??[]).map(prova => {
    const resultados = (prova.resultados_omr??[]) as {id:string;nota:number;acertos:number;erros:number;nao_respondidas:number;corrigido_em:string;aluno_id:string|null}[]
    const notas = resultados.map(r=>r.nota).filter(n=>n!==null&&n!==undefined)
    const media = notas.length>0 ? parseFloat((notas.reduce((a,b)=>a+b,0)/notas.length).toFixed(1)) : null
    const aprovados = notas.filter(n=>n>=6).length
    return { id:prova.id, titulo:prova.titulo, disciplina:prova.disciplinas, total_corrigidos:resultados.length, media, maior_nota:notas.length>0?Math.max(...notas):null, menor_nota:notas.length>0?Math.min(...notas):null, aprovados, reprovados:notas.length-aprovados, resultados:resultados.map(r=>({id:r.id,nota:r.nota,acertos:r.acertos,erros:r.erros,nao_respondidas:r.nao_respondidas,aluno:r.aluno_id?alunosMap[r.aluno_id]??null:null})) }
  })
  return NextResponse.json(resultado)
}