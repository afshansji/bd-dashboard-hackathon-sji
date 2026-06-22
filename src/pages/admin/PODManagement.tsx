import { useState } from 'react';
import { Plus, Users, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageInstructions } from '@/components/admin/PageInstructions';
import { usePods, Pod } from '@/hooks/usePods';
import { useTargetNiches } from '@/hooks/useTargetNiches';

export default function PODManagement() {
  const { pods, isLoading, createPod, updatePod, deletePod, importPodsFromControlTower } = usePods();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPod, setEditingPod] = useState<Pod | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPod) {
      await updatePod.mutateAsync({ id: editingPod.id, ...formData });
    } else {
      await createPod.mutateAsync(formData);
    }
    setDialogOpen(false);
    setEditingPod(null);
    setFormData({ name: '', description: '' });
  };

  const handleEdit = (pod: Pod) => {
    setEditingPod(pod);
    setFormData({ name: pod.name, description: pod.description || '' });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this POD?')) {
      await deletePod.mutateAsync(id);
    }
  };

  const handleImportPods = async () => {
    await importPodsFromControlTower.mutateAsync();
  };

  if (isLoading) return <div>Loading PODs...</div>;

  return (
    <div className="container mx-auto py-8">
      <PageInstructions
        title="POD Management"
        description="Organize teams into PODs (Profit Operating Divisions) for better collaboration"
        steps={[
          "Create PODs by clicking 'Create POD'",
          "Assign team members to each POD",
          "Set a POD leader who will manage the team",
          "Sync PODs from Control Tower to import existing team structures"
        ]}
        tips={[
          "PODs help organize deals by team",
          "Each deal can be assigned to a POD for better tracking",
          "POD data is synced from Control Tower every hour"
        ]}
        relatedLinks={[
          { label: "Sync PODs from Control Tower", href: "/adminpanel/data-sync" },
          { label: "User Management", href: "/adminpanel/users" }
        ]}
      />
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">POD Management</h1>
          <p className="text-muted-foreground">Manage your team PODs and their niches</p>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={importPodsFromControlTower.isPending}>
                <RefreshCw className={`mr-2 h-4 w-4 ${importPodsFromControlTower.isPending ? 'animate-spin' : ''}`} />
                {importPodsFromControlTower.isPending ? 'Importing...' : 'Import from Control Tower'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Import PODs from Control Tower?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will DELETE all existing PODs and replace them with PODs from Control Tower.
                  All deals will be re-mapped to the new PODs during the next sync.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleImportPods}>
                  Import PODs
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingPod(null); setFormData({ name: '', description: '' }); }}>
                <Plus className="mr-2 h-4 w-4" />
                Create POD
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingPod ? 'Edit POD' : 'Create New POD'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">POD Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Devsquad POD"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the POD's expertise and focus"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">{editingPod ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {pods.map((pod) => (
          <PODCard key={pod.id} pod={pod} onEdit={handleEdit} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}

function PODCard({ pod, onEdit, onDelete }: { pod: Pod; onEdit: (pod: Pod) => void; onDelete: (id: string) => void }) {
  const { niches } = useTargetNiches(pod.id);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {pod.name}
            </CardTitle>
            <CardDescription>{pod.description}</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(pod)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(pod.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={pod.is_active ? "default" : "secondary"}>
              {pod.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Target Niches</span>
            <Badge variant="outline">{niches.length}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
