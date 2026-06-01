'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
interface Alternativa { letra: string; texto: string; correta: boolean }
interface Questao { numero: number; enunciado: string; alternativas?: Alternativa[] }
interface Bloco { disciplina: { nome: string; cor_hex: string }; ordem: number; questoes: Questao[] }
interface Avaliacao { titulo: string; bimestre: number; ano: number; serie: string; turmas: string[]; data_aplicacao: string; instrucoes: string }
interface Folha { avaliacao: Avaliacao; blocos: Bloco[] }
export default function ImprimirPage() {
  const params = useParams()
  const id = params.id as string
  const [folha, setFolha] = useState<Folha|null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  useEffect(() => {
    if(!id) return
    fetch('/api/coordenador/avaliacoes/'+id+'/folha').then(r=>r.json()).then(d=>{
      if(d.error) setErro(d.error)
      else setFolha(d)
      setCarregando(false)
    })
  }, [id])
  if(carregando) return <div className='min-h-screen flex items-center justify-center'><p className='text-gray-500'>Carregando folha consolidada...</p></div>
  if(erro||!folha) return <div className='min-h-screen flex items-center justify-center'><p className='text-red-500'>{erro||'Erro ao carregar.'}</p></div>
  const { avaliacao, blocos } = folha
  const totalQuestoes = blocos.reduce((a,b)=>a+b.questoes.length,0)
  let questaoGlobal = 0
  return (
    <div className='bg-white min-h-screen'>
      <div className='print:hidden bg-gray-100 border-b px-6 py-3 flex items-center justify-between'>
        <div className='flex items-center gap-3'><a href='/coordenador/avaliacoes' className='text-sm text-indigo-600 hover:underline'>Voltar</a><span className='text-gray-400'>|</span><span className='text-sm text-gray-600'>{avaliacao.titulo}</span></div>
        <button onClick={()=>window.print()} className='px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg'>Imprimir / PDF</button>
      </div>
      <div className='max-w-4xl mx-auto px-8 py-6'>
        <div className='border-2 border-gray-800 mb-6'>
          <div className='bg-gray-800 text-white text-center py-2 font-bold text-lg tracking-wide'>CADERNO DE QUESTOES</div>
          <div className='grid grid-cols-3 border-t border-gray-800'>
            <div className='border-r border-gray-800 p-3'><p className='text-xs text-gray-500 mb-1'>Atividade</p><p className='font-bold text-sm'>AVALIACAO MULTIDISCIPLINAR</p></div>
            <div className='border-r border-gray-800 p-3'><p className='text-xs text-gray-500 mb-1'>Areas de Conhecimento</p><p className='font-semibold text-sm'>{blocos.map(b=>b.disciplina.nome).join(', ')}</p></div>
            <div className='p-3'><p className='text-xs text-gray-500 mb-1'>Bimestre / Ano</p><p className='font-bold text-sm'>{avaliacao.bimestre}o / {avaliacao.ano}</p></div>
          </div>
          <div className='grid grid-cols-4 border-t border-gray-800'>
            <div className='border-r border-gray-800 p-3'><p className='text-xs text-gray-500 mb-1'>Serie / Turmas</p><p className='font-semibold text-sm'>{avaliacao.serie} - {avaliacao.turmas?.join(', ')}</p></div>
            <div className='border-r border-gray-800 p-3'><p className='text-xs text-gray-500 mb-1'>Data</p><p className='font-semibold text-sm'>{avaliacao.data_aplicacao?new Date(avaliacao.data_aplicacao+'T12:00:00').toLocaleDateString('pt-BR'):'___/___/______'}</p></div>
            <div className='border-r border-gray-800 p-3'><p className='text-xs text-gray-500 mb-1'>Total Questoes</p><p className='font-bold text-sm'>{totalQuestoes}</p></div>
            <div className='p-3'><p className='text-xs text-gray-500 mb-1'>Valor</p><p className='font-bold text-sm'>______ pontos</p></div>
          </div>
          <div className='grid grid-cols-3 border-t border-gray-800'>
            <div className='col-span-2 border-r border-gray-800 p-3'><p className='text-xs text-gray-500 mb-1'>Estudante</p><p className='border-b border-gray-400 pb-3 text-sm'>&nbsp;</p></div>
            <div className='grid grid-cols-2'><div className='border-r border-gray-800 p-3'><p className='text-xs text-gray-500 mb-1'>Numero</p><p className='border-b border-gray-400 pb-3 text-sm'>&nbsp;</p></div><div className='p-3'><p className='text-xs text-gray-500 mb-1'>Turma</p><p className='border-b border-gray-400 pb-3 text-sm'>&nbsp;</p></div></div>
          </div>
        </div>
        {avaliacao.instrucoes&&(<div className='border border-gray-300 rounded p-3 mb-6 bg-gray-50'><p className='text-xs font-semibold text-gray-600 mb-1'>INSTRUCOES GERAIS</p><p className='text-sm text-gray-700'>{avaliacao.instrucoes}</p></div>)}
        {blocos.map((bloco,bi)=>(
          <div key={bi} className='mb-8'>
            <div className='flex items-center gap-3 mb-4 pb-2 border-b-2 border-gray-800'>
              <div className='w-4 h-4 rounded' style={{backgroundColor:bloco.disciplina.cor_hex}}/>
              <h2 className='font-bold text-lg uppercase tracking-wide'>{bloco.disciplina.nome}</h2>
            </div>
            {bloco.questoes.length===0?(<p className='text-gray-400 text-sm italic'>Nenhuma questao cadastrada.</p>):(
              <div className='space-y-6'>
                {bloco.questoes.map(q=>{questaoGlobal++;const num=questaoGlobal;return(
                  <div key={q.numero} className='break-inside-avoid'>
                    <p className='text-sm leading-relaxed mb-3'><span className='font-bold'>{String(num).padStart(2,'0')}. </span>{q.enunciado}</p>
                    {q.alternativas&&q.alternativas.length>0&&(<div className='space-y-1 ml-4'>{q.alternativas.map(alt=>(<div key={alt.letra} className='flex gap-2 text-sm'><span className='font-semibold w-5 flex-shrink-0'>{alt.letra})</span><span>{alt.texto}</span></div>))}</div>)}
                  </div>
                )})}
              </div>
            )}
          </div>
        ))}
        <div className='border-t border-gray-300 mt-8 pt-4 text-center text-xs text-gray-400'><p>AvaliaEscola - {avaliacao.titulo} - {avaliacao.bimestre}o Bimestre {avaliacao.ano}</p></div>
      </div>
    </div>
  )
}