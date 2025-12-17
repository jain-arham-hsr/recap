import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCheatsheet } from "@/hooks/useCheatsheets";
import { useSyntaxEntries, useCreateEntry, useUpdateEntry, useDeleteEntry, useReorderEntries } from "@/hooks/useSyntaxEntries";
import { useAIGenerate } from "@/hooks/useAIGenerate";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Download, Sparkles, Trash2, Loader2, Edit, RefreshCw, BookOpen, GripVertical, Settings, LayoutGrid, Table, List, Code } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableCard } from "./SortableCard";
import { SortableTableRow } from "./SortableTableRow";
import { SortableCompactRow } from "./SortableCompactRow";

interface CheatsheetEditorProps {
  cheatsheetId: string;
  onBack: () => void;
  onOpenSettings: () => void;
}

export const CheatsheetEditor = ({ cheatsheetId, onBack, onOpenSettings }: CheatsheetEditorProps) => {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [syntax, setSyntax] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [example, setExample] = useState("");
  const [displayFormat, setDisplayFormat] = useState<"card" | "table" | "compact">("card");
  const [language, setLanguage] = useState("javascript");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [editSyntax, setEditSyntax] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDisplayFormat, setEditDisplayFormat] = useState<"card" | "table" | "compact">("card");
  const [editLanguage, setEditLanguage] = useState("javascript");
  const [editDescription, setEditDescription] = useState("");
  const [editExample, setEditExample] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasGemini } = useApp();
  const { generate } = useAIGenerate();

  const { data: cheatsheet } = useCheatsheet(cheatsheetId);
  const { data: entries, isLoading } = useSyntaxEntries(cheatsheetId);
  const createMutation = useCreateEntry();
  const updateMutation = useUpdateEntry();
  const deleteMutation = useDeleteEntry();
  const reorderMutation = useReorderEntries();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && entries) {
      const oldIndex = entries.findIndex((entry) => entry.id === active.id);
      const newIndex = entries.findIndex((entry) => entry.id === over.id);

      const reorderedEntries = arrayMove(entries, oldIndex, newIndex);
      const updates = reorderedEntries.map((entry, index) => ({
        id: entry.id,
        position: index,
      }));
      reorderMutation.mutate({ cheatsheet_id: cheatsheetId, entries: updates });
    }
  };

  // Get unique categories from existing entries
  const existingCategories = Array.from(
    new Set(entries?.map((entry) => entry.category) || [])
  ).sort();

  const handleAIGenerate = async () => {
    if (!syntax.trim() || !category.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both syntax and category.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    const result = await generate({ syntax, category, customPrompt: customPrompt.trim() || null, displayFormat, language });
    if (result) {
      setDescription(result.description || "");
      setExample(result.example || "");
      if (result.language) {
        setLanguage(result.language);
      }
      toast({
        title: "Content generated!",
        description: "Review and edit the content before saving.",
      });
    }
    setIsGenerating(false);
  };

  const handleSaveEntry = async () => {
    if (!syntax.trim() || !category.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both syntax and category.",
        variant: "destructive",
      });
      return;
    }

    const maxPosition = entries?.reduce((max, entry) => Math.max(max, entry.position || 0), -1) ?? -1;

    await createMutation.mutateAsync({
      cheatsheet_id: cheatsheetId,
      syntax,
      category,
      description,
      example,
      display_format: displayFormat,
      language,
      position: maxPosition + 1,
    });

    setOpen(false);
    setSyntax("");
    setCategory("");
    setDescription("");
    setExample("");
    setDisplayFormat("card");
    setLanguage("javascript");
    setCustomPrompt("");
    toast({
      title: "Entry added!",
      description: "Syntax has been documented.",
    });
  };

  const handleEdit = (entry: any) => {
    setEditingEntry(entry);
    setEditSyntax(entry.syntax);
    setEditCategory(entry.category);
    setEditDisplayFormat(entry.display_format || "card");
    setEditLanguage(entry.language || "javascript");
    setEditDescription(entry.description || "");
    setEditExample(entry.example || "");
    setCustomPrompt("");
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editSyntax.trim() || !editCategory.trim()) {
      toast({
        title: "Missing information",
        description: "Syntax and category are required.",
        variant: "destructive",
      });
      return;
    }

    await updateMutation.mutateAsync({
      id: editingEntry.id,
      cheatsheet_id: cheatsheetId,
      syntax: editSyntax,
      category: editCategory,
      description: editDescription,
      example: editExample,
      display_format: editDisplayFormat,
      language: editLanguage,
    });

    setEditOpen(false);
    setEditingEntry(null);
    toast({
      title: "Entry updated!",
      description: "Changes have been saved.",
    });
  };

  const handleRegenerateWithPrompt = async () => {
    if (!editSyntax.trim() || !editCategory.trim()) {
      toast({
        title: "Missing information",
        description: "Syntax and category are required.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    const result = await generate({ 
      syntax: editSyntax, 
      category: editCategory, 
      customPrompt: customPrompt.trim() || null,
      displayFormat: editDisplayFormat,
      language: editLanguage
    });

    if (result) {
      setEditDescription(result.description);
      setEditExample(result.example);
      if (result.language) {
        setEditLanguage(result.language);
      }
      toast({
        title: "Regenerated!",
        description: "Review the changes and save when ready.",
      });
    }
    setIsGenerating(false);
  };

  const handleDeleteEntry = async (id: string) => {
    await deleteMutation.mutateAsync({ id, cheatsheet_id: cheatsheetId });
    toast({
      title: "Deleted",
      description: "Entry has been removed.",
    });
  };

  const exportToPDF = () => {
    if (!entries || entries.length === 0) {
      toast({
        title: "Nothing to export",
        description: "Add some entries first.",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const maxWidth = pageWidth - (margin * 2);
    
    // Simple syntax highlighter for PDF with word wrapping
    const highlightSyntax = (code: string, x: number, y: number, maxCodeWidth: number) => {
      const lines = code.split('\n');
      let currentY = y;
      
      lines.forEach(line => {
        // Wrap long lines - handle both word and character level wrapping
        const wrappedLines = [];
        let currentLine = '';
        
        // Split by spaces first
        const segments = line.split(' ');
        
        segments.forEach((segment, idx) => {
          // Check if single segment is too long
          const segmentWidth = doc.getTextWidth(segment);
          
          if (segmentWidth > maxCodeWidth) {
            // If current line has content, push it first
            if (currentLine) {
              wrappedLines.push(currentLine);
              currentLine = '';
            }
            
            // Split long segment by characters
            let charLine = '';
            for (let i = 0; i < segment.length; i++) {
              const testChar = charLine + segment[i];
              const testWidth = doc.getTextWidth(testChar);
              
              if (testWidth > maxCodeWidth && charLine) {
                wrappedLines.push(charLine);
                charLine = segment[i];
              } else {
                charLine = testChar;
              }
            }
            if (charLine) {
              currentLine = charLine;
            }
          } else {
            // Normal word wrapping
            const testLine = currentLine + (currentLine ? ' ' : '') + segment;
            const testWidth = doc.getTextWidth(testLine);
            
            if (testWidth > maxCodeWidth && currentLine) {
              wrappedLines.push(currentLine);
              currentLine = segment;
            } else {
              currentLine = testLine;
            }
          }
          
          if (idx === segments.length - 1 && currentLine) {
            wrappedLines.push(currentLine);
          }
        });
        
        if (wrappedLines.length === 0 && line.trim()) {
          wrappedLines.push(line);
        }
        
        if (wrappedLines.length === 0) {
          wrappedLines.push('');
        }
        
        wrappedLines.forEach(wrappedLine => {
          let currentX = x;
          
          // Keywords pattern (common programming keywords)
          const keywords = /\b(function|const|let|var|if|else|for|while|return|class|import|export|from|default|async|await|new|this|super|extends|implements|interface|type|enum|public|private|protected|static|void|null|undefined|true|false|try|catch|finally|throw|switch|case|break|continue|do|in|of|typeof|instanceof)\b/g;
          
          // Strings pattern
          const strings = /(['"`])(?:(?=(\\?))\2.)*?\1/g;
          
          // Comments pattern
          const comments = /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm;
          
          // Numbers pattern
          const numbers = /\b\d+\.?\d*\b/g;
          
          // Split line into tokens with their types
          const tokens: Array<{text: string, color: number[], type: string}> = [];
          let lastIndex = 0;
          const matches: Array<{index: number, length: number, type: string, color: number[]}> = [];
          
          // Find all matches
          let match;
          while ((match = keywords.exec(wrappedLine)) !== null) {
            matches.push({index: match.index, length: match[0].length, type: 'keyword', color: [147, 51, 234]});
          }
          while ((match = strings.exec(wrappedLine)) !== null) {
            matches.push({index: match.index, length: match[0].length, type: 'string', color: [34, 139, 34]});
          }
          while ((match = comments.exec(wrappedLine)) !== null) {
            matches.push({index: match.index, length: match[0].length, type: 'comment', color: [128, 128, 128]});
          }
          while ((match = numbers.exec(wrappedLine)) !== null) {
            matches.push({index: match.index, length: match[0].length, type: 'number', color: [176, 96, 16]});
          }
          
          // Sort matches by index
          matches.sort((a, b) => a.index - b.index);
          
          // Build tokens array
          matches.forEach(m => {
            if (m.index > lastIndex) {
              tokens.push({text: wrappedLine.substring(lastIndex, m.index), color: [60, 60, 60], type: 'default'});
            }
            tokens.push({text: wrappedLine.substring(m.index, m.index + m.length), color: m.color, type: m.type});
            lastIndex = m.index + m.length;
          });
          
          if (lastIndex < wrappedLine.length) {
            tokens.push({text: wrappedLine.substring(lastIndex), color: [60, 60, 60], type: 'default'});
          }
          
          if (tokens.length === 0) {
            tokens.push({text: wrappedLine, color: [60, 60, 60], type: 'default'});
          }
          
          // Render tokens
          tokens.forEach(token => {
            doc.setTextColor(token.color[0], token.color[1], token.color[2]);
            doc.text(token.text, currentX, currentY);
            currentX += doc.getTextWidth(token.text);
          });
          
          currentY += 4.5;
        });
      });
      
      doc.setTextColor(0, 0, 0);
      return currentY;
    };
    
    // Title
    doc.setFontSize(20);
    doc.text(cheatsheet?.title || "Cheatsheet", margin, 20);
    
    if (cheatsheet?.description) {
      doc.setFontSize(10);
      doc.text(cheatsheet.description, margin, 28);
    }

    // Group entries by category
    const grouped = entries.reduce((acc: any, entry: any) => {
      const cat = entry.category || "Uncategorized";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(entry);
      return acc;
    }, {});

    let yPosition = cheatsheet?.description ? 35 : 28;

    Object.entries(grouped).forEach(([category, categoryEntries]: [string, any]) => {
      // Check if we need a new page
      if (yPosition > 260) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(category, margin, yPosition);
      yPosition += 7;

      // Check if all entries in this category use 'card' format
      const allCards = categoryEntries.every((entry: any) => entry.display_format === 'card');

      if (allCards) {
        // Book-style format for cards
        categoryEntries.forEach((entry: any, index: number) => {
          // Check if we need a new page
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }

          // Syntax (title)
          doc.setFontSize(11);
          doc.setFont("courier", "bold");
          doc.setTextColor(0, 0, 0);
          const syntaxLines = doc.splitTextToSize(entry.syntax, maxWidth);
          doc.text(syntaxLines, margin, yPosition);
          yPosition += syntaxLines.length * 5 + 1;

          // Description
          if (entry.description) {
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            const descLines = doc.splitTextToSize(entry.description, maxWidth);
            doc.text(descLines, margin, yPosition);
            yPosition += descLines.length * 5;
          }

          // Example with syntax highlighting
          if (entry.example) {
            yPosition += 2;
            doc.setFontSize(8);
            doc.setFont("courier", "normal");
            
            // Calculate example height with wrapping
            doc.setFontSize(8);
            doc.setFont("courier", "normal");
            const exampleLines = entry.example.split('\n');
            let totalWrappedLines = 0;
            const codeMaxWidth = maxWidth - 4;
            exampleLines.forEach(line => {
              if (!line.trim()) {
                totalWrappedLines += 1;
                return;
              }
              const lineWidth = doc.getTextWidth(line);
              const wrappedCount = Math.ceil(lineWidth / codeMaxWidth);
              totalWrappedLines += Math.max(1, wrappedCount);
            });
            const exampleHeight = totalWrappedLines * 4.5 + 4;
            
            // Check if example fits on current page
            if (yPosition + exampleHeight > 280) {
              doc.addPage();
              yPosition = 20;
            }
            
            // Add background for example
            doc.setFillColor(245, 247, 250);
            doc.rect(margin, yPosition - 2, maxWidth, exampleHeight, 'F');
            
            // Render with syntax highlighting and wrapping
            yPosition = highlightSyntax(entry.example, margin + 2, yPosition + 2, maxWidth - 4);
            yPosition += 2;
          }

          // Add spacing between entries
          yPosition += 6;

          // Add separator line between entries (except last one)
          if (index < categoryEntries.length - 1) {
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 6;
          }
        });

        yPosition += 4;
      } else {
        // Table format for non-card entries with custom drawing for syntax highlighting
        categoryEntries.forEach((entry: any) => {
          // Calculate row height based on content with proper column widths
          const syntaxColWidth = 41; // 45 - 4 padding
          const descColWidth = 51;   // 55 - 4 padding  
          const exampleColWidth = 78; // 82 - 4 padding
          
          doc.setFontSize(8);
          doc.setFont("courier", "bold");
          const syntaxLines = doc.splitTextToSize(entry.syntax, syntaxColWidth);
          
          doc.setFont("helvetica", "normal");
          const descLines = doc.splitTextToSize(entry.description || "", descColWidth);
          
          // Calculate example height with proper wrapping
          let exampleLines = 1;
          if (entry.example) {
            const lines = entry.example.split('\n');
            exampleLines = 0;
            doc.setFontSize(7);
            doc.setFont("courier", "normal");
            lines.forEach(line => {
              if (!line.trim()) {
                exampleLines += 1;
                return;
              }
              const lineWidth = doc.getTextWidth(line);
              const wrappedCount = Math.ceil(lineWidth / exampleColWidth);
              exampleLines += Math.max(1, wrappedCount);
            });
          }
          
          const rowHeight = Math.max(
            syntaxLines.length * 5 + 4,
            descLines.length * 5 + 4,
            entry.example ? exampleLines * 4.5 + 4 : 10,
            15
          );
          
          // Check if we need a new page
          if (yPosition + rowHeight > 270) {
            doc.addPage();
            yPosition = 20;
          }
          
          // Draw borders
          doc.setDrawColor(200, 200, 200);
          doc.rect(margin, yPosition, 45, rowHeight);
          doc.rect(margin + 45, yPosition, 55, rowHeight);
          doc.rect(margin + 100, yPosition, 82, rowHeight);
          
          // Syntax column
          doc.setFontSize(8);
          doc.setFont("courier", "bold");
          doc.setTextColor(0, 0, 0);
          doc.text(syntaxLines, margin + 2, yPosition + 5);
          
          // Description column
          doc.setFont("helvetica", "normal");
          doc.text(descLines, margin + 47, yPosition + 5);
          
          // Example column with syntax highlighting
          if (entry.example) {
            doc.setFillColor(245, 247, 250);
            doc.rect(margin + 100, yPosition, 82, rowHeight, 'F');
            doc.setFont("courier", "normal");
            doc.setFontSize(7);
            highlightSyntax(entry.example, margin + 102, yPosition + 5, 78);
          }
          
          yPosition += rowHeight;
        });

        yPosition += 10;
      }
    });

    doc.save(`${cheatsheet?.title || "cheatsheet"}.pdf`);
    toast({
      title: "PDF exported!",
      description: "Your cheatsheet has been downloaded.",
    });
  };

  // Group entries by category for display
  const groupedEntries = entries?.reduce((acc: any, entry) => {
    if (!acc[entry.category]) {
      acc[entry.category] = [];
    }
    acc[entry.category].push(entry);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggZD0iTTM2IDE0YzAtMS4xLS45LTItMi0yaC04Yy0xLjEgMC0yIC45LTIgMnY4YzAgMS4xLjkgMiAyIDJoOGMxLjEgMCAyLS45IDItMnYtOHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20 dark:opacity-10"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 animate-fade-in">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline-light" 
              size="sm" 
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full"></div>
                <BookOpen className="h-7 w-7 text-primary relative" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">{cheatsheet?.title}</h1>
                {cheatsheet?.description && (
                  <p className="text-muted-foreground text-sm">{cheatsheet.description}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg shadow-primary/20">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Syntax Entry</DialogTitle>
                  <DialogDescription>
                    Enter the syntax details and optionally use AI to generate content.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={categoryOpen}
                          className="w-full justify-between"
                        >
                          {category || "Select or create category..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Search or type new category..." 
                            value={category}
                            onValueChange={setCategory}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {category.trim() ? (
                                <div className="p-2">
                                  <p className="text-sm text-muted-foreground mb-2">
                                    No category found.
                                  </p>
                                  <Button
                                    size="sm"
                                    className="w-full"
                                    onClick={() => setCategoryOpen(false)}
                                  >
                                    Create "{category}"
                                  </Button>
                                </div>
                              ) : (
                                <p className="p-2 text-sm text-muted-foreground">
                                  Type to create a new category
                                </p>
                              )}
                            </CommandEmpty>
                            {existingCategories.length > 0 && (
                              <CommandGroup heading="Existing Categories">
                                {existingCategories.map((cat) => (
                                  <CommandItem
                                    key={cat}
                                    value={cat}
                                    onSelect={(currentValue) => {
                                      setCategory(currentValue);
                                      setCategoryOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        category === cat ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {cat}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="syntax">Syntax</Label>
                    <Input
                      id="syntax"
                      value={syntax}
                      onChange={(e) => setSyntax(e.target.value)}
                      placeholder="e.g., Array.map()"
                      className="font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Code Language</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { value: "javascript", label: "JS" },
                          { value: "typescript", label: "TS" },
                          { value: "python", label: "PY" },
                          { value: "java", label: "Java" },
                          { value: "go", label: "Go" },
                          { value: "rust", label: "Rust" },
                          { value: "sql", label: "SQL" },
                          { value: "bash", label: "Bash" },
                        ].map((lang) => (
                          <button
                            key={lang.value}
                            type="button"
                            onClick={() => setLanguage(lang.value)}
                            className={cn(
                              "px-2.5 py-1 text-xs font-medium rounded-md border transition-colors",
                              language === lang.value
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                            )}
                          >
                            {lang.label}
                          </button>
                        ))}
                        <Select value={language} onValueChange={setLanguage}>
                          <SelectTrigger className="h-7 w-16 text-xs">
                            <span className="text-muted-foreground">More</span>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="csharp">C#</SelectItem>
                            <SelectItem value="cpp">C++</SelectItem>
                            <SelectItem value="php">PHP</SelectItem>
                            <SelectItem value="ruby">Ruby</SelectItem>
                            <SelectItem value="swift">Swift</SelectItem>
                            <SelectItem value="kotlin">Kotlin</SelectItem>
                            <SelectItem value="html">HTML</SelectItem>
                            <SelectItem value="css">CSS</SelectItem>
                            <SelectItem value="json">JSON</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Display Format</Label>
                      <ToggleGroup 
                        type="single" 
                        value={displayFormat} 
                        onValueChange={(value) => value && setDisplayFormat(value as "card" | "table" | "compact")}
                        className="justify-start"
                      >
                        <ToggleGroupItem value="card" aria-label="Card format" className="flex-1 gap-1.5">
                          <LayoutGrid className="h-3.5 w-3.5" />
                          <span className="text-xs">Card</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem value="table" aria-label="Table format" className="flex-1 gap-1.5">
                          <Table className="h-3.5 w-3.5" />
                          <span className="text-xs">Table</span>
                        </ToggleGroupItem>
                        <ToggleGroupItem value="compact" aria-label="Compact format" className="flex-1 gap-1.5">
                          <List className="h-3.5 w-3.5" />
                          <span className="text-xs">Compact</span>
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </div>
                  
                  {/* AI Generation Section */}
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className={cn("h-4 w-4", hasGemini ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-sm font-medium">AI Content Generation</span>
                    </div>
                    {hasGemini ? (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="customPrompt">Custom AI Prompt (optional)</Label>
                          <Textarea
                            id="customPrompt"
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            placeholder="e.g., Focus on performance implications, include edge cases..."
                            rows={2}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Guide the AI to focus on specific aspects
                          </p>
                        </div>
                        <Button 
                          onClick={handleAIGenerate} 
                          variant="outline"
                          className="w-full"
                          disabled={isGenerating || !syntax.trim() || !category.trim()}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-2" />
                              Generate with AI
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        AI is disabled. Configure your API key in Settings to enable AI-powered content generation.
                      </p>
                    )}
                  </div>

                  {/* Description and Example Fields */}
                  <div className="border-t border-border pt-4 space-y-4">
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What this syntax does..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="example">Example Code</Label>
                      <Textarea
                        id="example"
                        value={example}
                        onChange={(e) => setExample(e.target.value)}
                        placeholder="Code example..."
                        rows={4}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={handleSaveEntry} 
                      className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground"
                      disabled={isGenerating || !syntax.trim() || !category.trim()}
                    >
                      Save Entry
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Entry</DialogTitle>
                  <DialogDescription>
                    Manually edit the fields or use AI to regenerate with a custom prompt.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="editCategory">Category</Label>
                    <Popover open={editCategoryOpen} onOpenChange={setEditCategoryOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={editCategoryOpen}
                          className="w-full justify-between"
                        >
                          {editCategory || "Select or create category..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Search or type new category..." 
                            value={editCategory}
                            onValueChange={setEditCategory}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {editCategory.trim() ? (
                                <div className="p-2">
                                  <p className="text-sm text-muted-foreground mb-2">
                                    No category found.
                                  </p>
                                  <Button
                                    size="sm"
                                    className="w-full"
                                    onClick={() => setEditCategoryOpen(false)}
                                  >
                                    Create "{editCategory}"
                                  </Button>
                                </div>
                              ) : (
                                <p className="p-2 text-sm text-muted-foreground">
                                  Type to create a new category
                                </p>
                              )}
                            </CommandEmpty>
                            {existingCategories.length > 0 && (
                              <CommandGroup heading="Existing Categories">
                                {existingCategories.map((cat) => (
                                  <CommandItem
                                    key={cat}
                                    value={cat}
                                    onSelect={(currentValue) => {
                                      setEditCategory(currentValue);
                                      setEditCategoryOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        editCategory === cat ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {cat}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="editSyntax">Syntax</Label>
                    <Input
                      id="editSyntax"
                      value={editSyntax}
                      onChange={(e) => setEditSyntax(e.target.value)}
                      placeholder="e.g., Array.map()"
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editLanguage">Code Language</Label>
                    <Select value={editLanguage} onValueChange={setEditLanguage}>
                      <SelectTrigger id="editLanguage">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="typescript">TypeScript</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="java">Java</SelectItem>
                        <SelectItem value="csharp">C#</SelectItem>
                        <SelectItem value="cpp">C++</SelectItem>
                        <SelectItem value="go">Go</SelectItem>
                        <SelectItem value="rust">Rust</SelectItem>
                        <SelectItem value="php">PHP</SelectItem>
                        <SelectItem value="ruby">Ruby</SelectItem>
                        <SelectItem value="swift">Swift</SelectItem>
                        <SelectItem value="kotlin">Kotlin</SelectItem>
                        <SelectItem value="sql">SQL</SelectItem>
                        <SelectItem value="bash">Bash</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                        <SelectItem value="css">CSS</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="editDisplayFormat">Display Format</Label>
                    <Select value={editDisplayFormat} onValueChange={(value: any) => setEditDisplayFormat(value)}>
                      <SelectTrigger id="editDisplayFormat">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="card">Card (for commands, methods)</SelectItem>
                        <SelectItem value="table">Table (for properties, flags)</SelectItem>
                        <SelectItem value="compact">Compact (for lists)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="editDescription">Description</Label>
                    <Textarea
                      id="editDescription"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="What this does..."
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="editExample">Example</Label>
                    <Textarea
                      id="editExample"
                      value={editExample}
                      onChange={(e) => setEditExample(e.target.value)}
                      placeholder="Code example..."
                      rows={4}
                      className="font-mono text-sm"
                    />
                  </div>
                  
                  {/* AI Regenerate Section */}
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className={cn("h-4 w-4", hasGemini ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-sm font-medium">AI Regeneration</span>
                    </div>
                    {hasGemini ? (
                      <>
                        <Label htmlFor="editCustomPrompt">Regenerate with Custom Prompt</Label>
                        <Textarea
                          id="editCustomPrompt"
                          value={customPrompt}
                          onChange={(e) => setCustomPrompt(e.target.value)}
                          placeholder="e.g., Make it more beginner-friendly, focus on common use cases..."
                          rows={2}
                        />
                        <Button 
                          onClick={handleRegenerateWithPrompt}
                          variant="outline"
                          className="w-full mt-2"
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Regenerating...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Regenerate with AI
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        AI is disabled. Configure your API key in Settings to enable AI-powered regeneration.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSaveEdit} className="flex-1">
                      Save Changes
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setEditOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline-light"
              size="sm"
              onClick={exportToPDF}
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Card className="bg-card/50 backdrop-blur border-border animate-fade-in">
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <BookOpen className="h-8 w-8 text-primary animate-pulse" />
                <p className="text-muted-foreground">Loading entries...</p>
              </div>
            </CardContent>
          </Card>
        ) : !entries || entries.length === 0 ? (
          <Card className="border-2 border-dashed border-primary/30 bg-card/50 backdrop-blur animate-fade-in">
            <CardContent className="py-16 text-center">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                <Sparkles className="h-14 w-14 text-primary mx-auto relative" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">No entries yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Add your first syntax entry and let AI generate documentation for you.
              </p>
              <Button 
                onClick={() => setOpen(true)}
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Entry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedEntries).map(([category, categoryEntries]: [string, any]) => {
              // Group by display format within category
              const cardEntries = categoryEntries.filter((e: any) => e.display_format === "card" || !e.display_format);
              const tableEntries = categoryEntries.filter((e: any) => e.display_format === "table");
              const compactEntries = categoryEntries.filter((e: any) => e.display_format === "compact");

              return (
                <div key={category} className="animate-fade-in">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-1 w-1 rounded-full bg-primary"></div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {category}
                    </h2>
                    <div className="flex-1 h-px bg-gradient-to-r from-primary/50 to-transparent"></div>
                  </div>

                  {/* Card Format */}
                  {cardEntries.length > 0 && (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={cardEntries.map((e: any) => e.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="flex flex-col gap-4 mb-6">
                          {cardEntries.map((entry: any) => (
                            <SortableCard
                              key={entry.id}
                              entry={entry}
                              onEdit={handleEdit}
                              onDelete={(id) => deleteMutation.mutate({ id, cheatsheet_id: cheatsheet.id })}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}

                  {/* Table Format */}
                  {tableEntries.length > 0 && (
                    <Card className="mb-6 bg-card/30 border-border/50">
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                          >
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-slate-800 bg-slate-800/30">
                                  <th className="w-12"></th>
                                  <th className="text-left p-3 font-semibold text-sm text-slate-300 w-1/5">Syntax</th>
                                  <th className="text-left p-3 font-semibold text-sm text-slate-300 w-1/4">Description</th>
                                  <th className="text-left p-3 font-semibold text-sm text-slate-300 w-1/2">Example</th>
                                  <th className="w-20"></th>
                                </tr>
                              </thead>
                              <SortableContext
                                items={tableEntries.map((e: any) => e.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                <tbody>
                                  {tableEntries.map((entry: any) => (
                                    <SortableTableRow
                                      key={entry.id}
                                      entry={entry}
                                      onEdit={handleEdit}
                                      onDelete={(id) => deleteMutation.mutate({ id, cheatsheet_id: cheatsheet.id })}
                                    />
                                  ))}
                                </tbody>
                              </SortableContext>
                            </table>
                          </DndContext>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Compact Format */}
                  {compactEntries.length > 0 && (
                    <Card className="mb-6 bg-slate-900/30 border-slate-800/50">
                      <CardContent className="p-4">
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          <SortableContext
                            items={compactEntries.map((e: any) => e.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-2">
                              {compactEntries.map((entry: any) => (
                                <SortableCompactRow
                                  key={entry.id}
                                  entry={entry}
                                  onEdit={handleEdit}
                                  onDelete={(id) => deleteMutation.mutate({ id, cheatsheet_id: cheatsheet.id })}
                                />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
