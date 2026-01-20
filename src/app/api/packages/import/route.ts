import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { 
  parseDocumentWithVision, 
  parseStructuredData,
  parsePdfDocument,
  validateParseResult,
  applyMarginToResult 
} from '@/lib/anthropic'
import type { LanguageRegion } from '@/lib/prompts/document-parse-prompt'
import * as XLSX from 'xlsx'
import type { DocumentParseResult, DocumentImport } from '@/types/import'

export const maxDuration = 60 // Allow up to 60 seconds for AI processing

/**
 * POST /api/packages/import
 * Upload and parse a document using Claude AI
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.organization_id) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 400 })
    }

    const organizationId = userData.organization_id

    // Get organization language setting
    const { data: orgData } = await supabase
      .from('organizations')
      .select('language_region')
      .eq('id', organizationId)
      .single()
    
    const languageRegion = (orgData?.language_region || 'rs') as LanguageRegion

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const marginPercent = formData.get('margin_percent') as string | null
    const additionalContext = formData.get('context') as string | null
    const currency = formData.get('currency') as string | null // User-specified currency

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate currency if provided
    const validCurrencies = ['EUR', 'KM', 'RSD']
    const userCurrency = currency && validCurrencies.includes(currency) ? currency : 'EUR'

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: `File type not supported: ${file.type}. Allowed: PDF, JPG, PNG, XLSX` 
      }, { status: 400 })
    }

    // Create import record
    const { data: importRecord, error: insertError } = await supabase
      .from('document_imports')
      .insert({
        organization_id: organizationId,
        file_name: file.name,
        file_type: file.type,
        file_url: '', // Will update after upload
        file_size_bytes: file.size,
        status: 'processing',
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError || !importRecord) {
      console.error('Error creating import record:', insertError)
      return NextResponse.json({ error: 'Failed to create import record' }, { status: 500 })
    }

    try {
      // Upload file to Supabase Storage
      const fileBuffer = await file.arrayBuffer()
      const fileName = `${organizationId}/${importRecord.id}/${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, fileBuffer, {
          contentType: file.type,
          upsert: false,
        })

      if (uploadError) {
        console.error('Error uploading file:', uploadError)
        throw new Error('Failed to upload file')
      }

      // Get file URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      // Update import record with file URL
      await supabase
        .from('document_imports')
        .update({ file_url: urlData.publicUrl })
        .eq('id', importRecord.id)

      // Parse document based on type
      // Add currency context to help AI parse correctly
      const currencyContext = `IMPORTANT: All prices in this document are in ${userCurrency}. Do NOT convert prices, keep them in their original currency (${userCurrency}).`
      const fullContext = additionalContext 
        ? `${currencyContext}\n\n${additionalContext}`
        : currencyContext

      let parseResult: DocumentParseResult

      if (file.type.startsWith('image/')) {
        // Image: Send directly to Claude vision
        const base64 = Buffer.from(fileBuffer).toString('base64')
        parseResult = await parseDocumentWithVision(
          base64, 
          file.type,
          fullContext,
          languageRegion
        )
      } else if (file.type === 'application/pdf') {
        // PDF: Send directly to Claude - it supports native PDF parsing
        // Reference: https://docs.anthropic.com/en/docs/build-with-claude/pdf-support
        const base64 = Buffer.from(fileBuffer).toString('base64')
        parseResult = await parsePdfDocument(
          base64,
          fullContext,
          languageRegion
        )
      } else {
        // Excel: Parse with XLSX and send structured data to Claude
        const workbook = XLSX.read(fileBuffer, { type: 'array' })
        
        // Convert all sheets to text
        let tableData = ''
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName]
          const csv = XLSX.utils.sheet_to_csv(sheet)
          tableData += `Sheet: ${sheetName}\n${csv}\n\n`
        }

        parseResult = await parseStructuredData(
          tableData,
          fullContext,
          languageRegion
        )
      }

      // Override currency with user-specified value (user knows their document)
      parseResult.currency = userCurrency as 'EUR' | 'KM' | 'RSD'
      // Also update each package's currency
      parseResult.packages = parseResult.packages.map(pkg => ({
        ...pkg,
        currency: userCurrency as 'EUR' | 'KM' | 'RSD',
      }))

      // Validate parse result — ensure confidence exists (AI may return parsing_confidence only)
      const validationIssues = validateParseResult(parseResult)
      if (validationIssues.length > 0) {
        if (!parseResult.confidence) {
          parseResult.confidence = {
            overall: parseResult.parsing_confidence?.overall ?? 0.5,
            issues: parseResult.parsing_confidence?.issues ?? [],
          }
        }
        parseResult.confidence.issues = [
          ...(parseResult.confidence.issues || []),
          ...validationIssues,
        ]
      }

      // Apply margin if specified
      if (marginPercent && parseResult.business_model === 'vlastita_marza') {
        const margin = parseFloat(marginPercent)
        if (!isNaN(margin) && margin > 0) {
          parseResult = applyMarginToResult(parseResult, margin)
        }
      }

      // Update import record with results
      await supabase
        .from('document_imports')
        .update({
          status: 'completed',
          parsed_at: new Date().toISOString(),
          parse_result: parseResult,
          packages_found: parseResult.packages.length,
        })
        .eq('id', importRecord.id)

      return NextResponse.json({
        success: true,
        import_id: importRecord.id,
        result: {
          ...parseResult,
          // Ensure all enhanced fields are included (even if empty)
          supplements: parseResult.supplements || [],
          mandatory_fees: parseResult.mandatory_fees || [],
          discounts: parseResult.discounts || [],
          policies: parseResult.policies || null,
          included_services: parseResult.included_services || [],
          important_notes: parseResult.important_notes || [],
        },
      })

    } catch (parseError) {
      console.error('Error parsing document:', parseError)
      
      // Update import record with error
      await supabase
        .from('document_imports')
        .update({
          status: 'failed',
          error_message: parseError instanceof Error ? parseError.message : 'Unknown error',
        })
        .eq('id', importRecord.id)

      return NextResponse.json({ 
        error: 'Failed to parse document',
        details: parseError instanceof Error ? parseError.message : 'Unknown error',
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in document import:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

/**
 * GET /api/packages/import
 * List document imports for the organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'User organization not found' }, { status: 400 })
    }

    // Get query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: imports, error, count } = await supabase
      .from('document_imports')
      .select('*', { count: 'exact' })
      .eq('organization_id', userData.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching imports:', error)
      return NextResponse.json({ error: 'Failed to fetch imports' }, { status: 500 })
    }

    return NextResponse.json({
      imports: imports as DocumentImport[],
      total: count || 0,
      limit,
      offset,
    })

  } catch (error) {
    console.error('Error fetching imports:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
