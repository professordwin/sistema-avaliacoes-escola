'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import QRCode from 'qrcode'

interface ProvaData {
  prova: {
    id: string
    titulo: string
    instrucoes?: string
    disciplina?: string
    professor?: string
  }
  questoes: { enunciado: string; alternativas: { letra: string; correta: boolean }[] }[]
}

interface Aluno {
  id: string
  nome: string
  turma: string
  serie: string
}

const LETRAS = ['A', 'B', 'C', 'D', 'E']
const QUESTOES_POR_LINHA = 5

export default function ImprimirFolhaRespostas() {
  const params = useParams<{ id: string }>()

  const [data, setData] = useState<ProvaData | null>(null)
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [turmas, setTurmas] = useState<string[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState('')
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({})
  const [totalQuestoes, setTotalQuestoes] = useState(0)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      try {
        const [provaRes, alunosRes] = await Promise.all([
          fetch(`/api/provas/${params.id}/pdf`),
          fetch('/api/alunos'),
        ])
        const provaData = await provaRes.json()
        const alunosData = await alunosRes.json()

        setData(provaData)
        setTotalQuestoes(provaData.questoes?.length ?? 0)

        if (Array.isArray(alunosData)) {
          setAlunos(alunosData)
          const turmasUnicas = [...new Set(alunosData.map((a: Aluno) => a.turma))].sort() as string[]
          setTurmas(turmasUnicas)
          if (turmasUnicas.length > 0) setTurmaSelecionada(turmasUnicas[0])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [params.id])

  useEffect(() => {
    async function gerarQRCodes() {
      if (!data?.prova?.id || alunos.length === 0) return
      const qrs: Record<string, string> = {}
      for (const aluno of alunos) {
        try {
          qrs[aluno.id] = await QRCode.toDataURL(
            `PROVA:${data.prova.id}|ALUNO:${aluno.id}`,
            { width: 180, margin: 1, errorCorrectionLevel: 'H' }
          )
        } catch (err) {
          console.error(err)
        }
      }
      setQrCodes(qrs)
    }
    gerarQRCodes()
  }, [data, alunos])

  const alunosFiltrados = turmaSelecionada
    ? alunos.filter(a => a.turma === turmaSelecionada)
    : alunos

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Preparando folhas...</p>
      </div>
    )
  }

  if (!data?.prova) {
    return <div className="p-8"><p className="text-red-500">Prova não encontrada.</p></div>
  }

  const prova = data.prova

  // Gera linhas de questões
  const linhas: number[][] = []
  for (let i = 0; i < totalQuestoes; i += QUESTOES_POR_LINHA) {
    linhas.push(Array.from({ length: Math.min(QUESTOES_POR_LINHA, totalQuestoes - i) }, (_, j) => i + j + 1))
  }

  const FolhaRespostas = ({ aluno, qr }: { aluno: Aluno; qr?: string }) => (
    <div className="w-[210mm] mx-auto bg-white print:break-after-page" style={{ minHeight: '297mm', padding: '12mm' }}>
      
      {/* CABEÇALHO */}
      <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b-2 border-black">
        
        {/* INFO ESCOLA/PROVA */}
        <div className="flex-1">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Folha de Respostas</div>
          <h1 className="text-lg font-bold text-black leading-tight">{prova.titulo}</h1>
          <p className="text-sm text-gray-600 mt-0.5">{prova.disciplina} — Prof. {prova.professor}</p>
          
          {/* DADOS DO ALUNO */}
          <div className="mt-3 flex gap-4">
            <div className="flex-1 border-b-2 border-black pb-0.5">
              <div className="text-xs text-gray-400 mb-0.5">Nome do aluno</div>
              <div className="text-sm font-bold text-black">{aluno.nome}</div>
            </div>
            <div className="w-16 border-b-2 border-black pb-0.5">
              <div className="text-xs text-gray-400 mb-0.5">Turma</div>
              <div className="text-sm font-bold text-black">{aluno.turma}</div>
            </div>
            <div className="w-24 border-b-2 border-black pb-0.5">
              <div className="text-xs text-gray-400 mb-0.5">Data</div>
              <div className="text-sm text-black">___/___/______</div>
            </div>
          </div>
        </div>

        {/* QR CODE GRANDE */}
        <div className="flex flex-col items-center flex-shrink-0">
          {qr ? (
            <>
              <img src={qr} alt="QR Code" style={{ width: '45mm', height: '45mm' }} />
              <p className="text-xs text-gray-400 mt-1 text-center">NÃO RASURE</p>
            </>
          ) : (
            <div style={{ width: '45mm', height: '45mm' }} className="border-2 border-dashed border-gray-300 flex items-center justify-center">
              <span className="text-xs text-gray-400">QR</span>
            </div>
          )}
        </div>
      </div>

      {/* INSTRUÇÃO */}
      <div className="mb-4 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-3 py-2">
        <strong>Instruções:</strong> Preencha completamente o círculo da alternativa escolhida. Não rasure e não use corretivo.
      </div>

      {/* GRADE DE BOLHAS */}
      <div className="border-2 border-black rounded">
        
        {/* CABEÇALHO DA GRADE */}
        <div className="grid border-b-2 border-black bg-gray-100" style={{ gridTemplateColumns: '32px repeat(5, 1fr)' }}>
          <div className="text-xs font-bold text-center py-2 border-r border-gray-400">Nº</div>
          {LETRAS.map(l => (
            <div key={l} className="text-xs font-bold text-center py-2 border-r border-gray-300 last:border-r-0">{l}</div>
          ))}
        </div>

        {/* LINHAS DE QUESTÕES */}
        {linhas.map((linha, li) => (
          <div key={li} className="flex border-b border-gray-200 last:border-b-0">
            {linha.map((num) => (
              <div key={num} className="flex-1 flex items-center border-r border-gray-200 last:border-r-0" style={{ minHeight: '11mm' }}>
                {/* Número */}
                <div className="text-xs font-bold text-gray-700 text-center flex-shrink-0" style={{ width: '32px' }}>
                  {num}
                </div>
                {/* Bolhas */}
                {LETRAS.map(l => (
                  <div key={l} className="flex-1 flex items-center justify-center">
                    <div
                      style={{
                        width: '9mm',
                        height: '9mm',
                        borderRadius: '50%',
                        border: '1.5px solid #333',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ fontSize: '8px', color: '#555', fontWeight: 'bold' }}>{l}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {/* Preencher células vazias se a linha tiver menos que 5 questões */}
            {linha.length < QUESTOES_POR_LINHA && Array.from({ length: QUESTOES_POR_LINHA - linha.length }).map((_, i) => (
              <div key={`empty-${i}`} className="flex-1 bg-gray-50" />
            ))}
          </div>
        ))}
      </div>

      {/* RODAPÉ */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          ID: {prova.id.slice(0, 8).toUpperCase()} | {aluno.id.slice(0, 6).toUpperCase()}
        </p>
        <p className="text-xs text-gray-400">{totalQuestoes} questões</p>
      </div>
    </div>
  )

  return (
    <>
      {/* BARRA DE CONTROLE — só na tela, não imprime */}
      <div className="print:hidden sticky top-0 z-10 bg-gray-900 text-white px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <a href="/professor/provas" className="text-gray-400 hover:text-white text-sm">← Voltar</a>
          <span className="text-gray-600">|</span>
          <span className="font-medium text-sm">{prova.titulo} — Folha de Respostas</span>
        </div>

        <div className="flex items-center gap-3">
          {turmas.length > 0 ? (
            <select
              value={turmaSelecionada}
              onChange={e => setTurmaSelecionada(e.target.value)}
              className="px-3 py-1.5 bg-gray-700 rounded text-sm text-white"
            >
              <option value="">Todas as turmas</option>
              {turmas.map(t => (
                <option key={t} value={t}>
                  Turma {t} ({alunos.filter(a => a.turma === t).length} alunos)
                </option>
              ))}
            </select>
          ) : (
            <span className="text-yellow-400 text-sm">⚠️ Nenhum aluno cadastrado</span>
          )}

          <button
            onClick={() => window.print()}
            disabled={alunosFiltrados.length === 0}
            className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 rounded text-sm font-medium transition"
          >
            🖨️ Imprimir ({alunosFiltrados.length} folhas)
          </button>
        </div>
      </div>

      {/* AVISO SE SEM ALUNOS */}
      {alunosFiltrados.length === 0 && (
        <div className="print:hidden max-w-lg mx-auto mt-12 p-6 bg-yellow-50 border border-yellow-200 rounded-2xl text-center">
          <p className="text-2xl mb-2">⚠️</p>
          <p className="font-semibold text-yellow-800">Nenhum aluno cadastrado</p>
          <p className="text-yellow-600 text-sm mt-1">Importe a planilha de alunos antes de imprimir.</p>
          <a href="/professor/alunos" className="inline-block mt-3 px-4 py-2 bg-yellow-600 text-white rounded-xl text-sm font-medium">
            Ir para Alunos
          </a>
        </div>
      )}

      {/* FOLHAS */}
      {alunosFiltrados.map(aluno => (
        <FolhaRespostas
          key={aluno.id}
          aluno={aluno}
          qr={qrCodes[aluno.id]}
        />
      ))}

      <style jsx global>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print\\:hidden { display: none !important; }
          @page { margin: 0; size: A4; }
          body { margin: 0; }
        }
      `}</style>
    </>
  )
}

