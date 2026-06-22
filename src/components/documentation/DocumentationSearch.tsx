import { useState, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DocItem, getAllDocItems } from '@/lib/documentation';
import Fuse from 'fuse.js';

interface DocumentationSearchProps {
  onSelectDoc: (docFile: string) => void;
  currentDoc?: string;
}

export function DocumentationSearch({ onSelectDoc, currentDoc }: DocumentationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DocItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const allDocs = useMemo(() => getAllDocItems(), []);

  const fuse = useMemo(() => {
    return new Fuse(allDocs, {
      keys: ['title', 'description', 'tags'],
      threshold: 0.3,
      includeScore: true,
    });
  }, [allDocs]);

  useEffect(() => {
    if (query.trim() === '') {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchResults = fuse.search(query);
    setResults(searchResults.map(result => result.item).slice(0, 8));
    setIsOpen(true);
  }, [query, fuse]);

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleSelectDoc = (docFile: string) => {
    onSelectDoc(docFile);
    handleClear();
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search documentation..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-2 w-full rounded-md border bg-popover shadow-lg">
          <div className="max-h-96 overflow-y-auto p-2">
            {results.map((doc) => (
              <button
                key={doc.id}
                onClick={() => handleSelectDoc(doc.file)}
                className={`w-full text-left p-3 rounded-md hover:bg-accent transition-colors ${
                  currentDoc === doc.file ? 'bg-accent' : ''
                }`}
              >
                <div className="font-medium text-sm">{doc.title}</div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {doc.description}
                </div>
                {doc.tags && (
                  <div className="flex gap-1 mt-2">
                    {doc.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
