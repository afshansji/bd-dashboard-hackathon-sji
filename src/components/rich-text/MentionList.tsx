import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { SuggestionProps } from '@tiptap/suggestion';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  name: string;
  email?: string;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const MentionList = forwardRef<MentionListRef, SuggestionProps<TeamMember>>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = props.items[index];

      if (item) {
        props.command({ id: item.id, label: item.name });
      }
    };

    const upHandler = () => {
      setSelectedIndex(
        (selectedIndex + props.items.length - 1) % props.items.length
      );
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % props.items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [props.items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === 'ArrowUp') {
          upHandler();
          return true;
        }

        if (event.key === 'ArrowDown') {
          downHandler();
          return true;
        }

        if (event.key === 'Enter') {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    if (props.items.length === 0) {
      return (
        <div className="bg-popover border rounded-md p-2 shadow-lg text-sm text-muted-foreground">
          No results found
        </div>
      );
    }

    return (
      <div className="bg-popover border rounded-md shadow-lg overflow-hidden min-w-[200px]">
        {props.items.map((item, index) => (
          <button
            type="button"
            key={item.id}
            onClick={() => selectItem(index)}
            className={cn(
              'w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors',
              index === selectedIndex && 'bg-accent'
            )}
          >
            <span className="font-medium">{item.name}</span>
            {item.email && (
              <span className="text-muted-foreground ml-2 text-xs">
                {item.email}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }
);

MentionList.displayName = 'MentionList';

export default MentionList;
