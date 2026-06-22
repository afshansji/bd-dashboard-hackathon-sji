import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  CreateProductData,
  Product,
  ProductFilters,
  UpdateProductData,
} from '@/types/product';

const buildQuery = (filters: ProductFilters = {}) => {
  let query = (supabase as any)
    .from('products')
    .select('*')
    .order('name');

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  if (filters.owner_team) {
    query = query.eq('owner_team', filters.owner_team);
  }

  if (typeof filters.is_active === 'boolean') {
    query = query.eq('is_active', filters.is_active);
  }

  if (filters.search) {
    const searchTerm = filters.search.trim();
    if (searchTerm) {
      query = query.or(
        `name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,pricing_model.ilike.%${searchTerm}%`,
      );
    }
  }

  return query;
};

export const useProducts = (filters: ProductFilters = {}, page: number = 1, limit: number = 12) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['products', filters, page, limit],
    queryFn: async () => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      let query = buildQuery(filters);
      const { data, error, count } = await query.select('*', { count: 'exact' }).range(from, to);
      if (error) throw error;
      
      return {
        data: (data || []) as Product[],
        total: count || 0,
      };
    },
  });
  
  const products = data?.data || [];

  const createProductMutation = useMutation({
    mutationFn: async (payload: CreateProductData) => {
      const { data, error } = await (supabase as any)
        .from('products')
        .insert([{ ...payload }])
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Success',
        description: 'Product created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateProductData) => {
      const { data, error } = await (supabase as any)
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Success',
        description: 'Product updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleProductStatusMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await (supabase as any)
        .from('products')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Success',
        description: variables.is_active
          ? 'Product activated successfully'
          : 'Product deactivated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    products,
    total: data?.total || 0,
    isLoading,
    error,
    createProduct: createProductMutation.mutateAsync,
    updateProduct: updateProductMutation.mutateAsync,
    deleteProduct: deleteProductMutation.mutateAsync,
    toggleProductStatus: toggleProductStatusMutation.mutateAsync,
    isCreating: createProductMutation.isPending,
    isUpdating: updateProductMutation.isPending,
    isDeleting: deleteProductMutation.isPending,
  };
};
