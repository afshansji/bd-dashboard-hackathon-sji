import { useParams, Link } from "react-router-dom";
import { useClientBySlug } from "@/hooks/useClientBySlug";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Building2, 
  ExternalLink, 
  Globe, 
  MapPin, 
  Users, 
  Calendar,
  Linkedin,
  ArrowLeft,
  TrendingUp,
  User
} from "lucide-react";
import { getValidUrl } from "@/lib/urlUtils";

export default function CompanyDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: company, isLoading } = useClientBySlug(slug);

  // Fetch contacts for this company via client name match
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ["company-contacts", company?.company],
    queryFn: async () => {
      if (!company?.company) return [];
      
      const { data, error } = await supabase
        .from("campaign_contacts")
        .select(`
          id,
          slug,
          contact_name,
          contact_email,
          contact_title,
          current_position_title,
          contact_linkedin_url,
          status,
          campaign_id,
          bd_campaigns (
            name,
            slug
          )
        `)
        .eq("contact_company", company.company)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!company?.company,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Company Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The company you're looking for doesn't exist.
            </p>
            <Button asChild>
              <Link to="/campaigns">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Outreach
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/campaigns">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            
            <div className="flex items-start gap-4">
              {company.logo_url ? (
                <img 
                  src={company.logo_url} 
                  alt={`${company.company || company.name} logo`}
                  className="h-16 w-16 rounded-lg object-cover border"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center border">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              
              <div className="space-y-2">
                <h1 className="text-3xl font-bold">{company.company || company.name}</h1>
                <div className="flex flex-wrap gap-2">
                  {company.industry && (
                    <Badge variant="secondary">
                      <Building2 className="h-3 w-3 mr-1" />
                      {company.industry}
                    </Badge>
                  )}
                  {company.employee_count && (
                    <Badge variant="secondary">
                      <Users className="h-3 w-3 mr-1" />
                      {company.employee_count}
                    </Badge>
                  )}
                  {(company.city || company.state || company.country) && (
                    <Badge variant="secondary">
                      <MapPin className="h-3 w-3 mr-1" />
                      {[company.city, company.state, company.country].filter(Boolean).join(', ')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {getValidUrl(company.website) && (
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={getValidUrl(company.website)!} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Website
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            )}
            {company.linkedin_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={company.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-4 w-4 mr-2" />
                  LinkedIn
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Overview */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {company.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {company.description}
                </p>
              )}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                {company.revenue && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      ${company.revenue.toLocaleString()}
                    </p>
                  </div>
                )}
                {company.employee_count && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Employees</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {company.employee_count}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Technologies */}
          {company.technologies && company.technologies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Technology Stack</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {company.technologies.map((tech, index) => (
                    <Badge key={index} variant="outline">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Specialties */}
          {company.specialties && company.specialties.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Specialties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {company.specialties.map((specialty, index) => (
                    <Badge key={index} variant="secondary">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI Research Insights */}
        {company.research_summary && Object.keys(company.research_summary).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                AI Research Insights
              </CardTitle>
              {company.last_researched_at && (
                <p className="text-xs text-muted-foreground">
                  Last researched: {new Date(company.last_researched_at).toLocaleDateString()}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap">
                {JSON.stringify(company.research_summary, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Company Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contacts at {company.company || company.name} ({contacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contactsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Contacts Found</h3>
                <p className="text-sm text-muted-foreground">
                  There are no contacts linked to this company yet.
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Campaign</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact: any) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {contact.contact_name}
                            {contact.contact_linkedin_url && (
                              <a 
                                href={contact.contact_linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80"
                              >
                                <Linkedin className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {contact.current_position_title || contact.contact_title || '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {contact.contact_email || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {contact.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {contact.bd_campaigns ? (
                            <Link 
                              to={`/campaigns/${contact.bd_campaigns.slug}`}
                              className="text-sm text-primary hover:underline"
                            >
                              {contact.bd_campaigns.name}
                            </Link>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/campaigns/${contact.bd_campaigns?.slug}/contacts/${contact.slug}`} target="_blank" rel="noopener noreferrer">
                              View Details
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
