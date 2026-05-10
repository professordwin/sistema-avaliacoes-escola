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
  const params = useParams()

  const provaId =
    typeof params.provaId === 'string'
      ? params.provaId
      : Array.isArray(params.provaId)
      ? params.provaId[0]
      : ''

  const [etapa, setEtapa] = useState<
    'captura' | 'processando' | 'resultado'
  >('captura')

  const [preview, setPreview] = useState<string | null>(null)

  const [resultado, setResultado] =
    useState<ResultadoCorrecao | null>(null)

  const [dadosAluno, setDadosAluno] =
    useState<DadosAluno | null>(null)

  const [erro, setErro] = useState<string | null>(null)

  const [progresso, setProgresso] = useState('')

  const [qrDetectado, setQrDetectado] =
    useState(false)

  const [arquivoNome, setArquivoNome] =
    useState('')

  const [imagemProcessada, setImagemProcessada] =
    useState(false)

  const fileRef = useRef<HTMLInputElement>(null)

  const handleImagem = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]

      if (!file) return

      // Validação tamanho
      if (file.size > 10 * 1024 * 1024) {
        setErro('A imagem deve ter no máximo 10MB.')
        return
      }

      // Validação tipo
      if (!file.type.startsWith('image/')) {
        setErro('Selecione apenas imagens.')
        return
      }

      setArquivoNome(file.name)
      setErro(null)
      setResultado(null)
      setDadosAluno(null)
      setQrDetectado(false)

      const reader = new FileReader()

      reader.onloadend = () => {
        setPreview(reader.result as string)
        setImagemProcessada(false)
      }

      reader.readAsDataURL(file)
    },
    []
  )

  const processarImagem = async () => {
    if (!preview || !provaId) {
      setErro('Imagem ou prova inválida.')
      return
    }

    setEtapa('processando')
    setErro(null)
    setProgresso('Inicializando OCR...')

    try {
      const Tesseract = await import('tesseract.js')

      setProgresso('Lendo folha de respostas...')

      const { data } = await Tesseract.recognize(
        preview,
        'por+eng',
        {
          logger: (m: {
            status: string
            progress: number
          }) => {
            if (m.status === 'recognizing text') {
              setProgresso(
                `Lendo imagem... ${Math.round(
                  m.progress * 100
                )}%`
              )
            }
          },
        }
      )

      const textoOCR = data.text

      console.log('OCR EXTRAÍDO:', textoOCR)

      setProgresso(
        'Buscando gabarito e identificando aluno...'
      )

      const res = await fetch('/api/corrigir-omr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },

        // ✅ AJUSTADO
        body: JSON.stringify({
          textoOCR,
          provaId,
          alunoId: null,
          gabarito: null,
          totalQuestoes: null,
        }),
      })

      const resposta = await res.json()

      console.log('RESULTADO API:', resposta)

      if (!res.ok || resposta.erro) {
        throw new Error(
          resposta.erro ??
            'Erro ao processar folha.'
        )
      }

      setQrDetectado(
        Boolean(resposta.qrDetectado)
      )

      setDadosAluno(
        resposta.dadosAluno ?? null
      )

      setResultado(
        resposta.resultado ?? null
      )

      setImagemProcessada(true)

      setEtapa('resultado')
    } catch (err) {
      console.error(err)

      setErro(
        err instanceof Error
          ? err.message
          : 'Falha no processamento.'
      )

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

    setImagemProcessada(false)

    setArquivoNome('')

    if (fileRef.current) {
      fileRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              📷 Correção por Câmera
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Fotografe a folha de respostas para
              correção automática
            </p>
          </div>

          <a
            href="/professor/provas"
            className="text-sm text-indigo-600 hover:underline"
          >
            ← Voltar
          </a>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        {/* CAPTURA */}
        {etapa === 'captura' && (
          <div className="space-y-5">
            {/* CARD INFO */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
              <p className="font-semibold text-blue-800 mb-2">
                💡 Como funciona
              </p>

              <ul className="text-sm text-blue-700 space-y-1">
                <li>
                  • Fotografe a folha inteira
                </li>

                <li>
                  • O QR Code identifica o aluno
                  automaticamente
                </li>

                <li>
                  • O sistema busca o gabarito da
                  prova no Supabase
                </li>

                <li>
                  • A nota é calculada
                  automaticamente
                </li>
              </ul>
            </div>

            {/* AREA UPLOAD */}
            <div
              onClick={() =>
                fileRef.current?.click()
              }
              className="border-2 border-dashed border-blue-300 rounded-3xl p-8 bg-white text-center cursor-pointer hover:bg-blue-50 transition"
            >
              {preview ? (
                <div className="space-y-4">
                  <img
                    src={preview}
                    alt="Prévia"
                    className="max-h-96 mx-auto rounded-2xl object-contain shadow"
                  />

                  <div>
                    <p className="font-medium text-gray-700">
                      {arquivoNome}
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      Clique para trocar a imagem
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-10">
                  <p className="text-5xl mb-4">
                    📄
                  </p>

                  <p className="text-lg font-semibold text-blue-700">
                    Clique para fotografar
                  </p>

                  <p className="text-sm text-gray-500 mt-2">
                    JPG ou PNG • até 10MB
                  </p>
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImagem}
              className="hidden"
            />

            {/* ERRO */}
            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
                ⚠️ {erro}
              </div>
            )}

            {/* BOTÕES */}
            {preview && (
              <div className="flex gap-3">
                <button
                  onClick={reiniciar}
                  className="flex-1 py-3 rounded-2xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-100 transition"
                >
                  Trocar imagem
                </button>

                <button
                  onClick={processarImagem}
                  className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
                >
                  Corrigir agora →
                </button>
              </div>
            )}
          </div>
        )}

        {/* PROCESSANDO */}
        {etapa === 'processando' && (
          <div className="bg-white border rounded-3xl p-10 mt-8 text-center">
            <div className="text-5xl animate-spin mb-5">
              ⚙️
            </div>

            <h2 className="font-bold text-gray-800 text-lg">
              Processando folha
            </h2>

            <p className="text-sm text-gray-500 mt-2">
              {progresso}
            </p>

            <div className="mt-6 w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div className="bg-blue-600 h-3 w-3/4 animate-pulse" />
            </div>
          </div>
        )}

        {/* RESULTADO */}
        {etapa === 'resultado' &&
          resultado && (
            <div className="space-y-4">
              {/* STATUS QR */}
              {qrDetectado ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-700 text-sm font-medium">
                  ✅ QR Code identificado
                  automaticamente
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-yellow-700 text-sm">
                  ⚠️ QR Code não detectado
                </div>
              )}

              {/* ALUNO */}
              {dadosAluno && (
                <div className="bg-white border rounded-2xl p-5">
                  <p className="text-xs text-gray-400 mb-1">
                    Aluno identificado
                  </p>

                  <h2 className="text-xl font-bold text-gray-800">
                    {dadosAluno.nome}
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Turma {dadosAluno.turma} •{' '}
                    {dadosAluno.serie}
                  </p>
                </div>
              )}

              {/* RESULTADO */}
              <ResultadoOMR
                resultado={resultado}
                nomeAluno={
                  dadosAluno?.nome
                }
                onNovo={reiniciar}
              />

              {/* RODAPÉ */}
              {imagemProcessada && (
                <div className="text-center">
                  <button
                    onClick={reiniciar}
                    className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition"
                  >
                    Corrigir nova folha
                  </button>
                </div>
              )}
            </div>
          )}
      </main>
    </div>
  )
}