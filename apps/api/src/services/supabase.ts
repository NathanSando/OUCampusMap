import type { Report, VoteResponse } from '@ou-campus-map/shared-types';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthVerifier, NewReport, ReportStore } from './types';

export function createServiceClient(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function supabaseAuthVerifier(client: SupabaseClient): AuthVerifier {
  return {
    async verifyToken(token) {
      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user) return null;
      return { id: data.user.id };
    },
  };
}

const ewkt = (lat: number, lng: number) => `SRID=4326;POINT(${lng} ${lat})`;

export function supabaseReportStore(client: SupabaseClient): ReportStore {
  return {
    async insert(r: NewReport): Promise<Report> {
      const { data, error } = await client
        .from('reports')
        .insert({
          user_id: r.userId,
          category: r.category,
          title: r.title,
          description: r.description ?? null,
          building_id: r.buildingId,
          location: ewkt(r.lat, r.lng),
          expires_at: r.expiresAt.toISOString(),
        })
        .select(
          'id, user_id, category, title, description, building_id, status, upvotes, downvotes, created_at, expires_at',
        )
        .single();
      if (error) throw error;
      return { ...data, lat: r.lat, lng: r.lng } as Report;
    },

    async castVote(reportId, userId, vote): Promise<VoteResponse | null> {
      const { data, error } = await client.rpc('cast_report_vote', {
        p_report_id: reportId,
        p_user_id: userId,
        p_vote: vote,
      });
      if (error) {
        if (error.code === 'P0002') return null; // raised by the function for missing/inactive reports
        throw error;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return { upvotes: row.up_count, downvotes: row.down_count, status: row.new_status };
    },

    async getOwner(reportId) {
      const { data, error } = await client
        .from('reports')
        .select('user_id, status')
        .eq('id', reportId)
        .maybeSingle();
      if (error) throw error;
      return data ? { userId: data.user_id, status: data.status } : null;
    },

    async softDelete(reportId) {
      const { error } = await client
        .from('reports')
        .update({ status: 'removed' })
        .eq('id', reportId);
      if (error) throw error;
    },

    async nearestBuildingId({ lat, lng }, maxMeters) {
      const { data, error } = await client.rpc('nearest_buildings', {
        p_lat: lat,
        p_lng: lng,
        p_limit: 1,
        p_max_meters: maxMeters,
      });
      if (error) throw error;
      return (data as { id: string }[] | null)?.[0]?.id ?? null;
    },
  };
}
