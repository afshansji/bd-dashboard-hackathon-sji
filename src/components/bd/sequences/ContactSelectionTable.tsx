import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ContactSelectionTableProps {
  campaignId: string;
  selectedContactIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function ContactSelectionTable({
  campaignId,
  selectedContactIds,
  onSelectionChange,
}: ContactSelectionTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['campaign-contacts', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_contacts')
        .select('id, contact_name, contact_email, current_employer, contact_company, status')
        .eq('campaign_id', campaignId)
        .order('contact_name');

      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });

  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    
    const query = searchQuery.toLowerCase();
    return contacts.filter(contact =>
      contact.contact_name?.toLowerCase().includes(query) ||
      contact.contact_email?.toLowerCase().includes(query) ||
      contact.current_employer?.toLowerCase().includes(query) ||
      contact.contact_company?.toLowerCase().includes(query)
    );
  }, [contacts, searchQuery]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(filteredContacts.map(c => c.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectContact = (contactId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedContactIds, contactId]);
    } else {
      onSelectionChange(selectedContactIds.filter(id => id !== contactId));
    }
  };

  const isAllSelected = filteredContacts.length > 0 && 
    filteredContacts.every(c => selectedContactIds.includes(c.id));

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading contacts...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {selectedContactIds.length} of {contacts.length} selected
        </div>
      </div>

      <div className="border rounded-lg max-h-96 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No contacts found
                </TableCell>
              </TableRow>
            ) : (
              filteredContacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedContactIds.includes(contact.id)}
                      onCheckedChange={(checked) => 
                        handleSelectContact(contact.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {contact.contact_name || '-'}
                  </TableCell>
                  <TableCell>{contact.contact_email || '-'}</TableCell>
                  <TableCell>
                    {contact.current_employer || contact.contact_company || '-'}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-muted">
                      {contact.status || 'new'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}