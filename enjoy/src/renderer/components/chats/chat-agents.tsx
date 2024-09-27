import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Input,
} from "@renderer/components/ui";
import { ChatAgentCard, ChatAgentForm } from "@renderer/components";
import { PlusIcon } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { t } from "i18next";
import { useDebounce } from "@uidotdev/usehooks";
import { ChatProviderContext } from "@renderer/context";

export const ChatAgents = () => {
  const {
    chatAgents,
    fetchChatAgents,
    currentChatAgent,
    setCurrentChatAgent,
    destroyChatAgent,
    updateChatAgent,
    createChatAgent,
  } = useContext(ChatProviderContext);
  const [deletingChatAgent, setDeletingChatAgent] =
    useState<ChatAgentType>(null);
  const [editingChatAgent, setEditingChatAgent] = useState<ChatAgentType>(null);
  const [creatingChatAgent, setCreatingChatAgent] = useState<boolean>(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    fetchChatAgents(debouncedQuery);
  }, [debouncedQuery]);

  return (
    <>
      <div className="overflow-hidden h-full relative py-2 px-1">
        <div className="sticky flex items-center space-x-2 py-2 px-1">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded h-8 text-xs"
            placeholder={t("search")}
          />
          <Button
            className="w-8 h-8 p-0"
            variant="ghost"
            size="icon"
            onClick={() => setCreatingChatAgent(true)}
          >
            <PlusIcon className="w-4 h-4" />
          </Button>
        </div>
        {chatAgents.length === 0 && (
          <div className="text-center my-4">
            <span className="text-sm text-muted-foreground">{t("noData")}</span>
          </div>
        )}
        <div className="grid gap-1">
          {chatAgents.map((chatAgent) => (
            <ChatAgentCard
              key={chatAgent.id}
              chatAgent={chatAgent}
              selected={currentChatAgent?.id === chatAgent.id}
              onSelect={setCurrentChatAgent}
              onEdit={setEditingChatAgent}
              onDelete={setDeletingChatAgent}
            />
          ))}
        </div>
      </div>
      <AlertDialog
        open={!!deletingChatAgent}
        onOpenChange={() => setDeletingChatAgent(null)}
      >
        <AlertDialogContent>
          <AlertDialogTitle>{t("deleteChatAgent")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteChatAgentConfirmation")}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingChatAgent(null)}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive-hover"
              onClick={() => {
                destroyChatAgent(deletingChatAgent.id);
                setDeletingChatAgent(null);
              }}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={!!editingChatAgent}
        onOpenChange={() => setEditingChatAgent(null)}
      >
        <DialogContent className="max-w-screen-md max-h-full overflow-auto">
          <DialogTitle className="sr-only"></DialogTitle>
          <ChatAgentForm
            agent={editingChatAgent}
            onSave={(data) => {
              if (editingChatAgent) {
                return updateChatAgent(editingChatAgent.id, data);
              } else {
                return createChatAgent(data).then(() =>
                  setEditingChatAgent(null)
                );
              }
            }}
            onCancel={() => setEditingChatAgent(null)}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={creatingChatAgent} onOpenChange={setCreatingChatAgent}>
        <DialogContent className="max-w-screen-md max-h-full overflow-auto">
          <DialogTitle className="sr-only"></DialogTitle>
          <ChatAgentForm
            agent={null}
            onSave={async (data) => {
              const chatAgent = await createChatAgent(data);
              if (chatAgent) {
                setCurrentChatAgent(chatAgent);
              }
              setCreatingChatAgent(false);
            }}
            onCancel={() => setCreatingChatAgent(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
