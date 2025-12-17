import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Cloud, Sparkles, Trash2, Database, Copy, Check, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DATABASE_SETUP_SQL = `-- ================================================
-- RECAP APP - DATABASE SETUP SCRIPT
-- Run this in your Supabase SQL Editor
-- ================================================

-- 1. Create the cheatsheets table
CREATE TABLE IF NOT EXISTS public.cheatsheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 2. Create the syntax_entries table
CREATE TABLE IF NOT EXISTS public.syntax_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cheatsheet_id UUID NOT NULL REFERENCES public.cheatsheets(id) ON DELETE CASCADE,
  syntax TEXT NOT NULL,
  description TEXT,
  example TEXT,
  notes TEXT,
  category TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'javascript',
  display_format TEXT NOT NULL DEFAULT 'card',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Enable Row Level Security
ALTER TABLE public.cheatsheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syntax_entries ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for cheatsheets
CREATE POLICY "Users can view their own cheatsheets"
  ON public.cheatsheets FOR SELECT
  USING ((auth.uid() = user_id) AND (deleted_at IS NULL));

CREATE POLICY "Users can view their own deleted cheatsheets"
  ON public.cheatsheets FOR SELECT
  USING ((auth.uid() = user_id) AND (deleted_at IS NOT NULL));

CREATE POLICY "Users can create their own cheatsheets"
  ON public.cheatsheets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cheatsheets"
  ON public.cheatsheets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cheatsheets"
  ON public.cheatsheets FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Create RLS policies for syntax_entries
CREATE POLICY "Users can view entries of their own cheatsheets"
  ON public.syntax_entries FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cheatsheets
    WHERE cheatsheets.id = syntax_entries.cheatsheet_id
    AND cheatsheets.user_id = auth.uid()
  ));

CREATE POLICY "Users can create entries for their own cheatsheets"
  ON public.syntax_entries FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cheatsheets
    WHERE cheatsheets.id = syntax_entries.cheatsheet_id
    AND cheatsheets.user_id = auth.uid()
  ));

CREATE POLICY "Users can update entries in their own cheatsheets"
  ON public.syntax_entries FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.cheatsheets
    WHERE cheatsheets.id = syntax_entries.cheatsheet_id
    AND cheatsheets.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete entries from their own cheatsheets"
  ON public.syntax_entries FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.cheatsheets
    WHERE cheatsheets.id = syntax_entries.cheatsheet_id
    AND cheatsheets.user_id = auth.uid()
  ));

-- 6. Create function for auto-updating updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 7. Create triggers for auto-updating timestamps
CREATE TRIGGER update_cheatsheets_updated_at
  BEFORE UPDATE ON public.cheatsheets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_syntax_entries_updated_at
  BEFORE UPDATE ON public.syntax_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ================================================
-- SETUP COMPLETE!
-- ================================================
`;

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { config, updateConfig, clearConfig, mode, hasGemini } = useApp();
  const { toast } = useToast();

  const [supabaseUrl, setSupabaseUrl] = useState(config.supabaseUrl || "");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(config.supabaseAnonKey || "");
  const [geminiApiKey, setGeminiApiKey] = useState(config.geminiApiKey || "");
  const [copied, setCopied] = useState(false);

  const handleSaveSupabase = () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      toast({
        title: "Missing credentials",
        description: "Please enter both Supabase URL and Anon Key.",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(supabaseUrl);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid Supabase URL.",
        variant: "destructive",
      });
      return;
    }

    updateConfig({
      supabaseUrl: supabaseUrl.trim(),
      supabaseAnonKey: supabaseAnonKey.trim(),
    });

    toast({
      title: "Supabase configured!",
      description: "Your app is now in Cloud Mode.",
    });
  };

  const handleSaveGemini = () => {
    if (!geminiApiKey.trim()) {
      toast({
        title: "Missing API key",
        description: "Please enter your Gemini API key.",
        variant: "destructive",
      });
      return;
    }

    updateConfig({ geminiApiKey: geminiApiKey.trim() });

    toast({
      title: "Gemini API key saved!",
      description: "AI features are now enabled.",
    });
  };

  const handleClearSupabase = () => {
    updateConfig({ supabaseUrl: null, supabaseAnonKey: null });
    setSupabaseUrl("");
    setSupabaseAnonKey("");
    toast({
      title: "Supabase disconnected",
      description: "Switched back to Guest Mode.",
    });
  };

  const handleClearGemini = () => {
    updateConfig({ geminiApiKey: null });
    setGeminiApiKey("");
    toast({
      title: "Gemini API key removed",
      description: "AI features are now disabled.",
    });
  };

  const handleClearAll = () => {
    clearConfig();
    setSupabaseUrl("");
    setSupabaseAnonKey("");
    setGeminiApiKey("");
    toast({
      title: "All settings cleared",
      description: "Returned to default Guest Mode.",
    });
  };

  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(DATABASE_SETUP_SQL);
      setCopied(true);
      toast({
        title: "Copied to clipboard!",
        description: "Paste this SQL in your Supabase SQL Editor.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please manually select and copy the SQL.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[85vh] gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl font-semibold">Settings</DialogTitle>
          <div className="flex items-center gap-2 mt-3">
            <Badge 
              variant={mode === "cloud" ? "default" : "secondary"}
              className="text-xs font-medium"
            >
              {mode === "cloud" ? "Cloud Mode" : "Guest Mode"}
            </Badge>
            <Badge 
              variant={hasGemini ? "default" : "outline"}
              className="text-xs font-medium"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              AI {hasGemini ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="supabase" className="flex-1">
          <div className="px-6">
            <TabsList className="w-full h-10 p-1 bg-muted/50">
              <TabsTrigger value="supabase" className="flex-1 text-sm">
                <Cloud className="h-4 w-4 mr-2" />
                Supabase
              </TabsTrigger>
              <TabsTrigger value="gemini" className="flex-1 text-sm">
                <Sparkles className="h-4 w-4 mr-2" />
                Gemini AI
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="supabase" className="mt-0 focus-visible:ring-0">
            <ScrollArea className="h-[calc(85vh-220px)]">
              <div className="px-6 py-4 space-y-6">
                {/* Connection Section */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium">Connection</h3>
                    <p className="text-xs text-muted-foreground">
                      Connect your Supabase project for cloud sync.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="supabase-url" className="text-xs">Project URL</Label>
                      <Input
                        id="supabase-url"
                        placeholder="https://your-project.supabase.co"
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="supabase-key" className="text-xs">Anon Key</Label>
                      <Input
                        id="supabase-key"
                        type="password"
                        placeholder="eyJhbGciOiJIUzI1NiIs..."
                        value={supabaseAnonKey}
                        onChange={(e) => setSupabaseAnonKey(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveSupabase} size="sm" className="flex-1">
                        Save
                      </Button>
                      {mode === "cloud" && (
                        <Button variant="outline" size="sm" onClick={handleClearSupabase}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Database Setup Section */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium">Database Setup</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Run this SQL in your Supabase SQL Editor.
                    </p>
                  </div>
                  
                  <div className="relative rounded-lg border bg-muted/30 overflow-hidden">
                    <div className="absolute right-2 top-2 z-10">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleCopySQL}
                      >
                        {copied ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <ScrollArea className="h-36">
                      <pre className="p-3 pt-10 text-[11px] font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                        {DATABASE_SETUP_SQL}
                      </pre>
                    </ScrollArea>
                  </div>

                  <div className="rounded-lg bg-muted/30 p-3 space-y-2">
                    <p className="text-xs font-medium">Setup Instructions</p>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Go to your Supabase Dashboard</li>
                      <li>Navigate to SQL Editor</li>
                      <li>Paste this script and click "Run"</li>
                      <li>Enable Email Auth in Authentication → Providers</li>
                      <li>Enter your project URL and anon key above</li>
                    </ol>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="gemini" className="mt-0 focus-visible:ring-0">
            <ScrollArea className="h-[calc(85vh-220px)]">
              <div className="px-6 py-4 space-y-6">
                {/* API Key Section */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium">API Key</h3>
                    <p className="text-xs text-muted-foreground">
                      Enable AI-powered content generation.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="gemini-key" className="text-xs">Gemini API Key</Label>
                      <Input
                        id="gemini-key"
                        type="password"
                        placeholder="AIza..."
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveGemini} size="sm" className="flex-1">
                        Save
                      </Button>
                      {hasGemini && (
                        <Button variant="outline" size="sm" onClick={handleClearGemini}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Instructions Section */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium">How to Get an API Key</h3>
                    <p className="text-xs text-muted-foreground">
                      Get your free API key from Google AI Studio.
                    </p>
                  </div>
                  
                  <div className="rounded-lg bg-muted/30 p-3 space-y-3">
                    <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                      <li>
                        Visit{" "}
                        <a
                          href="https://aistudio.google.com/apikey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Google AI Studio
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                      <li>Sign in with your Google account</li>
                      <li>Click "Create API Key"</li>
                      <li>Copy and paste the key above</li>
                    </ol>
                    <p className="text-[11px] text-muted-foreground/70 pt-1 border-t border-border/50">
                      The Gemini API has a generous free tier for personal use.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="px-6 py-4 border-t bg-muted/20">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearAll} 
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
