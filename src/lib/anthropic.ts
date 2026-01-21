import Anthropic from '@anthropic-ai/sdk'
import type { 
  DocumentParseResult, 
} from '@/types/import'
import { getSystemPrompt, getDocumentParsePrompt, type LanguageRegion } from '@/lib/prompts/document-parse-prompt'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Re-export for backward compatibility
export { getSystemPrompt, getDocumentParsePrompt }
export type { LanguageRegion }

/**
 * Parse a document using Claude's vision capability
 */
export async function parseDocumentWithVision(
  imageBase64: string,
  mimeType: string,
  additionalContext?: string,
  languageRegion: LanguageRegion = 'ba'
): Promise<DocumentParseResult> {
  const systemPrompt = getSystemPrompt(languageRegion)
  const userPrompt = getDocumentParsePrompt(languageRegion) + 
    (additionalContext ? `\n\nAdditional context: ${additionalContext}` : '')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
      system: systemPrompt,
    })

    // Extract text from response
    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    console.log(`Claude response length: ${textContent.text.length} chars, stop_reason: ${response.stop_reason}`)

    // Extract JSON (handle code blocks)
    let jsonString = textContent.text
    const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1]
    }

    const jsonMatch = jsonString.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    try {
      return JSON.parse(jsonMatch[0]) as DocumentParseResult
    } catch {
      const repaired = repairJson(jsonMatch[0])
      return JSON.parse(repaired) as DocumentParseResult
    }
  } catch (error) {
    console.error('Error parsing document with Claude:', error)
    throw error
  }
}

/**
 * Parse structured data (e.g., from Excel) with Claude
 */
export async function parseStructuredData(
  tableData: string,
  additionalContext?: string,
  languageRegion: LanguageRegion = 'ba'
): Promise<DocumentParseResult> {
  const systemPrompt = getSystemPrompt(languageRegion)
  const basePrompt = getDocumentParsePrompt(languageRegion)
  
  const userPrompt = `${basePrompt}

The data is from an Excel/spreadsheet file:
\`\`\`
${tableData}
\`\`\`
${additionalContext ? `\nAdditional context: ${additionalContext}` : ''}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    })

    const textContent = response.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    console.log(`Claude response length: ${textContent.text.length} chars, stop_reason: ${response.stop_reason}`)

    // Extract JSON (handle code blocks)
    let jsonString = textContent.text
    const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1]
    }

    const jsonMatch = jsonString.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    try {
      return JSON.parse(jsonMatch[0]) as DocumentParseResult
    } catch {
      const repaired = repairJson(jsonMatch[0])
      return JSON.parse(repaired) as DocumentParseResult
    }
  } catch (error) {
    console.error('Error parsing structured data with Claude:', error)
    throw error
  }
}

/**
 * Attempt to repair truncated or malformed JSON
 */
function repairJson(jsonString: string): string {
  let repaired = jsonString.trim()
  
  // Count opening and closing braces/brackets
  const openBraces = (repaired.match(/\{/g) || []).length
  const closeBraces = (repaired.match(/\}/g) || []).length
  const openBrackets = (repaired.match(/\[/g) || []).length
  const closeBrackets = (repaired.match(/\]/g) || []).length
  
  // Remove trailing incomplete content after last complete value
  // Look for patterns like: ,"incomplete or trailing commas
  repaired = repaired.replace(/,\s*"[^"]*$/, '')  // Remove incomplete string at end
  repaired = repaired.replace(/,\s*$/, '')        // Remove trailing comma
  repaired = repaired.replace(/,\s*\}/, '}')      // Remove comma before }
  repaired = repaired.replace(/,\s*\]/, ']')      // Remove comma before ]
  
  // Add missing closing brackets/braces
  const missingBrackets = openBrackets - closeBrackets
  const missingBraces = openBraces - closeBraces
  
  for (let i = 0; i < missingBrackets; i++) {
    repaired += ']'
  }
  for (let i = 0; i < missingBraces; i++) {
    repaired += '}'
  }
  
  return repaired
}

/**
 * Parse PDF using Claude's native PDF support with STREAMING
 * Streaming is required for long-running PDF operations (>10 minutes)
 * Reference: https://docs.anthropic.com/en/docs/build-with-claude/pdf-support
 */
export async function parsePdfDocument(
  pdfBase64: string,
  additionalContext?: string,
  languageRegion: LanguageRegion = 'ba'
): Promise<DocumentParseResult> {
  const systemPrompt = getSystemPrompt(languageRegion)
  const userPrompt = getDocumentParsePrompt(languageRegion) +
    (additionalContext ? `\n\nAdditional context: ${additionalContext}` : '')

  try {
    // PDF requires Sonnet - Haiku doesn't support native PDF parsing
    // Using streaming for long-running PDF operations (required by Anthropic SDK)
    console.log('Starting PDF parse with streaming...')
    
    let fullResponse = ''
    
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
      system: systemPrompt,
    })

    // Collect streamed response
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullResponse += event.delta.text
      }
    }

    const finalMessage = await stream.finalMessage()
    
    // Log response info for debugging
    console.log(`Claude response length: ${fullResponse.length} chars, stop_reason: ${finalMessage.stop_reason}`)
    
    // Check if response was truncated
    if (finalMessage.stop_reason === 'max_tokens') {
      console.warn('Warning: Response was truncated due to max_tokens limit')
    }

    if (!fullResponse) {
      throw new Error('No text response from Claude')
    }

    // Extract JSON from response (handle markdown code blocks too)
    let jsonString = fullResponse
    
    // Remove markdown code block if present
    const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonString = codeBlockMatch[1]
    }
    
    // Find the JSON object
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Raw response:', fullResponse.substring(0, 500))
      throw new Error('No JSON found in response')
    }

    const jsonToParse = jsonMatch[0]
    
    // Try to parse, and if it fails, attempt repair
    try {
      const result = JSON.parse(jsonToParse) as DocumentParseResult
      return result
    } catch (parseError) {
      console.warn('Initial JSON parse failed, attempting repair...')
      const repaired = repairJson(jsonToParse)
      
      try {
        const result = JSON.parse(repaired) as DocumentParseResult
        console.log('JSON repair successful')
        return result
      } catch (repairError) {
        // Log more details for debugging
        console.error('JSON repair failed. Original error:', parseError)
        console.error('JSON length:', jsonToParse.length)
        console.error('Last 200 chars:', jsonToParse.slice(-200))
        throw parseError
      }
    }
  } catch (error) {
    console.error('Error parsing PDF with Claude:', error)
    throw error
  }
}

/**
 * Apply margin to parsed prices
 */
export function applyMarginToResult(
  result: DocumentParseResult,
  marginPercent: number
): DocumentParseResult {
  const multiplier = 1 + marginPercent / 100

  return {
    ...result,
    packages: result.packages.map(pkg => ({
      ...pkg,
      price_matrix: Object.fromEntries(
        Object.entries(pkg.price_matrix).map(([interval, rooms]) => [
          interval,
          Object.fromEntries(
            Object.entries(rooms).map(([room, meals]) => [
              room,
              Object.fromEntries(
                Object.entries(meals).map(([meal, price]) => [
                  meal,
                  Math.ceil(price * multiplier), // Round up
                ])
              ),
            ])
          ),
        ])
      ),
    })),
    transport: result.transport
      ? {
          ...result.transport,
          prices: result.transport.prices?.map(p => ({
            ...p,
            price: Math.ceil(p.price * multiplier),
            child_price: p.child_price
              ? Math.ceil(p.child_price * multiplier)
              : undefined,
          })),
          routes: result.transport.routes?.map(r => ({
            ...r,
            adult_price: Math.ceil(r.adult_price * multiplier),
            child_price: r.child_price
              ? Math.ceil(r.child_price * multiplier)
              : undefined,
            standalone_adult_price: r.standalone_adult_price
              ? Math.ceil(r.standalone_adult_price * multiplier)
              : undefined,
            standalone_child_price: r.standalone_child_price
              ? Math.ceil(r.standalone_child_price * multiplier)
              : undefined,
          })),
        }
      : undefined,
  }
}

/**
 * Validate parsed result
 */
export function validateParseResult(result: DocumentParseResult): string[] {
  const issues: string[] = []

  if (!result.packages || result.packages.length === 0) {
    issues.push('No packages found in document')
  }

  for (const pkg of result.packages) {
    if (!pkg.hotel_name) {
      issues.push('Package missing hotel name')
    }
    if (!pkg.destination?.country) {
      issues.push(`Package "${pkg.hotel_name}": missing destination country`)
    }
    if (!pkg.room_types || pkg.room_types.length === 0) {
      issues.push(`Package "${pkg.hotel_name}": no room types found`)
    }
    if (!pkg.price_intervals || pkg.price_intervals.length === 0) {
      issues.push(`Package "${pkg.hotel_name}": no price intervals found`)
    }
    if (!pkg.price_matrix || Object.keys(pkg.price_matrix).length === 0) {
      issues.push(`Package "${pkg.hotel_name}": no prices found`)
    }
  }

  return issues
}
