import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance } from 'tippy.js';
import { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
import MentionList, { MentionListRef } from './MentionList';
import Fuse from 'fuse.js';

interface TeamMember {
  id: string;
  name: string;
  email?: string;
}

export const MentionSuggestion = (teamMembers: TeamMember[]): Omit<SuggestionOptions, 'editor'> => {
  return {
    items: ({ query }: { query: string }) => {
      console.log('MentionSuggestion - Query:', query);
      console.log('MentionSuggestion - Team Members:', teamMembers);
      
      // If no query, return first 5 members
      if (!query || query.length === 0) {
        const result = teamMembers.slice(0, 5);
        console.log('No query - returning:', result);
        return result;
      }
      
      // Create fresh Fuse instance for fuzzy searching
      const fuse = new Fuse(teamMembers, {
        keys: ['name', 'email'],
        threshold: 0.3,
        includeScore: true,
      });
      
      // Use fuzzy search to find matching members
      const fuseResults = fuse.search(query);
      const results = fuseResults.map(result => result.item).slice(0, 5);
      console.log('Search results:', results);
      return results;
    },

    render: () => {
      let component: ReactRenderer<MentionListRef> | null = null;
      let popup: Instance[] | null = null;

      return {
        onStart: (props: SuggestionProps) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          });
        },

        onUpdate(props: SuggestionProps) {
          component?.updateProps(props);

          if (!props.clientRect) {
            return;
          }

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        },

        onKeyDown(props: { event: KeyboardEvent }) {
          if (props.event.key === 'Escape') {
            popup?.[0]?.hide();
            return true;
          }

          return component?.ref?.onKeyDown(props) ?? false;
        },

        onExit() {
          popup?.[0]?.destroy();
          component?.destroy();
        },
      };
    },
  };
};
