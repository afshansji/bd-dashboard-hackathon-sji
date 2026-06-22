import { useCallback, useMemo, useState } from 'react';
import { Loader2, Plus, RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePagination } from '@/hooks/usePagination';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useProducts } from '@/hooks/useProducts';
import { usePods } from '@/hooks/usePods';
import { CreateProductData, Product, ProductCategory } from '@/types/product';
import { ProductDialog } from '@/components/bd/ProductDialog';
import { ProductCard } from '@/components/bd/ProductCard';

const CATEGORY_OPTIONS: Array<'all' | ProductCategory> = ['all', 'Software', 'Service', 'Consulting', 'Training', 'Other'];

type StatusFilter = 'all' | 'active' | 'inactive';

type TeamFilter = 'all' | string;

export default function ProductManagement() {
  const pagination = usePagination(12);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | ProductCategory>('all');
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const filters = useMemo(
    () => ({
      search: searchQuery.trim() || undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      owner_team: teamFilter !== 'all' ? teamFilter : undefined,
      is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
    }),
    [searchQuery, categoryFilter, teamFilter, statusFilter],
  );

  const {
    products,
    total,
    isLoading,
    error,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductStatus,
    isDeleting,
  } = useProducts(filters, pagination.currentPage, pagination.pageSize);
  const { pods } = usePods();
  
  const totalPages = Math.ceil(total / pagination.pageSize);

  const podNameMap = useMemo(() => new Map(pods.map((pod) => [pod.id, pod.name])), [pods]);

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedProduct(null);
    }
  };

  const openCreateDialog = () => {
    setSelectedProduct(null);
    setDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleDeleteRequest = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleSaveProduct = useCallback(
    async (data: Partial<Product>) => {
      if (selectedProduct) {
        const { id: _id, created_at, updated_at, ...updates } = data;
        await updateProduct({ id: selectedProduct.id, ...updates });
      } else {
        if (!data.name || !data.category) {
          throw new Error('Product name and category are required');
        }

        const createPayload: CreateProductData = {
          name: data.name,
          category: data.category,
          description: data.description,
          pricing_model: data.pricing_model,
          target_industries: data.target_industries,
          owner_team: data.owner_team,
          google_drive_link: data.google_drive_link,
          marketing_variant_link: data.marketing_variant_link,
          is_active: data.is_active,
        };

        await createProduct(createPayload);
      }
      setSelectedProduct(null);
    },
    [createProduct, selectedProduct, updateProduct],
  );

  const handleDeleteDialogChange = (open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setProductToDelete(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete.id);
      setProductToDelete(null);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Failed to delete product', error);
    }
  };

  const handleToggleActive = (product: Product, isActive: boolean) => {
    void toggleProductStatus({ id: product.id, is_active: isActive });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setTeamFilter('all');
    setStatusFilter('active');
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products & Services</h1>
          <p className="text-muted-foreground">
            Curate your catalog of offerings so the team knows exactly what we sell and how to position it.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <Label htmlFor="product-search" className="sr-only">
            Search products
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="product-search"
              placeholder="Search by name, description, or pricing model"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:w-[600px]">
          <div className="space-y-1">
            <Label htmlFor="category-filter">Category</Label>
            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as 'all' | ProductCategory)}>
              <SelectTrigger id="category-filter">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === 'all' ? 'All categories' : option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="team-filter">Owner Team</Label>
            <Select value={teamFilter} onValueChange={(value) => setTeamFilter(value as TeamFilter)}>
              <SelectTrigger id="team-filter">
                <SelectValue placeholder="All teams" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All teams</SelectItem>
                {pods.map((pod) => (
                  <SelectItem key={pod.id} value={pod.id}>
                    {pod.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="status-filter">Status</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger id="status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="all">All statuses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button variant="outline" onClick={clearFilters} className="lg:ml-auto">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load products</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/40 p-12 text-center">
          <h3 className="text-lg font-semibold">No products found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Start by adding your first product or adjust the filters to see existing offerings.
          </p>
          <Button className="mt-6" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Create your first product
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                ownerTeamName={product.owner_team ? podNameMap.get(product.owner_team) : undefined}
                onEdit={handleEditProduct}
                onDelete={handleDeleteRequest}
                onToggleActive={handleToggleActive}
              />
            ))}
          </div>
          
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => pagination.currentPage > 1 && pagination.setCurrentPage(pagination.currentPage - 1)}
                    className={pagination.currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = pagination.currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        onClick={() => pagination.setCurrentPage(pageNum)}
                        isActive={pagination.currentPage === pageNum}
                        className="cursor-pointer"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => pagination.currentPage < totalPages && pagination.setCurrentPage(pagination.currentPage + 1)}
                    className={pagination.currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}

      <ProductDialog
        open={dialogOpen}
        onOpenChange={handleDialogChange}
        product={selectedProduct}
        pods={pods}
        onSave={handleSaveProduct}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The product will be removed from the catalog for everyone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
