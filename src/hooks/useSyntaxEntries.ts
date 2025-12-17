import { useApp } from "@/contexts/AppContext";
import { entriesDB, LocalSyntaxEntry, generateId } from "@/lib/indexedDB";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useSyntaxEntries(cheatsheetId: string) {
  const { mode, supabaseClient } = useApp();

  return useQuery({
    queryKey: ["entries", cheatsheetId, mode],
    queryFn: async () => {
      if (mode === "cloud" && supabaseClient) {
        const { data, error } = await supabaseClient
          .from("syntax_entries")
          .select("*")
          .eq("cheatsheet_id", cheatsheetId)
          .order("position", { ascending: true });
        
        if (error) throw error;
        return data || [];
      }

      // Guest mode
      const entries = await entriesDB.getByCheatsheetId(cheatsheetId);
      return entries.sort((a, b) => a.position - b.position);
    },
  });
}

export function useCreateEntry() {
  const { mode, supabaseClient } = useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      cheatsheet_id: string;
      syntax: string;
      category: string;
      description: string | null;
      example: string | null;
      display_format: string;
      language: string;
      position: number;
    }) => {
      if (mode === "cloud" && supabaseClient) {
        const { data, error } = await supabaseClient
          .from("syntax_entries")
          .insert({
            ...entry,
            notes: null,
          })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }

      // Guest mode
      const newEntry: LocalSyntaxEntry = {
        id: generateId(),
        ...entry,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await entriesDB.put(newEntry);
      return newEntry;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entries", variables.cheatsheet_id] });
    },
  });
}

export function useUpdateEntry() {
  const { mode, supabaseClient } = useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      id: string;
      cheatsheet_id: string;
      syntax: string;
      category: string;
      description: string | null;
      example: string | null;
      display_format: string;
      language: string;
    }) => {
      if (mode === "cloud" && supabaseClient) {
        const { error } = await supabaseClient
          .from("syntax_entries")
          .update({
            syntax: entry.syntax,
            category: entry.category,
            description: entry.description,
            example: entry.example,
            display_format: entry.display_format,
            language: entry.language,
          })
          .eq("id", entry.id);
        
        if (error) throw error;
        return;
      }

      // Guest mode
      const all = await entriesDB.getAll();
      const existing = all.find(e => e.id === entry.id);
      if (existing) {
        await entriesDB.put({
          ...existing,
          ...entry,
          updated_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entries", variables.cheatsheet_id] });
    },
  });
}

export function useDeleteEntry() {
  const { mode, supabaseClient } = useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, cheatsheet_id }: { id: string; cheatsheet_id: string }) => {
      if (mode === "cloud" && supabaseClient) {
        const { error } = await supabaseClient
          .from("syntax_entries")
          .delete()
          .eq("id", id);
        
        if (error) throw error;
        return;
      }

      // Guest mode
      await entriesDB.delete(id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entries", variables.cheatsheet_id] });
    },
  });
}

export function useReorderEntries() {
  const { mode, supabaseClient } = useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cheatsheet_id, entries }: { cheatsheet_id: string; entries: { id: string; position: number }[] }) => {
      if (mode === "cloud" && supabaseClient) {
        for (const update of entries) {
          const { error } = await supabaseClient
            .from("syntax_entries")
            .update({ position: update.position })
            .eq("id", update.id);
          
          if (error) throw error;
        }
        return;
      }

      // Guest mode
      const all = await entriesDB.getAll();
      const positionMap = new Map(entries.map(e => [e.id, e.position]));
      
      for (const entry of all) {
        if (positionMap.has(entry.id)) {
          await entriesDB.put({ ...entry, position: positionMap.get(entry.id)! });
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["entries", variables.cheatsheet_id] });
    },
  });
}
