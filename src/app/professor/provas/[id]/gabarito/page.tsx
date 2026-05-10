'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
const ALTERNATIVAS = ['A','B','C','D','E']
export default function GabaritoPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const [totalQuestoes, setTotalQuestoes] = useState(10)
  const [gabarito, setGabarito] = useState<Record<number,string>>({})
  const [nomeProva, setNomeProva] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{tipo:'sucesso'|'erro';texto:string}|null>(null)
  const [carregando, setCarregando] = useState(true)
  useEffect(() => {
    Promise.all([
      fetch('/api/provas/'+id+'/pdf').then(r=>r.json()).catch(()=>({})),
      fetch('/api/provas/'+id+'/gabarito').then(r=>r.json()).catch(()=>[]),
    ]).then(([provaData, gabaritoData]) => {
      if(provaData?.prova?.titulo) setNomeProva(provaData.prova.titulo)
      if(provaData?.questoes?.length>0) setTotalQuestoes(provaData.questoes.length)
      if(Array.isArray(gabaritoData)&&gabaritoData.length>0){
        const gab:Record<number,string>={}
        gabaritoData.forEach((g:{questao_numero:number;alternativa_correta:string})=>{gab[g.questao_numero]=g.alternativa_correta})
        setGabarito(gab)
      }
      setCarregando(false)
    })
  },[id])
  const handleResposta=(questao:number,alternativa:string)=>{
    setGabarito(prev=>({...prev,[questao]:prev[questao]===alternativa?'':alternativa}))
  }
  const salvar=async()=>{
    const respondidas=Object.values(gabarito).filter(v=>v).length
    if(respondidas===0){setMensagem({tipo:'erro',texto:'Preencha ao menos uma resposta.'});return}
    setSalvando(true);setMensagem(null)
    const res=await fetch('/api/provas/'+id+'/gabarito',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({gabarito,totalQuestoes})})
    const data=await res.json()
    setSalvando(false)
    if(res.ok){setMensagem({tipo:'sucesso',texto:'Gabarito salvo! '+data.questoes+' questoes cadastradas.'});setTimeout(()=>router.push('/professor/provas'),2000)}
    else{setMensagem({tipo:'erro',texto:data.error??'Erro ao salvar.'})}
  }
  const respondidas=Object.values(gabarito).filter(v=>v).length
  if(carregando) return <div className='min-h-screen flex items-center justify-center'><p className='text-gray-500'>Carregando...</p></div>
  return(
    <div className='min-h-screen bg-gray-50'>
      <header className='bg-white border-b px-6 py-4 flex items-center justify-between'>
        <div><h1 className='font-semibold text-gray-900'>Cadastrar Gabarito</h1>{nomeProva&&<p className='text-sm text-gray-500 mt-0.5'>{nomeProva}</p>}</div>
        <a href='/professor/provas' className='text-sm text-indigo-600 hover:underline'>← Voltar</a>
      </header>
      <main className='max-w-3xl mx-auto px-6 py-8'>
        {mensagem&&<div className={'mb-6 p-4 rounded-xl text-sm font-medium '+(mensagem.tipo==='sucesso'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200')}>{mensagem.texto}</div>}
        <div className='bg-white rounded-xl border p-4 mb-6 flex items-center gap-4'>
          <label className='text-sm font-medium text-gray-700'>Total de questoes:</label>
          <div className='flex items-center gap-2'>
            <button onClick={()=>setTotalQuestoes(q=>Math.max(1,q-1))} className='w-8 h-8 rounded-lg border text-gray-600 hover:bg-gray-50 font-bold'>-</button>
            <span className='w-12 text-center font-semibold text-gray-900'>{totalQuestoes}</span>
            <button onClick={()=>setTotalQuestoes(q=>Math.min(50,q+1))} className='w-8 h-8 rounded-lg border text-gray-600 hover:bg-gray-50 font-bold'>+</button>
          </div>
          <span className='text-sm text-gray-400 ml-auto'>{respondidas}/{totalQuestoes} preenchidas</span>
        </div>
        <div className='bg-white rounded-xl border overflow-hidden mb-6'>
          <div className='grid grid-cols-7 bg-gray-50 border-b text-xs font-semibold text-gray-500 px-4 py-2'>
            <span>N</span>{ALTERNATIVAS.map(a=><span key={a} className='text-center'>{a}</span>)}
          </div>
          <div className='divide-y max-h-96 overflow-y-auto'>
            {Array.from({length:totalQuestoes},(_,i)=>i+1).map(n=>(
              <div key={n} className='grid grid-cols-7 px-4 py-2 items-center hover:bg-gray-50'>
                <span className='text-sm font-bold text-gray-700'>{n}</span>
                {ALTERNATIVAS.map(alt=>(
                  <div key={alt} className='flex justify-center'>
                    <button onClick={()=>handleResposta(n,alt)} className={'w-8 h-8 rounded-full text-sm font-semibold border-2 transition-all '+(gabarito[n]===alt?'bg-indigo-600 border-indigo-600 text-white scale-110':'border-gray-300 text-gray-400 hover:border-indigo-400 hover:text-indigo-600')}>{alt}</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        <button onClick={salvar} disabled={salvando||respondidas===0} className='w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-50'>
          {salvando?'Salvando...':'Salvar Gabarito ('+respondidas+' questoes)'}
        </button>
      </main>
    </div>
  )
}