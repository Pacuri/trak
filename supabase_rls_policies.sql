-- RLS Policies for Onboarding Flow
-- Run these in your Supabase SQL Editor
-- 
-- This script will:
-- 1. Drop all existing policies on organizations and users tables
-- 2. Create helper functions to avoid recursion
-- 3. Create new policies

-- ============================================================================
-- STEP 1: Drop all existing policies
-- ============================================================================

-- Drop all policies on organizations table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organizations' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON organizations';
    END LOOP;
END $$;

-- Drop all policies on users table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON users';
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: Create helper functions (bypass RLS to avoid recursion)
-- ============================================================================

-- Helper function to get user's organization_id (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_organization_id(user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM users WHERE id = user_id;
$$;

-- Helper function to check if user has role (bypasses RLS)
CREATE OR REPLACE FUNCTION user_has_role(user_id uuid, roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role = ANY(roles) FROM users WHERE id = user_id;
$$;

-- ============================================================================
-- STEP 3: Enable RLS and create policies
-- ============================================================================

-- Enable RLS on organizations table
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Policy: Allow ANY authenticated user to create organizations (for onboarding)
-- This is critical - allows users to create orgs before they have a user record
CREATE POLICY "Allow authenticated users to create organizations"
ON organizations
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Users can read their own organization
CREATE POLICY "Users can read their own organization"
ON organizations
FOR SELECT
TO authenticated
USING (id = get_user_organization_id(auth.uid()));

-- Policy: Owners and admins can update their organization
CREATE POLICY "Owners and admins can update their organization"
ON organizations
FOR UPDATE
TO authenticated
USING (
  id = get_user_organization_id(auth.uid())
  AND user_has_role(auth.uid(), ARRAY['owner', 'admin'])
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to create their own user record (for onboarding)
CREATE POLICY "Allow users to create their own user record"
ON users
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Policy: Users can read their own record
CREATE POLICY "Users can read their own record"
ON users
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Policy: Users can read users in their organization
CREATE POLICY "Users can read users in their organization"
ON users
FOR SELECT
TO authenticated
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND id != auth.uid()
);

-- Policy: Users can update their own record
CREATE POLICY "Users can update their own record"
ON users
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policy: Owners and admins can update users in their organization
CREATE POLICY "Owners and admins can update users in their organization"
ON users
FOR UPDATE
TO authenticated
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND id != auth.uid()
  AND user_has_role(auth.uid(), ARRAY['owner', 'admin'])
)
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
  AND id != auth.uid()
  AND user_has_role(auth.uid(), ARRAY['owner', 'admin'])
);
