'use client'

import { useState, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import ResultadoOMR from '@/components/ResultadoOMR'
import { ResultadoCorrecao } from '@/lib/omr-processor'

interface DadosAluno {
  id: string
  nome: string
  turma: string
  serie: string
}

export default function CorrigirOMRPage() {
  const { provaId } = useParams()
  const [etapa, setEtapa] = useState<'captura' | 'processando' | 'resultado'>('captura')
  const [preview, setPreview] = useState<string | null>(null)
  const [resultado, setResultado] = useState<ResultadoCorrecao | null>(null)
  const [dadosAluno, setDadosAluno] = useState<DadosAluno | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [progresso, setProgresso] = useState('')
  const [qrDetectado, setQrDetectado] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImagem = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
    setErro(null)
  }, [])

  const processarImagem = async () => {
    if (!preview) return
    setEtapa('processando')
    setProgresso('Carregando motor OCR...')
    setErro(null)

    try {
      const Tesseract = await import('tesseract.js')
      setProgresso('Lendo folha de respostas...')

      const { data } = await Tesseract.recognize(preview, 'por+eng', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setProgresso(`Lendo... ${Math.round(m.progress * 100)}%`)
          }
        },
      })

      const textoOCR = data.text
      console.log('OCR:', textoOCR)
      setProgresso('Identificando aluno e calculando nota...')

      const res = await fetch('/api/corrigir-omr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textoOCR,
          provaId,
          alunoId: null,
          gabarito: null,
          totalQuestoes: null,
        }),
      })

      const data2 = await res.json()

      if (!res.ok || data2.erro) {
        setErro(data2.erro ?? 'Erro ao processar')
        setEtapa('captura')
        return
      }

      setQrDetectado(data2.qrDetectado)
      setDadosAluno(data2.dadosAluno)
      setResultado(data2.resultado)
      setEtapa('resultado')

    } catch (err) {
      console.error(err)
      setErro('Falha no processamento. Tente novamente.')
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
    <div className="min-h-screen bg-gray-50 p-4 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">📷 Correção por Câmera</h1>
        <p className="text-gray-500 text-sm mt-1">Fotografe a folha de respostas — o aluno é identificado automaticamente pelo QR Code</p>
      </div>

      {etapa === 'captura' && (
        <div className="space-y-4">
          {/* Dica QR */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
            <p className="font-semibold mb-1">💡 Como funciona</p>
            <p>Cada folha de resposta tem um QR Code exclusivo com o nome do aluno e a prova. Basta fotografar — o sistema identifica tudo automaticamente.</p>
          </div>

          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-blue-300 rounded-2xl p-8 text-center cursor-pointer hover:bg-blue-50 transition"
          >
            {preview ? (
              <img src={preview} alt="Folha capturada" className="max-h-64 mx-auto rounded-xl object-contain" />
            ) : (
              <div>
                <p className="text-4xl mb-3">📄</p>
                <p className="font-semibold text-blue-600">Toque para fotografar ou selecionar</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG — máx. 10MB</p>
              </div>
            )}
          </div>

          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleImagem} className="hidden" />

          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">⚠️ {erro}</div>
          )}

          {preview && (
            <div className="flex gap-3">
              <button onClick={reiniciar} className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 font-medium hover:bg-gray-100 transition">
                Trocar foto
              </button>
              <button onClick={processarImagem} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition">
                Corrigir agora →
              </button>
            </div>
          )}
        </div>
      )}

      {etapa === 'processando' && (
        <div className="text-center py-20">
          <div className="inline-block animate-spin text-4xl mb-4">⚙️</div>
          <p className="font-semibold text-gray-700">{progresso || 'Processando...'}</p>
          <p className="text-sm text-gray-400 mt-1">Aguarde alguns segundos</p>
        </div>
      )}

      {etapa === 'resultado' && resultado && (
        <div className="space-y-4">
          {/* Badge QR */}
          {qrDetectado ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 font-medium">
              ✅ QR Code identificado automaticamente
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-700">
              ⚠️ QR Code não detectado — identificação manual necessária
            </div>
          )}

          {/* Dados do aluno */}
          {dadosAluno && (
            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">Aluno identificado</p>
              <p className="font-bold text-gray-800 text-lg">{dadosAluno.nome}</p>
              <p className="text-gray-500 text-sm">Turma {dadosAluno.turma} · {dadosAluno.serie}</p>
            </div>
          )}

          <ResultadoOMR
            resultado={resultado}
            nomeAluno={dadosAluno?.nome}
            onNovo={reiniciar}
          />
        </div>
      )}
    </div>
  )
}