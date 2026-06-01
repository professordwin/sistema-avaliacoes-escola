import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  const { id } = await params
  const { data: avaliacao, error } = await admin.from('avaliacoes').select('*').eq('id', id).single()
  if (error || !avaliacao) return NextResponse.json({ error: 'Avaliacao nao encontrada' }, { status: 404 })
  const { data: partes } = await admin.from('avaliacao_disciplinas').select('*,disciplinas(id,nome,cor_hex)').eq('avaliacao_id', id).order('ordem')
  const questoesIds = (partes??[]).flatMap((p:any) => p.questoes_ids??[])
  let questoesMap: Record<string,any> = {}
  if (questoesIds.length > 0) {
    const { data: questoes } = await admin.from('questoes').select('id,enunciado,alternativas,nivel_dificuldade,disciplina_id').in('id', questoesIds)
    questoesMap = Object.fromEntries((questoes??[]).map(q=>[q.id,q]))
  }
  const resultado = {
    avaliacao,
    blocos: (partes??[]).map((p:any) => ({
      disciplina: p.disciplinas,
      ordem: p.ordem,
      questoes: (p.questoes_ids??[]).map((qid:string, idx:number) => ({
        numero: idx+1,
        ...questoesMap[qid]
      })).filter((q:any) => q.enunciado)
    }))
  }
  return NextResponse.json(resultado)
}