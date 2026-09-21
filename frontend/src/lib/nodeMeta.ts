export const KNOWN_TYPES = ['File', 'Class', 'Function', 'Module', 'Service', 'Concept'] as const

export const normalizeType = (rawType: string): string =>
  (KNOWN_TYPES as readonly string[]).includes(rawType) ? rawType : 'Module'

export interface TypeMeta {
  accent: string
  glyph: string
}

// Restrained accent per node type (used only for icon / thin border / badge).
const TYPE_META: Record<string, TypeMeta> = {
  Module: { accent: '#a855f7', glyph: '◆' },
  File: { accent: '#94a3b8', glyph: '▤' },
  Class: { accent: '#6d7cff', glyph: '◇' },
  Function: { accent: '#22c55e', glyph: 'ƒ' },
  Service: { accent: '#ec4899', glyph: '◎' },
  Concept: { accent: '#f59e0b', glyph: '✦' },
  API: { accent: '#f59e0b', glyph: '⇄' },
  Database: { accent: '#ec4899', glyph: '⛁' },
}

const FALLBACK: TypeMeta = { accent: '#9299a8', glyph: '◇' }

export const getTypeMeta = (type: string): TypeMeta => TYPE_META[type] ?? TYPE_META[normalizeType(type)] ?? FALLBACK
