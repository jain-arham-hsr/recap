import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, GripVertical } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from "next-themes";

interface SortableCardProps {
  entry: any;
  onEdit: (entry: any) => void;
  onDelete: (id: string) => void;
}

export const SortableCard = ({ entry, onEdit, onDelete }: SortableCardProps) => {
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
    <div ref={setNodeRef} style={style}>
      <Card className="bg-card/30 border-border/50 hover:border-border transition-all group relative">
        <CardContent className="pt-6">
          <div className="absolute top-2 left-2 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
            <GripVertical className="h-5 w-5 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
          </div>
          
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onEdit(entry)}
              className="hover:bg-primary/10 text-primary hover:text-primary/80"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onDelete(entry.id)}
              className="hover:bg-destructive/10 text-destructive hover:text-destructive/80"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-4 pl-8">
            <code className="text-lg font-bold font-mono text-primary block break-all">
              {entry.syntax}
            </code>
            <p className="text-sm text-foreground/80 leading-relaxed">{entry.description}</p>
            {entry.example && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Example</span>
                  <span className="text-xs px-2.5 py-1 bg-muted/80 border border-border/50 rounded font-mono text-primary font-medium">
                    {entry.language || 'javascript'}
                  </span>
                </div>
                <SyntaxHighlighter
                  language={entry.language || "javascript"}
                  style={isDark ? vscDarkPlus : oneLight}
                  customStyle={{
                    margin: 0,
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                  }}
                >
                  {entry.example}
                </SyntaxHighlighter>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
