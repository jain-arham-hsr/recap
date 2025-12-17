import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { 
  useCheatsheets, 
  useCreateCheatsheet, 
  useSoftDeleteCheatsheet, 
  useRestoreCheatsheet, 
  usePermanentDeleteCheatsheet 
} from "@/hooks/useCheatsheets";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Trash2, LogOut, BookOpen, Sparkles, RotateCcw, Trash, Settings, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface CheatsheetListProps {
  onSelectCheatsheet: (id: string) => void;
  onSignOut: () => void;
  onOpenSettings: () => void;
}

export const CheatsheetList = ({ onSelectCheatsheet, onSignOut, onOpenSettings }: CheatsheetListProps) => {
  const { mode } = useApp();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const { data: cheatsheets, isLoading } = useCheatsheets("active");
  const { data: trashedCheatsheets } = useCheatsheets("trash");
  const createMutation = useCreateCheatsheet();
  const softDeleteMutation = useSoftDeleteCheatsheet();
  const restoreMutation = useRestoreCheatsheet();
  const permanentDeleteMutation = usePermanentDeleteCheatsheet();

  const trashCount = trashedCheatsheets?.length || 0;

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your cheatsheet.",
        variant: "destructive",
      });
      return;
    }

    try {
      const data = await createMutation.mutateAsync({ title, description });
      setOpen(false);
      setTitle("");
      setDescription("");
      toast({
        title: "Cheatsheet created!",
        description: "Start adding syntax entries.",
      });
      onSelectCheatsheet(data.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSoftDelete = async (id: string) => {
    await softDeleteMutation.mutateAsync(id);
    toast({
      title: "Moved to trash",
      description: "Cheatsheet has been moved to trash.",
    });
  };

  const handleRestore = async (id: string) => {
    await restoreMutation.mutateAsync(id);
    toast({
      title: "Restored",
      description: "Cheatsheet has been restored.",
    });
  };

  const handlePermanentDelete = async (id: string) => {
    await permanentDeleteMutation.mutateAsync(id);
    toast({
      title: "Permanently deleted",
      description: "Cheatsheet has been permanently removed.",
      variant: "destructive",
    });
  };

  return (
    <div className="flex-1">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gradient-to-br from-primary to-accent p-2">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                recap.
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            {/* Trash Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Trash</SheetTitle>
                  <SheetDescription>
                    {trashCount === 0 
                      ? "No items in trash" 
                      : `${trashCount} item${trashCount > 1 ? 's' : ''} in trash`
                    }
                  </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-120px)] mt-4 -mx-6 px-6">
                  {trashedCheatsheets?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Trash2 className="h-10 w-10 mb-3 opacity-50" />
                      <p className="text-sm">Trash is empty</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {trashedCheatsheets?.map((sheet) => (
                        <div 
                          key={sheet.id} 
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{sheet.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Deleted {new Date(sheet.deleted_at!).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleRestore(sheet.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handlePermanentDelete(sheet.id)}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <Button variant="ghost" size="icon" onClick={onOpenSettings}>
              <Settings className="h-4 w-4" />
            </Button>
            
            {mode === "cloud" && (
              <Button variant="ghost" size="icon" onClick={onSignOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            Your AI-powered knowledge companion
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Create New Card */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Card className="border-dashed border-2 hover:border-primary/50 cursor-pointer transition-all hover:bg-muted/30 group">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="rounded-full bg-primary/10 p-3 mb-3 group-hover:bg-primary/20 transition-colors">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <p className="font-medium">Create New Cheatsheet</p>
                  <p className="text-sm text-muted-foreground">Start documenting</p>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Cheatsheet</DialogTitle>
                <DialogDescription>
                  Give your cheatsheet a title and description.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Python Basics"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this cheatsheet..."
                  />
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Cheatsheet"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Loading State */}
          {isLoading && (
            <Card className="sm:col-span-2 lg:col-span-2">
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-6 w-6 mx-auto mb-2 animate-pulse text-primary" />
                <p className="text-sm">Loading your cheatsheets...</p>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!isLoading && cheatsheets?.length === 0 && (
            <Card className="sm:col-span-2 lg:col-span-2">
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No cheatsheets yet. Create one to get started!</p>
              </CardContent>
            </Card>
          )}

          {/* Cheatsheet Cards */}
          {cheatsheets?.map((sheet) => (
            <Card 
              key={sheet.id} 
              className="hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => onSelectCheatsheet(sheet.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <FileText className="h-5 w-5 text-primary" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSoftDelete(sheet.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="text-lg">{sheet.title}</CardTitle>
                <CardDescription className="line-clamp-2 text-sm">
                  {sheet.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(sheet.updated_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};
