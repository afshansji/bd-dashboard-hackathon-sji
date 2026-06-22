import { supabase } from "@/integrations/supabase/client";

export interface Sequence {
  id: string;
  name: string;
  description: string | null;
  campaign_id: string | null;
  is_active: boolean;
  status?: 'draft' | 'active' | 'paused';
  created_at: string;
  updated_at: string;
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  channel: string;
  delay_value: number;
  delay_unit: 'days' | 'hours' | 'minutes';
  content_template: {
    subject?: string;
    body?: string;
    variables?: string[];
  };
  conditions?: any;
  ai_personalization_enabled?: boolean;
}

export interface SequenceWithSteps extends Sequence {
  sequence_steps?: SequenceStep[];
}

export interface CreateSequencePayload {
  name: string;
  description?: string;
  campaign_id?: string;
  status?: 'draft' | 'active' | 'paused';
  created_by?: string;
  steps: Omit<SequenceStep, 'id' | 'sequence_id'>[];
}

export const sequencesApi = {
  async listSequences(campaignId?: string) {
    let query = supabase
      .from('campaign_sequences')
      .select('*, sequence_steps(*)')
      .order('created_at', { ascending: false });
    
    if (campaignId) {
      query = query.eq('campaign_id', campaignId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as any as SequenceWithSteps[];
  },

  async getSequence(id: string) {
    const { data, error } = await supabase
      .from('campaign_sequences')
      .select('*, sequence_steps(*)')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return (data || {}) as SequenceWithSteps;
  },

  async createSequence(payload: CreateSequencePayload) {
    const { steps, ...sequenceData } = payload;
    
    console.log('Creating sequence with steps:', steps);
    
    const { data: sequence, error: seqError } = await supabase
      .from('campaign_sequences')
      .insert(sequenceData)
      .select()
      .single();
    
    if (seqError) {
      console.error('Error creating sequence:', seqError);
      throw seqError;
    }
    const seq = sequence as any;
    
    if (steps.length > 0) {
      const stepsWithSeqId = steps.map(step => ({
        ...step,
        sequence_id: seq.id
      }));
      
      console.log('Inserting steps with sequence_id:', stepsWithSeqId);
      
      const { data: insertedSteps, error: stepsError } = await supabase
        .from('sequence_steps')
        .insert(stepsWithSeqId)
        .select();
      
      if (stepsError) {
        console.error('Error inserting steps:', stepsError);
        throw stepsError;
      }
      
      console.log('Steps inserted successfully:', insertedSteps);
    }
    
    return this.getSequence(seq.id);
  },

  async updateSequence(id: string, updates: any) {
    const { data, error } = await supabase
      .from('campaign_sequences')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateSequenceWithSteps(id: string, updates: any, steps: Omit<SequenceStep, 'id' | 'sequence_id'>[]) {
    console.log('Updating sequence with steps:', { id, updates, steps });
    
    // Update sequence metadata
    const { data: sequence, error: seqError } = await supabase
      .from('campaign_sequences')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (seqError) {
      console.error('Error updating sequence:', seqError);
      throw seqError;
    }
    
    // Delete existing steps
    console.log('Deleting existing steps for sequence:', id);
    const { error: deleteError } = await supabase
      .from('sequence_steps')
      .delete()
      .eq('sequence_id', id);
    
    if (deleteError) {
      console.error('Error deleting steps:', deleteError);
      throw deleteError;
    }
    
    // Insert new steps
    if (steps.length > 0) {
      const stepsWithSeqId = steps.map(step => ({
        ...step,
        sequence_id: id
      }));
      
      console.log('Inserting updated steps:', stepsWithSeqId);
      
      const { data: insertedSteps, error: insertError } = await supabase
        .from('sequence_steps')
        .insert(stepsWithSeqId)
        .select();
      
      if (insertError) {
        console.error('Error inserting updated steps:', insertError);
        throw insertError;
      }
      
      console.log('Steps updated successfully:', insertedSteps);
    }
    
    return this.getSequence(id);
  },

  async deleteSequence(id: string) {
    const { error } = await supabase
      .from('campaign_sequences')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  async toggleSequence(id: string, isActive: boolean) {
    return this.updateSequence(id, { status: isActive ? 'active' : 'paused' });
  }
};
