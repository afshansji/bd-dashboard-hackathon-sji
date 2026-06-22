import { useState } from 'react';
import { Plus, Trash2, Save, X, Edit2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAccountabilityChart, type AccountabilityItem } from '@/hooks/useAccountabilityChart';

interface AccountabilityChartEditorProps {
  userId: string;
  isEditable?: boolean;
}

export function AccountabilityChartEditor({ userId, isEditable = true }: AccountabilityChartEditorProps) {
  const { items, isLoading, saveItem, deleteItem, isSaving } = useAccountabilityChart(userId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editForm, setEditForm] = useState({
    serial_number: 1,
    type_of_work: '',
    responsibilities: '',
  });

  const handleEdit = (item: AccountabilityItem) => {
    setEditingId(item.id);
    setEditForm({
      serial_number: item.serial_number,
      type_of_work: item.type_of_work,
      responsibilities: item.responsibilities,
    });
    setIsAddingNew(false);
  };

  const handleSave = () => {
    if (editingId) {
      saveItem({
        id: editingId,
        ...editForm,
      });
    } else {
      saveItem({
        user_id: userId,
        ...editForm,
      });
    }
    
    handleCancel();
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAddingNew(false);
    setEditForm({
      serial_number: 1,
      type_of_work: '',
      responsibilities: '',
    });
  };

  const handleDelete = (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this accountability item?')) {
      deleteItem(itemId);
    }
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingId(null);
    const nextSerialNumber = items.length > 0 ? Math.max(...items.map(i => i.serial_number)) + 1 : 1;
    setEditForm({
      serial_number: nextSerialNumber,
      type_of_work: '',
      responsibilities: '',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Accountability Chart</CardTitle>
            <CardDescription>
              Track your responsibilities and types of work
            </CardDescription>
          </div>
          {isEditable && (
            <Button onClick={handleAddNew} size="sm" disabled={isAddingNew || editingId !== null}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 && !isAddingNew ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No accountability items yet.</p>
            {isEditable && (
              <Button onClick={handleAddNew} variant="outline" className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Item
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Sr. No.</TableHead>
                  <TableHead className="w-[250px]">Type of Work</TableHead>
                  <TableHead>Responsibilities</TableHead>
                  {isEditable && <TableHead className="w-[100px]">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    {editingId === item.id ? (
                      <>
                        <TableCell>
                          <Input
                            type="number"
                            value={editForm.serial_number}
                            onChange={(e) => setEditForm({ ...editForm, serial_number: parseInt(e.target.value) || 0 })}
                            className="w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editForm.type_of_work}
                            onChange={(e) => setEditForm({ ...editForm, type_of_work: e.target.value })}
                            placeholder="Type of work"
                          />
                        </TableCell>
                        <TableCell>
                          <Textarea
                            value={editForm.responsibilities}
                            onChange={(e) => setEditForm({ ...editForm, responsibilities: e.target.value })}
                            placeholder="Enter responsibilities"
                            rows={3}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSave} disabled={isSaving}>
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleCancel}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium">{item.serial_number}</TableCell>
                        <TableCell className="font-medium">{item.type_of_work}</TableCell>
                        <TableCell className="whitespace-pre-wrap">{item.responsibilities}</TableCell>
                        {isEditable && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(item)}
                                disabled={editingId !== null || isAddingNew}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDelete(item.id)}
                                disabled={editingId !== null || isAddingNew}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </>
                    )}
                  </TableRow>
                ))}
                
                {isAddingNew && (
                  <TableRow>
                    <TableCell>
                      <Input
                        type="number"
                        value={editForm.serial_number}
                        onChange={(e) => setEditForm({ ...editForm, serial_number: parseInt(e.target.value) || 0 })}
                        className="w-16"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={editForm.type_of_work}
                        onChange={(e) => setEditForm({ ...editForm, type_of_work: e.target.value })}
                        placeholder="Type of work"
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        value={editForm.responsibilities}
                        onChange={(e) => setEditForm({ ...editForm, responsibilities: e.target.value })}
                        placeholder="Enter responsibilities"
                        rows={3}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSave} disabled={isSaving}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancel}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
