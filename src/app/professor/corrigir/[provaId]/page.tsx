'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { calcularNota, decodificarQRCode, getMotorAtivo, RespostaDetectada, ResultadoCorrecao } from '@/lib/omr-engine'

interface DadosAluno {
  id: string
  nome: string
  turma: string
  serie: string
}

type Etapa = 'captura' | 'processando' | 'resultado'

export default function CorrigirOMRPage() {
  const params = useParams()
  const provaId = typeof params.provaId === 'string' ? params.provaId : Array.isArray(params.provaId) ? params.provaId[0] : ''

  const [etapa, setEtapa] = useState<Etapa>('captura')
  const [preview, setPreview] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoCorrecao | null>(null)
  const [dadosAluno, setDadosAluno] = useState<DadosAluno | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [progresso, setProgresso] = useState('')
  const [qrDetectado, setQrDetectado] = useState(false)
  const [motorNome, setMotorNome] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMotorNome(getMotorAtivo().nome)
  }, [])

  const handleImagem = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { setErro('Imagem deve ter no máximo 10MB.'); return }
    if (!file.type.startsWith('image/')) { setErro('Selecione apenas imagens.'); return }

    setErro(null)
    setResultado(null)
    setDadosAluno(null)
    setQrDetectado(false)

    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

  const processarImagem = async () => {
    if (!preview || !provaId) { setErro('Imagem ou prova inválida.'); return }

    setEtapa('processando')
    setErro(null)

    try {
      // PASSO 1: Ler QR Code com jsQR
      setProgresso('Lendo QR Code...')
      let alunoIdDetectado: string | null = null
      let provaIdDetectado: string | null = provaId

      try {
        const jsQR = (await import('jsqr')).default
        const img = await carregarImagem(preview)
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const qr = jsQR(imageData.data, imageData.width, imageData.height)

        if (qr?.data) {
          const decoded = decodificarQRCode(qr.data)
          if (decoded) {
            alunoIdDetectado = decoded.alunoId
            provaIdDetectado = decoded.provaId
            setQrDetectado(true)
          }
        }
      } catch (e) {
        console.warn('jsQR não disponível, continuando sem QR:', e)
      }

      // PASSO 2: Buscar gabarito e dados do aluno na API
      setProgresso('Buscando gabarito...')
      const apiRes = await fetch('/api/corrigir-omr/preparar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provaId: provaIdDetectado, alunoId: alunoIdDetectado }),
      })

      if (!apiRes.ok) {
        const err = await apiRes.json()
        throw new Error(err.erro ?? 'Erro ao buscar gabarito.')
      }

      const { gabarito, totalQuestoes, dadosAluno: aluno } = await apiRes.json()
      setDadosAluno(aluno)

      // PASSO 3: Ler bolhas com motor ativo
      setProgresso(`Lendo bolhas (${motorNome})...`)
      const motor = getMotorAtivo()
      const respostas: RespostaDetectada[] = await motor.lerBolhas(preview, totalQuestoes)

      // PASSO 4: Calcular nota
      setProgresso('Calculando nota...')
      const resultadoFinal = calcularNota(respostas, gabarito, totalQuestoes)
      setResultado(resultadoFinal)

      // PASSO 5: Salvar resultado
      if (provaIdDetectado && alunoIdDetectado) {
        setProgresso('Salvando resultado...')
        await fetch('/api/corrigir-omr/salvar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provaId: provaIdDetectado,
            alunoId: alunoIdDetectado,
            respostas,
            resultado: resultadoFinal,
          }),
        })
      }

      setEtapa('resultado')
    } catch (err) {
      console.error(err)
      setErro(err instanceof Error ? err.message : 'Falha no processamento.')
      setEtapa('captura')
    }
  }

  const reiniciar = () => {
    setEtapa('captura')
    setPreview(null)
    setResultado(null)
    setDadosAluno(null)
    setErro(null)
    setProgresso('')
    setQrDetectado(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">📷 Correção por Câmera</h1>
            <p className="text-sm text-gray-500 mt-1">Fotografe a folha de respostas para correção automática</p>
          </div>
          <div className="flex items-center gap-3">
            {motorNome && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                Motor: {motorNome}
              </span>
            )}
            <a href="/professor/provas" className="text-sm text-indigo-600 hover:underline">← Voltar</a>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">

        {/* ETAPA: CAPTURA */}
        {etapa === 'captura' && (
          <div className="space-y-5 mt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="font-semibold text-blue-800 mb-2">💡 Como funciona</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Fotografe <strong>apenas a folha de respostas</strong></li>
                <li>• Mantenha a folha reta, bem iluminada e sem sombras</li>
                <li>• O QR Code identifica o aluno automaticamente</li>
                <li>• A nota é calculada na hora</li>
              </ul>
            </div>

            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-blue-300 rounded-3xl p-8 bg-white text-center cursor-pointer hover:bg-blue-50 transition"
            >
              {preview ? (
                <div className="space-y-4">
                  <img src={preview} alt="Prévia" className="max-h-96 mx-auto rounded-2xl object-contain shadow" />
                  <p className="text-xs text-gray-400">Clique para trocar a imagem</p>
                </div>
              ) : (
                <div className="py-10">
                  <p className="text-5xl mb-4">📄</p>
                  <p className="text-lg font-semibold text-blue-700">Clique para fotografar</p>
                  <p className="text-sm text-gray-500 mt-2">JPG ou PNG • até 10MB</p>
                </div>
              )}
            </div>

            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleImagem} className="hidden" />

            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">⚠️ {erro}</div>
            )}

            {preview && (
              <div className="flex gap-3">
                <button onClick={reiniciar} className="flex-1 py-3 rounded-2xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-100 transition">
                  Trocar imagem
                </button>
                <button onClick={processarImagem} className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition">
                  Corrigir agora →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ETAPA: PROCESSANDO */}
        {etapa === 'processando' && (
          <div className="bg-white border rounded-3xl p-10 mt-8 text-center">
            <div className="text-5xl animate-spin mb-5">⚙️</div>
            <h2 className="font-bold text-gray-800 text-lg">Processando folha</h2>
            <p className="text-sm text-gray-500 mt-2">{progresso}</p>
            <div className="mt-6 w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div className="bg-blue-600 h-3 w-3/4 animate-pulse" />
            </div>
          </div>
        )}

        {/* ETAPA: RESULTADO */}
        {etapa === 'resultado' && resultado && (
          <div className="space-y-4 mt-4">
            {/* STATUS QR */}
            {qrDetectado ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-700 text-sm font-medium">
                ✅ QR Code identificado automaticamente
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-yellow-700 text-sm">
                ⚠️ QR Code não detectado — resultado não vinculado ao aluno
              </div>
            )}

            {/* ALUNO */}
            {dadosAluno && (
              <div className="bg-white border rounded-2xl p-5">
                <p className="text-xs text-gray-400 mb-1">Aluno identificado</p>
                <h2 className="text-xl font-bold text-gray-800">{dadosAluno.nome}</h2>
                <p className="text-sm text-gray-500 mt-1">Turma {dadosAluno.turma} • {dadosAluno.serie}</p>
              </div>
            )}

            {/* NOTA */}
            <div className={`rounded-2xl p-6 text-center border ${resultado.nota >= 6 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-6xl font-bold ${resultado.nota >= 6 ? 'text-green-600' : 'text-red-600'}`}>
                {resultado.nota}
              </p>
              <p className="text-gray-500 text-sm mt-1">de 10 pontos</p>
              <div className="flex justify-center gap-6 mt-4 text-sm">
                <span className="text-green-600">✓ {resultado.acertos} acertos</span>
                <span className="text-red-600">✗ {resultado.erros} erros</span>
                <span className="text-gray-400">— {resultado.naoRespondidas} em branco</span>
              </div>
              <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${(resultado.acertos / resultado.totalQuestoes) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{Math.round((resultado.acertos / resultado.totalQuestoes) * 100)}% de aproveitamento</p>
            </div>

            {/* GABARITO DETALHADO */}
            <div className="bg-white border rounded-2xl p-5">
              <p className="font-semibold text-gray-800 mb-3">Gabarito detalhado</p>
              <div className="grid grid-cols-5 gap-2">
                {resultado.detalhe.map(d => (
                  <div key={d.questao} className={`rounded-xl p-2 text-center text-xs border ${d.correto ? 'bg-green-50 border-green-200' : d.respostaAluno ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                    <p className="font-bold text-gray-600 mb-1">{d.questao}</p>
                    <p className={`text-lg font-bold ${d.correto ? 'text-green-600' : 'text-red-500'}`}>
                      {d.respostaAluno ?? '—'}
                    </p>
                    <p className="text-gray-400">{d.respostaCorreta}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* BOTÕES */}
            <div className="flex gap-3">
              <button onClick={reiniciar} className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition">
                📷 Corrigir nova folha
              </button>
              <a href="/professor/resultados" className="flex-1 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition text-center">
                📊 Ver resultados
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}