import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Extract headings from markdown content
    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const matches = [...content.matchAll(headingRegex)];
    
    const extractedHeadings: Heading[] = matches.map((match, index) => {
      const level = match[1].length;
      const text = match[2].replace(/[#*`]/g, '').trim();
      const id = `heading-${index}`;
      return { id, text, level };
    });

    setHeadings(extractedHeadings);
  }, [content]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-80px 0px -80% 0px' }
    );

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold mb-4">On This Page</h4>
      <div className="space-y-1">
        {headings.map((heading) => (
          <Button
            key={heading.id}
            variant="ghost"
            onClick={() => {
              const element = document.getElementById(heading.id);
              element?.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`w-full justify-start text-xs h-auto py-1.5 ${
              heading.level === 2 ? 'pl-2' : heading.level === 3 ? 'pl-4' : 'pl-0'
            } ${activeId === heading.id ? 'text-primary bg-accent' : 'text-muted-foreground'}`}
          >
            {heading.text}
          </Button>
        ))}
      </div>
    </div>
  );
}
