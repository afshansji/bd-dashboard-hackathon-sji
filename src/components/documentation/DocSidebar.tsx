import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { DocCategory } from '@/lib/documentation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DocSidebarProps {
  categories: DocCategory[];
  currentDoc?: string;
  onSelectDoc: (docFile: string) => void;
}

export function DocSidebar({ categories, currentDoc, onSelectDoc }: DocSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map(cat => cat.id))
  );

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <ScrollArea className="h-[calc(100vh-12rem)]">
      <div className="space-y-1 pr-4">
        {categories.map((category) => {
          const isExpanded = expandedCategories.has(category.id);
          const Icon = category.icon;

          return (
            <div key={category.id}>
              <Button
                variant="ghost"
                onClick={() => toggleCategory(category.id)}
                className="w-full justify-start px-2 py-2 h-auto font-medium"
              >
                <Icon className="h-4 w-4 mr-2 shrink-0" />
                <span className="flex-1 text-left text-sm">{category.title}</span>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
              </Button>

              {isExpanded && (
                <div className="ml-6 mt-1 space-y-1">
                  {category.items.map((item) => (
                    <Button
                      key={item.id}
                      variant={currentDoc === item.file ? 'secondary' : 'ghost'}
                      onClick={() => onSelectDoc(item.file)}
                      className="w-full justify-start px-2 py-1.5 h-auto text-sm font-normal"
                    >
                      {item.title}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
