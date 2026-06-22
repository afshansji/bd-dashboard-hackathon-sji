import { useState, useMemo } from 'react';
import { PipelineDataTable } from '@/components/bd/PipelineDataTable';
import { Badge } from '@/components/ui/badge';
import { useLocalDealsByStage } from '@/hooks/useDeals';
import { format } from 'date-fns';
import { usePagination } from '@/hooks/usePagination';
import { useNavigate, Link } from 'react-router-dom';
import { STAGE_LABELS, DealStage } from '@/lib/dealStages';
import { DealFilters, DealFiltersState } from '@/components/bd/DealFilters';
import { usePods } from '@/hooks/usePods';
import { useCategories } from '@/hooks/useCategories';
import { AlertCircle, FileSignature } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProposalDialog } from '@/components/proposals/ProposalDialog';

interface StagePipelineTableProps {
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation';
  title: string;
  description: string;
}

export function StagePipelineTable({ stage, title, description }: StagePipelineTableProps) {
  const pagination = usePagination(25);
  const [filters, setFilters] = useState<DealFiltersState>({});
  const [proposalDialogOpen, setProposalDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<{ dealId: string; clientId: string } | null>(null);
  
  const { data, isLoading } = useLocalDealsByStage(
    stage,
    pagination.currentPage,
    pagination.pageSize,
    filters
  );
  const navigate = useNavigate();
  
  const { pods } = usePods();
  const { data: categoriesData } = useCategories();
  
  const deals = data?.data || [];
  const totalCount = data?.total || 0;

  // Extract unique owners from deals data
  const uniqueOwners = useMemo(() => {
    const ownerMap = new Map();
    deals.forEach((deal: any) => {
      if (deal.owner_id && !ownerMap.has(deal.owner_id)) {
        ownerMap.set(deal.owner_id, {
          id: deal.owner_id,
          email: deal.owner_name || 'Unknown',
          first_name: '',
          last_name: '',
        });
      }
    });
    return Array.from(ownerMap.values());
  }, [deals]);

  // Extract unique PMs from deals data
  const uniquePMs = useMemo(() => {
    const pmMap = new Map();
    deals.forEach((deal: any) => {
      if (deal.pm_assigned_id && !pmMap.has(deal.pm_assigned_id)) {
        pmMap.set(deal.pm_assigned_id, {
          id: deal.pm_assigned_id,
          email: deal.pm_assigned_name || 'Unknown',
          first_name: '',
          last_name: '',
        });
      }
    });
    return Array.from(pmMap.values());
  }, [deals]);

  const formatCurrency = (value: any) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (value: any, row?: any) => {
    if (!value) return '-';
    try {
      const dateObj = new Date(value);
      const formattedDate = format(dateObj, 'MMM dd, yyyy');
      
      // Highlight past-due dates for active deals (close_date column only)
      if (row && row.status === 'active') {
        const isPastDue = dateObj < new Date();
        if (isPastDue) {
          return (
            <span className="text-destructive font-semibold flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {formattedDate}
            </span>
          );
        }
      }
      
      return formattedDate;
    } catch {
      return '-';
    }
  };

  const createDealSlug = (dealName: string, dealId: string) => {
    const slug = dealName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `/${stage}/${slug}-${dealId}`;
  };

  const handleRequestSignature = (dealId: string, clientId: string) => {
    setSelectedDeal({ dealId, clientId });
    setProposalDialogOpen(true);
  };

  const columns = [
    { 
      key: 'deal_name' as const, 
      label: 'Deal Name',
      render: (value: string, row: any) => (
        <div className="w-[200px] max-w-[200px]">
          <a
            href={createDealSlug(value || 'untitled', row.id)}
            className="text-primary hover:underline font-medium whitespace-normal break-words leading-tight"
            onClick={(e) => {
              e.preventDefault();
              navigate(createDealSlug(value || 'untitled', row.id));
            }}
          >
            {value || 'Untitled Deal'}
          </a>
        </div>
      )
    },
    { 
      key: 'client_name' as const, 
      label: 'Client',
      render: (value: string, row: any) => {
        if (!value || value === '-' || !row.client_slug) {
          return (
            <div className="w-[200px] max-w-[200px]">
              <span className="whitespace-normal break-words leading-tight">{value || '-'}</span>
            </div>
          );
        }
        return (
          <div className="w-[200px] max-w-[200px]">
            <Link 
              to={`/clients/${row.client_slug}`}
              className="text-primary hover:underline whitespace-normal break-words leading-tight"
            >
              {value}
            </Link>
          </div>
        );
      }
    },
    { 
      key: 'value' as const, 
      label: 'Amount', 
      render: formatCurrency 
    },
    { 
      key: 'stage' as const, 
      label: 'Stage',
      render: (value: string) => {
        const label = STAGE_LABELS[value as DealStage] || value;
        return <Badge variant="secondary">{label}</Badge>;
      }
    },
    { 
      key: 'status' as const, 
      label: 'Status',
      render: (value: string) => {
        const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
          active: { label: 'Active', variant: 'default' },
          on_hold: { label: 'Stale', variant: 'secondary' },
          won: { label: 'Won', variant: 'default' },
          lost: { label: 'Lost', variant: 'destructive' },
        };
        
        const config = statusConfig[value] || { label: value, variant: 'outline' };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      }
    },
    { 
      key: 'dealtype' as const, 
      label: 'Type',
      render: (value: string) => {
        if (!value) return '-';
        return value === 'newbusiness' ? 'New Business' : 'Existing Business';
      }
    },
    { 
      key: 'category' as const, 
      label: 'Category',
      render: (value: string) => value || '-'
    },
    { 
      key: 'created_at' as const, 
      label: 'Create Date', 
      render: formatDate 
    },
    { 
      key: 'close_date' as const, 
      label: 'Close Date', 
      render: (value: any, row: any) => formatDate(value, row)
    },
    { 
      key: 'pod_name' as const, 
      label: 'POD',
      render: (value: string) => value || '-'
    },
    { 
      key: 'lead_source' as const, 
      label: 'Source',
      render: (value: string) => value || '-'
    },
    {
      key: 'actions' as const,
      label: 'Actions',
      render: (value: any, row: any) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleRequestSignature(row.id, row.client_id);
          }}
          disabled={!row.client_id}
          className="whitespace-nowrap"
        >
          <FileSignature className="h-4 w-4 mr-2" />
          Request Signature
        </Button>
      )
    },
  ];

  return (
    <div>
      {title && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
          <div className="mt-2">
            <Badge variant="secondary">{totalCount} Total Deals</Badge>
          </div>
        </div>
      )}

      <div className="mb-6">
        <DealFilters
          filters={filters}
          onFiltersChange={(newFilters) => {
            setFilters(newFilters);
            pagination.reset();
          }}
          owners={uniqueOwners}
          pms={uniquePMs}
          pods={pods || []}
          categories={categoriesData || []}
        />
      </div>

      <PipelineDataTable
        data={deals}
        columns={columns}
        isLoading={isLoading}
        emptyMessage={`No ${stage} deals found`}
        searchable={false}
        externalLinkFn={(row) => row.hubspot_crm_deal_url}
        totalCount={totalCount}
        currentPage={pagination.currentPage}
        pageSize={pagination.pageSize}
        onPageChange={pagination.setCurrentPage}
        onPageSizeChange={(size) => {
          pagination.setPageSize(size);
          pagination.reset();
        }}
      />

      <ProposalDialog
        open={proposalDialogOpen}
        onOpenChange={setProposalDialogOpen}
        dealId={selectedDeal?.dealId}
        clientId={selectedDeal?.clientId}
      />
    </div>
  );
}
