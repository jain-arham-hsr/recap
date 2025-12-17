import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from "@/components/ui/button";
import { Edit, Trash2, GripVertical } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from "next-themes";

interface SortableTableRowProps {
  entry: any;
  onEdit: (entry: any) => void;
  onDelete: (id: string) => void;
}

export const SortableTableRow = ({ entry, onEdit, onDelete }: SortableTableRowProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr 
      ref={setNodeRef} 
      style={style}
      className="border-b border-border/50 hover:bg-muted/20 transition-colors group"
    >
      <td className="p-3">
        <div className="cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="h-4 w-4 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
        </div>
      </td>
      <td className="p-3 font-mono text-sm text-primary font-semibold align-top">
        {entry.syntax}
      </td>
      <td className="p-3 text-sm align-top text-foreground/80">{entry.description}</td>
      <td className="p-3 align-top">
        {entry.example && (
          <div className="space-y-1.5">
            <span className="text-xs px-2.5 py-1 bg-muted/80 border border-border/50 rounded font-mono text-primary font-medium inline-block">
              {entry.language || 'javascript'}
            </span>
            <SyntaxHighlighter
              language={entry.language || "javascript"}
              style={isDark ? vscDarkPlus : oneLight}
              customStyle={{
                margin: 0,
                borderRadius: '0.25rem',
                fontSize: '0.7rem',
              }}
            >
              {entry.example}
            </SyntaxHighlighter>
          </div>
        )}
      </td>
      <td className="p-3 align-top">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onEdit(entry)}
            className="hover:bg-primary/10 text-primary"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onDelete(entry.id)}
            className="hover:bg-destructive/10 text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
};
