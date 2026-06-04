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
const QUESTOES_POR_LINHA = 3

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
            { width: 200, margin: 1, errorCorrectionLevel: 'H' }
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

  // Agrupa questões em linhas de 3
  const linhas: number[][] = []
  for (let i = 0; i < totalQuestoes; i += QUESTOES_POR_LINHA) {
    linhas.push(
      Array.from(
        { length: Math.min(QUESTOES_POR_LINHA, totalQuestoes - i) },
        (_, j) => i + j + 1
      )
    )
  }

  const FolhaRespostas = ({ aluno, qr }: { aluno: Aluno; qr?: string }) => (
    <div
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '14mm',
        margin: '0 auto',
        background: 'white',
        pageBreakAfter: 'always',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8mm', paddingBottom: '4mm', borderBottom: '2px solid black', marginBottom: '4mm' }}>
        
        {/* INFO */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2mm' }}>
            Folha de Respostas
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'black', marginBottom: '1mm' }}>
            {prova.titulo}
          </div>
          <div style={{ fontSize: '11px', color: '#555', marginBottom: '4mm' }}>
            {prova.disciplina} — Prof. {prova.professor}
          </div>

          {/* DADOS DO ALUNO */}
          <div style={{ display: 'flex', gap: '6mm', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, borderBottom: '2px solid black', paddingBottom: '1mm' }}>
              <div style={{ fontSize: '8px', color: '#999', marginBottom: '1mm' }}>Nome do aluno</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'black' }}>{aluno.nome}</div>
            </div>
            <div style={{ width: '18mm', borderBottom: '2px solid black', paddingBottom: '1mm' }}>
              <div style={{ fontSize: '8px', color: '#999', marginBottom: '1mm' }}>Turma</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'black' }}>{aluno.turma}</div>
            </div>
            <div style={{ width: '28mm', borderBottom: '2px solid black', paddingBottom: '1mm' }}>
              <div style={{ fontSize: '8px', color: '#999', marginBottom: '1mm' }}>Data</div>
              <div style={{ fontSize: '12px', color: 'black' }}>____/____/______</div>
            </div>
          </div>
        </div>

        {/* QR CODE */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          {qr ? (
            <>
              <img src={qr} alt="QR Code" style={{ width: '42mm', height: '42mm' }} />
              <div style={{ fontSize: '8px', color: '#999', marginTop: '1mm', textAlign: 'center' }}>NÃO RASURE</div>
            </>
          ) : (
            <div style={{ width: '42mm', height: '42mm', border: '2px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '10px', color: '#999' }}>QR</span>
            </div>
          )}
        </div>
      </div>

      {/* INSTRUÇÃO */}
      <div style={{ fontSize: '10px', color: '#555', background: '#f9f9f9', border: '1px solid #ddd', borderRadius: '3px', padding: '2mm 3mm', marginBottom: '5mm' }}>
        <strong>Instruções:</strong> Preencha completamente o círculo da alternativa escolhida com caneta azul ou preta. Não rasure e não use corretivo.
      </div>

      {/* GRADE DE BOLHAS */}
      <div style={{ border: '2px solid black', borderRadius: '4px', overflow: 'hidden' }}>
        
        {/* HEADER DA GRADE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: '#f0f0f0', borderBottom: '2px solid black' }}>
          {[0, 1, 2].map(col => (
            <div key={col} style={{
              display: 'grid',
              gridTemplateColumns: '22px repeat(5, 1fr)',
              borderRight: col < 2 ? '2px solid black' : 'none',
            }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', textAlign: 'center', padding: '2mm 0', borderRight: '1px solid #ccc' }}>Nº</div>
              {LETRAS.map(l => (
                <div key={l} style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'center', padding: '2mm 0' }}>{l}</div>
              ))}
            </div>
          ))}
        </div>

        {/* LINHAS */}
        {linhas.map((linha, li) => (
          <div
            key={li}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              borderBottom: li < linhas.length - 1 ? '1px solid #ddd' : 'none',
            }}
          >
            {Array.from({ length: 3 }).map((_, col) => {
              const num = linha[col]
              return (
                <div
                  key={col}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '22px repeat(5, 1fr)',
                    alignItems: 'center',
                    minHeight: '12mm',
                    borderRight: col < 2 ? '2px solid black' : 'none',
                    background: num ? 'white' : '#fafafa',
                  }}
                >
                  {num ? (
                    <>
                      <div style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'center', color: '#333', borderRight: '1px solid #ddd' }}>
                        {num}
                      </div>
                      {LETRAS.map(l => (
                        <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{
                            width: '10mm',
                            height: '10mm',
                            borderRadius: '50%',
                            border: '1.5px solid #333',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}>
                            <span style={{ fontSize: '8px', color: '#444', fontWeight: 'bold' }}>{l}</span>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div style={{ gridColumn: '1 / -1', background: '#f5f5f5' }} />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* RODAPÉ */}
      <div style={{ marginTop: '3mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '9px', color: '#aaa' }}>
          ID: {prova.id.slice(0, 8).toUpperCase()} | {aluno.id.slice(0, 6).toUpperCase()}
        </div>
        <div style={{ fontSize: '9px', color: '#aaa' }}>
          {totalQuestoes} questões
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* BARRA DE CONTROLE */}
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

      {/* AVISO SEM ALUNOS */}
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
          body { margin: 0; background: white; }
        }
      `}</style>
    </>
  )
}

