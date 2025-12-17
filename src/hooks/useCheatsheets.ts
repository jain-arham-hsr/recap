import { useApp } from "@/contexts/AppContext";
import { cheatsheetsDB, entriesDB, LocalCheatsheet, generateId } from "@/lib/indexedDB";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useCheatsheets(view: "active" | "trash" = "active") {
  const { mode, supabaseClient, user } = useApp();

  return useQuery({
    queryKey: ["cheatsheets", view, mode, user?.id],
    queryFn: async () => {
      if (mode === "cloud" && supabaseClient && user) {
        const { data, error } = await supabaseClient
          .from("cheatsheets")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        
        if (view === "trash") {
          return data?.filter(c => c.deleted_at !== null) || [];
        }
        return data?.filter(c => c.deleted_at === null) || [];
      }

      // Guest mode: use IndexedDB
      const localCheatsheets = await cheatsheetsDB.getAll();
      const sorted = localCheatsheets.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      if (view === "trash") {
        return sorted.filter(c => c.deleted_at !== null);
      }
      return sorted.filter(c => c.deleted_at === null);
    },
  });
}

export function useCreateCheatsheet() {
  const { mode, supabaseClient, user } = useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ title, description }: { title: string; description: string }) => {
      if (mode === "cloud" && supabaseClient && user) {
        const { data, error } = await supabaseClient
          .from("cheatsheets")
          .insert({ title, description, user_id: user.id })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }

      // Guest mode
      const newCheatsheet: LocalCheatsheet = {
        id: generateId(),
        title,
        description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      };
      await cheatsheetsDB.put(newCheatsheet);
      return newCheatsheet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheatsheets"] });
    },
  });
}

export function useSoftDeleteCheatsheet() {
  const { mode, supabaseClient } = useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (mode === "cloud" && supabaseClient) {
        const { error } = await supabaseClient
          .from("cheatsheets")
          .update({ deleted_at: new Date().toISOString() })
          .eq("id", id);
        
        if (error) throw error;
        return;
      }

      // Guest mode
      const cheatsheet = await cheatsheetsDB.get(id);
      if (cheatsheet) {
        await cheatsheetsDB.put({ ...cheatsheet, deleted_at: new Date().toISOString() });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheatsheets"] });
    },
  });
}

export function useRestoreCheatsheet() {
  const { mode, supabaseClient } = useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (mode === "cloud" && supabaseClient) {
        const { error } = await supabaseClient
          .from("cheatsheets")
          .update({ deleted_at: null })
          .eq("id", id);
        
        if (error) throw error;
        return;
      }

      // Guest mode
      const cheatsheet = await cheatsheetsDB.get(id);
      if (cheatsheet) {
        await cheatsheetsDB.put({ ...cheatsheet, deleted_at: null });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheatsheets"] });
    },
  });
}

export function usePermanentDeleteCheatsheet() {
  const { mode, supabaseClient } = useApp();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (mode === "cloud" && supabaseClient) {
        // Delete entries first due to FK constraint
        await supabaseClient.from("syntax_entries").delete().eq("cheatsheet_id", id);
        const { error } = await supabaseClient.from("cheatsheets").delete().eq("id", id);
        if (error) throw error;
        return;
      }

      // Guest mode
      await entriesDB.deleteByCheatsheetId(id);
      await cheatsheetsDB.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheatsheets"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useCheatsheet(id: string) {
  const { mode, supabaseClient } = useApp();

  return useQuery({
    queryKey: ["cheatsheet", id, mode],
    queryFn: async () => {
      if (mode === "cloud" && supabaseClient) {
        const { data, error } = await supabaseClient
          .from("cheatsheets")
          .select("*")
          .eq("id", id)
          .single();
        
        if (error) throw error;
        return data;
      }

      // Guest mode
      return await cheatsheetsDB.get(id);
    },
  });
}
