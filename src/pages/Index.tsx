import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { AuthForm } from "@/components/AuthForm";
import { CheatsheetList } from "@/components/CheatsheetList";
import { CheatsheetEditor } from "@/components/CheatsheetEditor";
import { GuestModeBanner } from "@/components/GuestModeBanner";
import { SettingsModal } from "@/components/SettingsModal";

const Index = () => {
  const { mode, user, isLoading, signOut } = useApp();
  const [selectedCheatsheet, setSelectedCheatsheet] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Cloud mode requires authentication
  if (mode === "cloud" && !user) {
    return (
      <>
        <AuthForm onOpenSettings={() => setSettingsOpen(true)} />
        <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      </>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    setSelectedCheatsheet(null);
  };

  if (selectedCheatsheet) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {mode === "guest" && <GuestModeBanner onSwitchToCloud={() => setSettingsOpen(true)} />}
        <CheatsheetEditor
          cheatsheetId={selectedCheatsheet}
          onBack={() => setSelectedCheatsheet(null)}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {mode === "guest" && <GuestModeBanner onSwitchToCloud={() => setSettingsOpen(true)} />}
      <CheatsheetList
        onSelectCheatsheet={setSelectedCheatsheet}
        onSignOut={handleSignOut}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default Index;
