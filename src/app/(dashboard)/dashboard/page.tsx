'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Users,
  Calendar,
  CheckCircle,
  Euro,
  AlertTriangle,
  Plus,
  Globe,
  Phone
} from 'lucide-react';
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useRouter } from 'next/navigation';
import { getInitials, getAvatarGradient } from '@/lib/avatar-utils';
import { useLeads } from '@/hooks/use-leads';


export default function DashboardPage() {
  const [user, setUser] = useState<any>({ full_name: 'Nikola' });
  const [leads, setLeads] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [leadsByStage, setLeadsByStage] = useState<Array<any>>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownAlignRight, setDropdownAlignRight] = useState(true);
  const [dropdownPosition, setDropdownPosition] = useState<Record<string, { top: number; left: number; right: number }>>({});
  const avatarButtonRefs = useRef<Record<string, HTMLButtonElement>>({});

  const supabase = createClient();
  const router = useRouter();
  const { updateLead } = useLeads();

  useEffect(() => {
    async function loadData() {
      // Get current user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        setLoading(false);
        return;
      }

      // Get user record with org
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      setUser(userData);

      if (!userData?.organization_id) {
        setLoading(false);
        return;
      }

      const orgId = userData.organization_id;

      // Get leads - table is 'leads' not 'crm_leads'
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('*, stage:pipeline_stages(*), source:lead_sources(*), assignee:users!assigned_to(id, email, full_name)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      console.log('Leads data:', leadsData, 'Error:', leadsError);
      setLeads(leadsData || []);

      // Get stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('organization_id', orgId)
        .order('position');

      console.log('Stages data:', stagesData, 'Error:', stagesError);
      setStages(stagesData || []);

      // Get team members for avatar colors and assignment
      const { data: teamData } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('organization_id', orgId)
        .eq('is_active', true);
      setTeamMembers(teamData || []);

      // Initialize leadsByStage state
      if (stagesData && leadsData) {
        const grouped = stagesData.map(stage => ({
          ...stage,
          leads: leadsData.filter((l: any) => l.stage_id === stage.id)
        }));
        setLeadsByStage(grouped);
      }

      setLoading(false);
    }
    loadData();
  }, []);

  // Calculate stats
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const leadsToday = leads.filter(l => new Date(l.created_at) >= today).length;

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const leadsThisMonth = leads.filter(l => new Date(l.created_at) >= monthStart).length;

  const wonStage = stages.find(s => s.is_won);
  const wonLeads = leads.filter(l => l.stage_id === wonStage?.id).length;
  const conversionRate = leads.length > 0 ? Math.round((wonLeads / leads.length) * 100) : 0;

  const pipelineValue = leads.reduce((sum, l) => sum + (l.value || 0), 0);

  // Leads needing attention (no activity in 3+ days)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const needsAttention = leads.filter(l => {
    const lastActivity = l.last_contact_at || l.created_at;
    return new Date(lastActivity) < threeDaysAgo && !l.closed_at;
  }).slice(0, 5);

  // Recent leads
  const recentLeads = leads.slice(0, 5);

  console.log('Stages for pipeline:', leadsByStage);

  // Separate function for DB update (fire and forget)
  const updateLeadStageInDB = async (leadId: string, newStageId: string) => {
    const { error } = await supabase
      .from('leads')
      .update({ stage_id: newStageId })
      .eq('id', leadId);
      
    if (error) {
      console.error('Failed to update lead stage:', error);
      // Optionally refetch data to resync
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*, stage:pipeline_stages(*), source:lead_sources(*), assignee:users!assigned_to(id, email, full_name)')
        .eq('organization_id', user?.organization_id)
        .order('created_at', { ascending: false });
      if (leadsData) {
        setLeads(leadsData);
        const grouped = stages.map(stage => ({
          ...stage,
          leads: leadsData.filter((l: any) => l.stage_id === stage.id)
        }));
        setLeadsByStage(grouped);
      }
    }
  };

  // Handle drag end for pipeline
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    
    // Dropped outside - just return, drag library will reset
    if (!destination) return;
    
    // Dropped in same position - just return, no state update needed
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    
    // Update state SYNCHRONOUSLY (compute new state, then set it once)
    const newLeadsByStage = [...leadsByStage];
    
    const sourceColIndex = newLeadsByStage.findIndex(col => col.id === source.droppableId);
    const destColIndex = newLeadsByStage.findIndex(col => col.id === destination.droppableId);
    
    if (sourceColIndex === -1 || destColIndex === -1) return;
    
    // Clone the leads arrays
    const sourceLeads = [...newLeadsByStage[sourceColIndex].leads];
    const [movedLead] = sourceLeads.splice(source.index, 1);
    
    // Create new object with updated stage_id (don't mutate)
    const updatedLead = { ...movedLead, stage_id: destination.droppableId };
    
    const destLeads = sourceColIndex === destColIndex 
      ? sourceLeads 
      : [...newLeadsByStage[destColIndex].leads];
    destLeads.splice(destination.index, 0, updatedLead);
    
    // Update the columns
    newLeadsByStage[sourceColIndex] = { ...newLeadsByStage[sourceColIndex], leads: sourceLeads };
    if (sourceColIndex !== destColIndex) {
      newLeadsByStage[destColIndex] = { ...newLeadsByStage[destColIndex], leads: destLeads };
    }
    
    // Defer state update to allow drag library to finish cleanup
    requestAnimationFrame(() => {
      // Set state once
      setLeadsByStage(newLeadsByStage);
      
      // Also update leads state for consistency
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === draggableId 
            ? { ...lead, stage_id: destination.droppableId }
            : lead
        )
      );
    });
    
    // Database update in background (fire and forget)
    updateLeadStageInDB(draggableId, destination.droppableId);
  };

  // Handle assign change
  const handleAssign = async (leadId: string, userId: string | null) => {
    await updateLead(leadId, { assigned_to: userId || null });
    
    // Refresh leads data
    const { data: leadsData } = await supabase
      .from('leads')
      .select('*, stage:pipeline_stages(*), source:lead_sources(*), assignee:users!assigned_to(id, email, full_name)')
      .eq('organization_id', user?.organization_id)
      .order('created_at', { ascending: false });
    if (leadsData) {
      setLeads(leadsData);
      const grouped = stages.map(stage => ({
        ...stage,
        leads: leadsData.filter((l: any) => l.stage_id === stage.id)
      }));
      setLeadsByStage(grouped);
    }
    setOpenDropdownId(null);
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'facebook':
        return (
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#2563EB', fontWeight: 'bold', fontSize: '14px' }}>f</span>
          </div>
        );
      case 'instagram':
        return (
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '12px' }}>IG</span>
          </div>
        );
      case 'website':
        return (
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Globe style={{ width: '16px', height: '16px', color: '#059669' }} />
          </div>
        );
      case 'phone':
        return (
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Phone style={{ width: '16px', height: '16px', color: '#0284C7' }} />
          </div>
        );
      default:
        return (
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#6B7280', fontSize: '12px' }}>•</span>
          </div>
        );
    }
  };

  const getStatusBadge = (stage: any) => {
    if (!stage) return null;
    const colors: Record<string, { bg: string; text: string }> = {
      'new': { bg: '#DBEAFE', text: '#2563EB' },
      'contacted': { bg: '#EDE9FE', text: '#7C3AED' },
      'proposal': { bg: '#FFEDD5', text: '#EA580C' },
      'negotiation': { bg: '#FCE7F3', text: '#DB2777' },
      'won': { bg: '#D1FAE5', text: '#059669' },
      'lost': { bg: '#F3F4F6', text: '#6B7280' },
    };
    const color = colors[stage.slug] || { bg: '#F3F4F6', text: '#6B7280' };
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: color.bg,
        color: color.text
      }}>
        {stage.name}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Danas, ${date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Juče, ${date.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('sr-RS');
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'sada';
    if (diffHours < 24) return `pre ${diffHours}h`;
    if (diffDays === 1) return 'pre 1 dan';
    return `pre ${diffDays} dana`;
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStageColor = (slug: string) => {
    const colors: Record<string, string> = {
      'new': '#3B82F6',
      'contacted': '#8B5CF6',
      'proposal': '#F97316',
      'negotiation': '#EC4899',
      'won': '#10B981',
      'lost': '#6B7280',
    };
    return colors[slug] || '#6B7280';
  };

  const avatarGradients = [
    'linear-gradient(135deg, #F59E0B, #EC4899)',
    'linear-gradient(135deg, #8B5CF6, #3B82F6)',
    'linear-gradient(135deg, #10B981, #3B82F6)',
    'linear-gradient(135deg, #F59E0B, #EF4444)',
    'linear-gradient(135deg, #6366F1, #EC4899)',
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{ padding: '32px', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '8px' }}>
      {/* Welcome Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1E293B' }}>
          Dobrodošli, {user?.full_name || 'Korisnik'}! 👋
        </h1>
        <p style={{ color: '#64748B', marginTop: '4px' }}>
          Evo šta se danas dešava sa vašim upitima
        </p>
      </div>

      {/* Stat Cards - 4 columns */}
      <div className="stat-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {/* Card 1 - Upita danas */}
        <div style={{ backgroundColor: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '24px', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '12px', fontWeight: '600', color: '#10B981' }}>+12%</span>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Users style={{ width: '24px', height: '24px', color: '#3B82F6' }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#1E293B' }}>{leadsToday}</div>
          <div style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>Upita danas</div>
        </div>

        {/* Card 2 - Ovog meseca */}
        <div style={{ backgroundColor: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '24px', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '12px', fontWeight: '600', color: '#10B981' }}>+8%</span>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Calendar style={{ width: '24px', height: '24px', color: '#8B5CF6' }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#1E293B' }}>{leadsThisMonth}</div>
          <div style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>Ovog meseca</div>
        </div>

        {/* Card 3 - Konverzija */}
        <div style={{ backgroundColor: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '24px', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '12px', fontWeight: '600', color: '#10B981' }}>+3%</span>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <CheckCircle style={{ width: '24px', height: '24px', color: '#10B981' }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#1E293B' }}>{conversionRate}%</div>
          <div style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>Konverzija</div>
        </div>

        {/* Card 4 - U pipeline-u */}
        <div style={{ backgroundColor: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '24px', position: 'relative' }}>
          <span style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '12px', fontWeight: '600', color: '#10B981' }}>+15%</span>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Euro style={{ width: '24px', height: '24px', color: '#F97316' }} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#1E293B' }}>€{pipelineValue.toLocaleString()}</div>
          <div style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>U pipeline-u</div>
        </div>
      </div>

      {/* Two Column Section - Table (2fr) + Attention (1fr) */}
      <div className="two-column-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left - Recent Leads Table */}
        <div style={{ backgroundColor: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden', padding: 0 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontWeight: '600', color: '#1E293B', fontSize: '16px' }}>Poslednji upiti</h3>
            <Link href="/dashboard/leads" style={{ fontSize: '13px', color: '#3B82F6', fontWeight: '500', textDecoration: 'none' }}>
              Vidi sve →
            </Link>
          </div>
          <div className="table-wrapper" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kontakt</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Izvor</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Zadužen</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vrednost</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Datum</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: '#64748B' }}>
                      Nema upita
                    </td>
                  </tr>
                ) : (
                  recentLeads.map((lead) => {
                    const assignee = lead.assignee || lead.assigned_user;
                    const assigneeIndex = assignee?.id && teamMembers.length > 0 
                      ? teamMembers.findIndex((m: any) => m.id === assignee.id)
                      : 0;
                    
                    return (
                    <tr 
                      key={lead.id} 
                      style={{ borderBottom: '1px solid #F1F5F9', cursor: 'pointer' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAFAFA'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '600', color: '#1E293B' }}>{lead.name || 'Nepoznato'}</div>
                        <div style={{ fontSize: '13px', color: '#64748B' }}>{lead.destination || lead.email || '-'}</div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        {getSourceIcon(lead.source?.type || lead.source_type)}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        {getStatusBadge(lead.stage)}
                      </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: assignee ? getAvatarGradient(assigneeIndex) : '#E2E8F0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px',
                              fontWeight: '600',
                              color: 'white',
                              cursor: 'default',
                            }}
                            title={assignee?.full_name || assignee?.email || 'Nije dodeljeno'}
                          >
                            {assignee ? getInitials(assignee.full_name || assignee.email) : '?'}
                          </div>
                        </td>
                      <td style={{ padding: '16px 20px', fontWeight: '600', color: '#1E293B' }}>
                        €{(lead.value || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: '14px', color: '#94A3B8' }}>
                        {formatDate(lead.created_at)}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right - Needs Attention */}
        <div style={{ backgroundColor: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '20px', height: 'fit-content' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle style={{ width: '20px', height: '20px', color: '#F97316' }} />
              <h3 style={{ fontWeight: '600', color: '#1E293B', fontSize: '16px' }}>Zahteva pažnju</h3>
            </div>
            <span style={{ fontSize: '13px', color: '#94A3B8' }}>{needsAttention.length} upita</span>
          </div>

          {needsAttention.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <CheckCircle style={{ width: '28px', height: '28px', color: '#10B981' }} />
              </div>
              <p style={{ fontWeight: '600', color: '#1E293B' }}>Sve je pod kontrolom!</p>
              <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>Nema upita koji zahtevaju pažnju.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {needsAttention.map((lead, idx) => {
                const daysAgo = Math.floor((new Date().getTime() - new Date(lead.last_contact_at || lead.created_at).getTime()) / (1000 * 60 * 60 * 24));

                return (
                  <Link
                    key={lead.id}
                    href={`/dashboard/leads/${lead.id}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', textDecoration: 'none', cursor: 'pointer' }}
                  >
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: avatarGradients[idx % avatarGradients.length],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '600',
                      fontSize: '14px',
                      flexShrink: 0
                    }}>
                      {getInitials(lead.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: '600', color: '#1E293B', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name || 'Nepoznato'}</p>
                      <p style={{ fontSize: '13px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.destination || '-'} • {lead.stage?.name || '-'}</p>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: '500', color: '#EF4444', whiteSpace: 'nowrap' }}>{daysAgo} dana</span>
                  </Link>
                );
              })}
            </div>
          )}

          <Link
            href="/dashboard/leads/new"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              marginTop: '16px',
              backgroundColor: '#3B82F6',
              color: 'white',
              fontWeight: '600',
              padding: '12px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '14px'
            }}
          >
            <Plus style={{ width: '20px', height: '20px' }} />
            Novi upit
          </Link>
        </div>
      </div>

      {/* Pipeline Section */}
      <div style={{ marginTop: '32px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1E293B' }}>Pipeline</h2>
        </div>

        {/* Pipeline Grid - 5 columns with Drag and Drop */}
        <DragDropContext onDragEnd={handleDragEnd}>
        <div className="pipeline-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
          {leadsByStage.filter(s => !s.is_lost).map((stage) => (
            <Droppable droppableId={stage.id} key={stage.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={snapshot.isDraggingOver ? 'column-dragging-over' : ''}
                  style={{
                    backgroundColor: '#FAFAFA',
                    borderRadius: '14px',
                    padding: '16px',
                    minHeight: '400px',
                    transition: 'all 0.2s ease'
                  }}
                >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                marginBottom: '16px',
                borderBottom: `2px solid ${getStageColor(stage.slug)}`
              }}>
                <span style={{ fontWeight: '600', color: '#1E293B', fontSize: '13px' }}>
                  {stage.name} {stage.is_won && '✓'}
                </span>
                <span style={{ fontSize: '12px', color: '#94A3B8', backgroundColor: 'white', padding: '2px 8px', borderRadius: '10px' }}>
                  {stage.leads.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stage.leads.length === 0 ? (
                  <p style={{ fontSize: '14px', color: '#94A3B8', textAlign: 'center', padding: '32px 0' }}>Nema upita</p>
                ) : (
                  stage.leads.slice(0, 4).map((lead: any, index: number) => {
                    const timeAgo = getTimeAgo(lead.created_at);
                    const daysOld = Math.floor((new Date().getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24));
                    const isOld = daysOld >= 3;

                    return (
                      <Draggable key={String(lead.id)} draggableId={String(lead.id)} index={index}>
                        {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                        style={{
                                ...provided.draggableProps.style,
                          display: 'block',
                          backgroundColor: 'white',
                          borderRadius: '10px',
                          padding: '14px',
                          border: '1px solid #E2E8F0',
                                boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 2px rgba(0,0,0,0.05)',
                                cursor: 'pointer',
                                // Reset transform when not dragging
                                transform: snapshot.isDragging 
                                  ? provided.draggableProps.style?.transform 
                                  : 'none',
                                transition: snapshot.isDragging 
                                  ? provided.draggableProps.style?.transition 
                                  : 'box-shadow 0.2s',
                                opacity: snapshot.isDragging ? 0.8 : 1,
                              }}
                              onMouseEnter={(e) => {
                                if (!snapshot.isDragging) {
                                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!snapshot.isDragging) {
                                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                                }
                              }}
                            >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px', position: 'relative' }}>
                              <p style={{ fontWeight: '600', color: '#1E293B', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '8px' }}>{lead.name || 'Nepoznato'}</p>
                              {(() => {
                                const assignee = lead.assignee || lead.assigned_user;
                                const assigneeIndex = assignee?.id && teamMembers.length > 0 
                                  ? teamMembers.findIndex((m: any) => m.id === assignee.id)
                                  : 0;
                                const allUserIds = teamMembers.map((m: any) => m.id);
                                const isDropdownOpen = openDropdownId === lead.id;
                                
                                return (
                                  <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <button
                                      ref={(el) => {
                                        if (el) avatarButtonRefs.current[lead.id] = el;
                                      }}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isDropdownOpen) {
                                          // Check position when opening
                                          const buttonEl = avatarButtonRefs.current[lead.id];
                                          if (buttonEl) {
                                            const rect = buttonEl.getBoundingClientRect();
                                            const dropdownWidth = 200;
                                            const spaceOnRight = window.innerWidth - rect.right;
                                            const spaceOnLeft = rect.left;
                                            const alignRight = spaceOnRight >= dropdownWidth || spaceOnRight > spaceOnLeft;
                                            setDropdownAlignRight(alignRight);
                                            setDropdownPosition({
                                              ...dropdownPosition,
                                              [lead.id]: {
                                                top: rect.bottom + 8,
                                                left: rect.left,
                                                right: window.innerWidth - rect.right
                                              }
                                            });
                                          }
                                        }
                                        setOpenDropdownId(isDropdownOpen ? null : lead.id);
                                      }}
                                      style={{
                                        position: 'relative',
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '50%',
                                        background: assignee ? getAvatarGradient(assigneeIndex) : '#E2E8F0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: 'white',
                                        border: 'none',
                                        cursor: teamMembers.length > 0 ? 'pointer' : 'default',
                                        padding: 0,
                                        outline: 'none',
                                      }}
                                      title={assignee?.full_name || assignee?.email || 'Nije dodeljeno'}
                                    >
                                      {assignee ? getInitials(assignee.full_name || assignee.email) : '?'}
                                      {/* Dropdown indicator */}
                                      {teamMembers.length > 0 && (
                                        <div style={{
                                          position: 'absolute',
                                          bottom: '-2px',
                                          right: '-2px',
                                          width: '15px',
                                          height: '15px',
                                          borderRadius: '50%',
                                          backgroundColor: 'white',
                                          border: '1.5px solid #E2E8F0',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}>
                                          <svg 
                                            width="6" 
                                            height="6" 
                                            viewBox="0 0 12 12" 
                                            fill="none"
                                          >
                                            <path 
                                              d="M3 4.5L6 7.5L9 4.5" 
                                              stroke="#64748B" 
                                              strokeWidth="1.5" 
                                              strokeLinecap="round" 
                                              strokeLinejoin="round"
                                            />
                                          </svg>
                                        </div>
                                      )}
                                    </button>

                                    {/* Dropdown Menu */}
                                    {isDropdownOpen && teamMembers.length > 0 && dropdownPosition[lead.id] && (
                                      <div style={{
                                        position: 'fixed',
                                        ...(dropdownAlignRight ? { right: `${dropdownPosition[lead.id].right}px` } : { left: `${dropdownPosition[lead.id].left}px` }),
                                        top: `${dropdownPosition[lead.id].top}px`,
                                        width: '200px',
                                        borderRadius: '10px',
                                        backgroundColor: 'white',
                                        padding: '4px 0',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                        border: '1px solid #E2E8F0',
                                        zIndex: 9999,
                                      }}>
                                        <div style={{ padding: '8px 12px', borderBottom: '1px solid #E2E8F0' }}>
                                          <p style={{ fontSize: '11px', fontWeight: '600', color: '#64748B', margin: 0 }}>ZADUŽI UPIT</p>
                                        </div>
                                        <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleAssign(lead.id, null);
                                            }}
                                            style={{
                                              width: '100%',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px',
                                              padding: '8px 12px',
                                              fontSize: '13px',
                                              color: '#1E293B',
                                              backgroundColor: 'transparent',
                                              border: 'none',
                                              cursor: 'pointer',
                                              textAlign: 'left',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                          >
                                            <div style={{
                                              width: '24px',
                                              height: '24px',
                                              borderRadius: '50%',
                                              background: '#E2E8F0',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              fontSize: '10px',
                                              fontWeight: '600',
                                              color: '#64748B',
                                              flexShrink: 0,
                                            }}>
                                              ?
                                            </div>
                                            <span>Nije dodeljeno</span>
                                          </button>
                                          {teamMembers.map((member: any, index: number) => {
                                            const memberIndex = allUserIds.indexOf(member.id);
                                            const isAssigned = assignee?.id === member.id;
                                            return (
                                              <button
                                                key={member.id}
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleAssign(lead.id, member.id);
                                                }}
                                                style={{
                                                  width: '100%',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: '8px',
                                                  padding: '8px 12px',
                                                  fontSize: '13px',
                                                  color: '#1E293B',
                                                  backgroundColor: isAssigned ? '#EFF6FF' : 'transparent',
                                                  border: 'none',
                          cursor: 'pointer',
                                                  textAlign: 'left',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isAssigned ? '#EFF6FF' : '#F1F5F9'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isAssigned ? '#EFF6FF' : 'transparent'}
                                              >
                                                <div style={{
                                                  width: '24px',
                                                  height: '24px',
                                                  borderRadius: '50%',
                                                  background: getAvatarGradient(memberIndex),
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  fontSize: '10px',
                                                  fontWeight: '600',
                                                  color: 'white',
                                                  flexShrink: 0,
                                                }}>
                                                  {getInitials(member.full_name || member.email)}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                  <p style={{ fontSize: '13px', fontWeight: '500', color: '#1E293B', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {member.full_name || member.email.split('@')[0]}
                                                  </p>
                                                  {member.email && member.full_name && (
                                                    <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                      {member.email}
                                                    </p>
                                                  )}
                                                </div>
                                                {isAssigned && (
                                                  <span style={{ fontSize: '12px', color: '#3B82F6', fontWeight: '600' }}>✓</span>
                                                )}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                        <p style={{ fontSize: '13px', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '12px' }}>{lead.destination || '-'}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#10B981' }}>
                            €{(lead.value || 0).toLocaleString()}
                          </span>
                          <span style={{ fontSize: '12px', color: isOld ? '#EF4444' : '#94A3B8', fontWeight: isOld ? '500' : '400' }}>
                            {timeAgo}
                          </span>
                        </div>
                          </div>
                        )}
                      </Draggable>
                    );
                  })
                )}
                {provided.placeholder}
                {stage.leads.length > 4 && (
                  <p style={{ fontSize: '12px', color: '#64748B', textAlign: 'center', paddingTop: '8px' }}>
                    +{stage.leads.length - 4} više
                  </p>
                )}
              </div>
            </div>
            )}
            </Droppable>
          ))}
        </div>
        </DragDropContext>
      </div>
      </div>
    </div>
  );
}
