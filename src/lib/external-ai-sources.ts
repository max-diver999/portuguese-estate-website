export type ExternalAiSource =
  | 'Perplexity'
  | 'ChatGPT'
  | 'Bing Copilot'
  | 'Claude'
  | 'Gemini'
  | 'Grok'
  | 'Mistral'
  | 'Meta AI'
  | 'DeepSeek'
  | 'Other AI'

const SOURCES: ReadonlyArray<{
  source: Exclude<ExternalAiSource, 'Other AI'>
  patterns: RegExp[]
}> = [
  {
    source: 'Perplexity',
    patterns: [/(^|\.)perplexity\.ai$/i, /\bperplexity\b/i],
  },
  {
    source: 'ChatGPT',
    patterns: [/(^|\.)chatgpt\.com$/i, /(^|\.)chat\.openai\.com$/i],
  },
  {
    source: 'Bing Copilot',
    patterns: [
      /(^|\.)copilot\.microsoft\.com$/i,
      /(^|\.)copilot\.com$/i,
      /bing\.com\/(?:chat|copilot)(?:[/?#]|$)/i,
      /\bbing[\s_-]*copilot\b/i,
    ],
  },
  {
    source: 'Claude',
    patterns: [/(^|\.)claude\.ai$/i, /\bclaude\b/i],
  },
  {
    source: 'Gemini',
    patterns: [/(^|\.)gemini\.google\.com$/i, /\bgemini\b/i],
  },
  {
    source: 'Grok',
    patterns: [/(^|\.)grok\.com$/i, /(^|\.)grok\.x\.ai$/i, /^x\.ai$/i, /\bgrok\b/i],
  },
  {
    source: 'Mistral',
    patterns: [
      /(^|\.)chat\.mistral\.ai$/i,
      /(^|\.)lechat\.mistral\.ai$/i,
      /(^|\.)mistral\.ai$/i,
      /\ble[\s_-]*chat\b/i,
    ],
  },
  {
    source: 'Meta AI',
    patterns: [/(^|\.)meta\.ai$/i, /\bmeta[\s_-]*ai\b/i],
  },
  {
    source: 'DeepSeek',
    patterns: [/(^|\.)chat\.deepseek\.com$/i, /\bdeepseek\b/i],
  },
]

function normalizedCandidates(input: string) {
  const candidates = [input]
  try {
    const parsed = new URL(input)
    candidates.push(parsed.hostname, parsed.pathname, parsed.search)
  } catch {
    // Campaign labels and manually supplied referrers are also supported.
  }
  return candidates
}

export function detectExternalAiSource(
  referrerOrCampaign: string | null | undefined,
): ExternalAiSource | null {
  if (!referrerOrCampaign?.trim()) return null
  const candidates = normalizedCandidates(referrerOrCampaign.trim())

  for (const { source, patterns } of SOURCES) {
    if (patterns.some((pattern) => candidates.some((value) => pattern.test(value)))) {
      return source
    }
  }

  if (
    candidates.some((value) =>
      /(^|\.)(?:poe\.com|you\.com|phind\.com)$/i.test(value),
    )
  ) {
    return 'Other AI'
  }

  return /\b(ai|llm|copilot|chatbot|assistant)\b/i.test(
    referrerOrCampaign.replace(/[._/-]+/g, ' '),
  )
    ? 'Other AI'
    : null
}
