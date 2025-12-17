import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient, SupabaseClient, User, Session } from "@supabase/supabase-js";
import { configDB, AppConfig } from "@/lib/indexedDB";

interface AppContextType {
  mode: "guest" | "cloud";
  config: AppConfig;
  supabaseClient: SupabaseClient | null;
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  hasGemini: boolean;
  updateConfig: (config: Partial<AppConfig>) => void;
  clearConfig: () => void;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>({
    supabaseUrl: null,
    supabaseAnonKey: null,
    geminiApiKey: null,
  });
  const [configLoaded, setConfigLoaded] = useState(false);
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const mode = config.supabaseUrl && config.supabaseAnonKey ? "cloud" : "guest";
  const hasGemini = !!config.geminiApiKey;

  // Load config from IndexedDB on mount
  useEffect(() => {
    configDB.get().then((storedConfig) => {
      setConfig(storedConfig);
      setConfigLoaded(true);
    }).catch(() => {
      setConfigLoaded(true);
    });
  }, []);

  // Initialize Supabase client when config changes
  useEffect(() => {
    if (!configLoaded) return;

    if (config.supabaseUrl && config.supabaseAnonKey) {
      try {
        const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
          auth: {
            storage: localStorage,
            persistSession: true,
            autoRefreshToken: true,
          },
        });
        setSupabaseClient(client);

        // Set up auth listener
        const { data: { subscription } } = client.auth.onAuthStateChange(
          (_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
          }
        );

        // Check for existing session
        client.auth.getSession().then(({ data: { session } }) => {
          setSession(session);
          setUser(session?.user ?? null);
          setIsLoading(false);
        });

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error("Failed to initialize Supabase client:", error);
        setSupabaseClient(null);
        setIsLoading(false);
      }
    } else {
      setSupabaseClient(null);
      setUser(null);
      setSession(null);
      setIsLoading(false);
    }
  }, [config.supabaseUrl, config.supabaseAnonKey, configLoaded]);

  // Persist config to IndexedDB
  useEffect(() => {
    if (configLoaded) {
      configDB.set(config);
    }
  }, [config, configLoaded]);

  const updateConfig = (newConfig: Partial<AppConfig>) => {
    setConfig((prev) => ({ ...prev, ...newConfig }));
  };

  const clearConfig = () => {
    setConfig({ supabaseUrl: null, supabaseAnonKey: null, geminiApiKey: null });
    configDB.clear();
  };

  const signOut = async () => {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    setUser(null);
    setSession(null);
  };

  // Show loading until config is loaded from IndexedDB
  if (!configLoaded) {
    return null;
  }

  return (
    <AppContext.Provider
      value={{
        mode,
        config,
        supabaseClient,
        user,
        session,
        isLoading,
        hasGemini,
        updateConfig,
        clearConfig,
        signOut,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
