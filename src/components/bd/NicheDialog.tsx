import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TargetNiche } from '@/hooks/useTargetNiches';
import { Pod } from '@/hooks/usePods';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface NicheDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  niche: TargetNiche | null;
  pods: Pod[];
  onSave: (data: Partial<TargetNiche>) => Promise<void>;
}

export function NicheDialog({ open, onOpenChange, niche, pods, onSave }: NicheDialogProps) {
  const [formData, setFormData] = useState<Partial<TargetNiche>>({
    name: '',
    description: '',
    pod_id: '',
    status: 'active',
    priority: 'medium',
    services: [],
    industries: [],
    target_contacts: [],
    target_regions: [],
    pain_points: [],
    dreams: [],
  });

  useEffect(() => {
    if (niche) {
      setFormData(niche);
    } else {
      setFormData({
        name: '',
        description: '',
        pod_id: '',
        status: 'active',
        priority: 'medium',
        services: [],
        industries: [],
        target_contacts: [],
        target_regions: [],
        pain_points: [],
        dreams: [],
      });
    }
  }, [niche, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  const handleArrayInput = (field: string, value: string) => {
    setFormData({
      ...formData,
      [field]: value.split(',').map((s) => s.trim()).filter(Boolean),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{niche ? 'Edit Niche' : 'Create New Niche'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="targeting">Targeting</TabsTrigger>
              <TabsTrigger value="goals">Goals & Metrics</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Niche Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Drupal - Higher Education"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="pod_id">POD *</Label>
                  <Select value={formData.pod_id} onValueChange={(value) => setFormData({ ...formData, pod_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select POD" />
                    </SelectTrigger>
                    <SelectContent>
                      {pods.map((pod) => (
                        <SelectItem key={pod.id} value={pod.id}>
                          {pod.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="researching">Researching</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="business_type">Business Type</Label>
                  <Input
                    id="business_type"
                    value={formData.business_type || ''}
                    onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                    placeholder="e.g., Startup, SMB, Enterprise"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe this niche..."
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="targeting" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="services">Services (comma-separated)</Label>
                  <Input
                    id="services"
                    value={formData.services?.join(', ') || ''}
                    onChange={(e) => handleArrayInput('services', e.target.value)}
                    placeholder="e.g., Drupal Development, Migration, Support"
                  />
                </div>

                <div>
                  <Label htmlFor="industries">Industries (comma-separated)</Label>
                  <Input
                    id="industries"
                    value={formData.industries?.join(', ') || ''}
                    onChange={(e) => handleArrayInput('industries', e.target.value)}
                    placeholder="e.g., Higher Education, Healthcare, Finance"
                  />
                </div>

                <div>
                  <Label htmlFor="target_contacts">Target Contacts (comma-separated)</Label>
                  <Input
                    id="target_contacts"
                    value={formData.target_contacts?.join(', ') || ''}
                    onChange={(e) => handleArrayInput('target_contacts', e.target.value)}
                    placeholder="e.g., CTO, VP Engineering, Tech Director"
                  />
                </div>

                <div>
                  <Label htmlFor="target_regions">Target Regions (comma-separated)</Label>
                  <Input
                    id="target_regions"
                    value={formData.target_regions?.join(', ') || ''}
                    onChange={(e) => handleArrayInput('target_regions', e.target.value)}
                    placeholder="e.g., USA: East Coast, UK: London, Canada"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employee_size_min">Min Employees</Label>
                    <Input
                      id="employee_size_min"
                      type="number"
                      value={formData.employee_size_min || ''}
                      onChange={(e) => setFormData({ ...formData, employee_size_min: parseInt(e.target.value) || undefined })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="employee_size_max">Max Employees</Label>
                    <Input
                      id="employee_size_max"
                      type="number"
                      value={formData.employee_size_max || ''}
                      onChange={(e) => setFormData({ ...formData, employee_size_max: parseInt(e.target.value) || undefined })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="revenue_min">Min Revenue ($)</Label>
                    <Input
                      id="revenue_min"
                      type="number"
                      value={formData.revenue_min || ''}
                      onChange={(e) => setFormData({ ...formData, revenue_min: parseFloat(e.target.value) || undefined })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="revenue_max">Max Revenue ($)</Label>
                    <Input
                      id="revenue_max"
                      type="number"
                      value={formData.revenue_max || ''}
                      onChange={(e) => setFormData({ ...formData, revenue_max: parseFloat(e.target.value) || undefined })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="pain_points">Pain Points (comma-separated)</Label>
                  <Textarea
                    id="pain_points"
                    value={formData.pain_points?.join(', ') || ''}
                    onChange={(e) => handleArrayInput('pain_points', e.target.value)}
                    placeholder="e.g., Legacy systems, High costs, Security concerns"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="dreams">Dreams/Goals (comma-separated)</Label>
                  <Textarea
                    id="dreams"
                    value={formData.dreams?.join(', ') || ''}
                    onChange={(e) => handleArrayInput('dreams', e.target.value)}
                    placeholder="e.g., Modern platform, Cost reduction, Better security"
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="goals" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="target_revenue">Target Revenue ($)</Label>
                  <Input
                    id="target_revenue"
                    type="number"
                    value={formData.target_revenue || ''}
                    onChange={(e) => setFormData({ ...formData, target_revenue: parseFloat(e.target.value) || undefined })}
                    placeholder="Annual revenue target"
                  />
                </div>
                <div>
                  <Label htmlFor="target_clients">Target Clients</Label>
                  <Input
                    id="target_clients"
                    type="number"
                    value={formData.target_clients || ''}
                    onChange={(e) => setFormData({ ...formData, target_clients: parseInt(e.target.value) || undefined })}
                    placeholder="Number of clients to acquire"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{niche ? 'Update' : 'Create'} Niche</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
