import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Tipos do sistema
export type Papel = 'superadmin' | 'diretor' | 'coordenador' | 'professor'
export type StatusProva = 'rascunho' | 'aguardando_aprovacao' | 'aprovada' | 'aplicada' | 'arquivada'
export type NivelDificuldade = 'facil' | 'medio' | 'dificil'

export interface Usuario {
  id: string
  tenant_id: string
  nome: string
  email: string
  papel: Papel
  area_coordenacao?: string
  disciplinas?: string[]
  ativo: boolean
}

export interface Disciplina {
  id: string
  nome: string
  codigo: string
  area_conhecimento: string
  cor_hex: string
}

export interface Questao {
  id: string
  disciplina_id: string
  enunciado: string
  tipo: 'multipla_escolha' | 'verdadeiro_falso'
  nivel_dificuldade: NivelDificuldade
  fonte?: string
  fonte_detalhe?: string
  ano_fonte?: number
  aprovada: boolean
  alternativas?: Alternativa[]
}

export interface Alternativa {
  id: string
  questao_id: string
  letra: 'A' | 'B' | 'C' | 'D' | 'E'
  texto: string
  correta: boolean
}

export interface Prova {
  id: string
  professor_id: string
  disciplina_id: string
  titulo: string
  instrucoes?: string
  status: StatusProva
  criado_em: string
}