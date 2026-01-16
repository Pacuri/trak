import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ChildrenPolicyFormSchema } from '@/lib/packages/validators'

// GET /api/packages/[id]/children-policies - List children policies for a package
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packageId } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Verify package belongs to organization
    const { data: pkg } = await supabase
      .from('packages')
      .select('id')
      .eq('id', packageId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    const { data: policies, error } = await supabase
      .from('children_policies')
      .select('*')
      .eq('package_id', packageId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching children policies:', error)
      return NextResponse.json({ error: 'Failed to fetch children policies' }, { status: 500 })
    }

    return NextResponse.json({ children_policies: policies || [] })
  } catch (error) {
    console.error('Children policies GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/packages/[id]/children-policies - Create or bulk update children policies
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: packageId } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Verify package belongs to organization
    const { data: pkg } = await supabase
      .from('packages')
      .select('id')
      .eq('id', packageId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    const body = await request.json()
    const { children_policies } = body

    if (!Array.isArray(children_policies)) {
      return NextResponse.json({ error: 'children_policies must be an array' }, { status: 400 })
    }

    // Validate all policies
    const validatedPolicies = []
    for (const policy of children_policies) {
      const result = ChildrenPolicyFormSchema.safeParse(policy)
      if (!result.success) {
        return NextResponse.json({ 
          error: 'Validation failed', 
          details: result.error.flatten() 
        }, { status: 400 })
      }
      validatedPolicies.push(result.data)
    }

    // Check for overlapping age ranges
    for (let i = 0; i < validatedPolicies.length; i++) {
      for (let j = i + 1; j < validatedPolicies.length; j++) {
        const a = validatedPolicies[i]
        const b = validatedPolicies[j]
        
        if (a.age_from < b.age_to && b.age_from < a.age_to) {
          return NextResponse.json({ 
            error: `Uzrasne kategorije "${a.label || i + 1}" i "${b.label || j + 1}" se preklapaju` 
          }, { status: 400 })
        }
      }
    }

    // Get existing policies
    const { data: existingPolicies } = await supabase
      .from('children_policies')
      .select('id')
      .eq('package_id', packageId)

    const existingIds = new Set(existingPolicies?.map(p => p.id) || [])
    const newPolicyIds = new Set(validatedPolicies.filter(p => p.id).map(p => p.id))

    // Delete policies that are no longer in the list
    const toDelete = [...existingIds].filter(id => !newPolicyIds.has(id))
    if (toDelete.length > 0) {
      await supabase
        .from('children_policies')
        .delete()
        .in('id', toDelete)
    }

    // Upsert policies
    const upsertedPolicies = []
    for (let i = 0; i < validatedPolicies.length; i++) {
      const policy = validatedPolicies[i]

      const policyPayload = {
        ...policy,
        package_id: packageId,
        organization_id: userData.organization_id,
        sort_order: i,
      }

      if (policy.id && existingIds.has(policy.id)) {
        // Update existing
        const { data, error } = await supabase
          .from('children_policies')
          .update(policyPayload)
          .eq('id', policy.id)
          .select()
          .single()

        if (error) throw error
        upsertedPolicies.push(data)
      } else {
        // Insert new
        const { id: _, ...insertPayload } = policyPayload
        const { data, error } = await supabase
          .from('children_policies')
          .insert(insertPayload)
          .select()
          .single()

        if (error) throw error
        upsertedPolicies.push(data)
      }
    }

    return NextResponse.json({ children_policies: upsertedPolicies })
  } catch (error) {
    console.error('Children policies POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
