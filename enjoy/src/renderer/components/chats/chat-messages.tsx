import {
  AppSettingsProviderContext,
  ChatSessionProviderContext,
} from "@renderer/context";
import {
  ChatAgentForm,
  ChatMemberForm,
  ChatMessage,
  LoaderSpin,
} from "@renderer/components";
import { useContext, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Avatar,
  AvatarImage,
  AvatarFallback,
  toast,
} from "@renderer/components/ui";
import { t } from "i18next";

export const ChatMessages = () => {
  const { chatMessages, chat, asking, chatMembers } = useContext(
    ChatSessionProviderContext
  );
  const { EnjoyApp } = useContext(AppSettingsProviderContext);
  const lastMessage = chatMessages[chatMessages.length - 1];
  const [editingChatMember, setEditingChatMember] =
    useState<ChatMemberType>(null);

  return (
    <>
      <div className="flex-1 space-y-6 px-4 mb-4">
        {chatMembers.map((member) => (
          <div key={member.id}>
            <div className="mb-2 flex">
              <ChatAgentAvatar chatMember={member} onClick={() => {}} />
            </div>
            <div className="py-2 mb-2 rounded-lg w-full">
              <div className="text-sm">{member.agent?.description}</div>
            </div>
          </div>
        ))}
        {chatMessages.map((message) => (
          <ChatMessage
            key={message.id}
            chatMessage={message}
            isLastMessage={lastMessage?.id === message.id}
            onEditChatMember={setEditingChatMember}
          />
        ))}
        {asking && (
          <ChatAgentMessageLoading
            chatMember={asking}
            onClick={() => setEditingChatMember(asking)}
          />
        )}
      </div>
      <Dialog
        open={!!editingChatMember}
        onOpenChange={() => setEditingChatMember(null)}
      >
        <DialogContent className="max-w-screen-sm max-h-[70%] overflow-y-auto">
          <DialogTitle>{editingChatMember?.agent?.name}</DialogTitle>
          <DialogDescription className="sr-only">
            Edit chat member
          </DialogDescription>
          {editingChatMember?.agent?.type === "GPT" && (
            <ChatMemberForm
              chat={chat}
              member={editingChatMember}
              onFinish={() => setEditingChatMember(null)}
            />
          )}
          {editingChatMember?.agent?.type === "TTS" && (
            <ChatAgentForm
              agent={editingChatMember.agent}
              onSave={(data) => {
                EnjoyApp.chatAgents
                  .update(editingChatMember.agent.id, data)
                  .then(() => {
                    toast.success(t("models.chatAgent.updated"));
                    setEditingChatMember(null);
                  })
                  .catch((error) => {
                    toast.error(error.message);
                  });
              }}
              onCancel={() => setEditingChatMember(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const ChatAgentMessageLoading = (props: {
  chatMember: ChatMemberType;
  onClick: () => void;
}) => {
  const { chatMember, onClick } = props;
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [ref]);

  return (
    <div ref={ref} className="mb-6">
      <div className="mb-2 flex">
        <ChatAgentAvatar chatMember={chatMember} onClick={onClick} />
      </div>
      <div className="py-2 mb-2 rounded-lg w-full">
        <LoaderSpin />
      </div>
    </div>
  );
};

const ChatAgentAvatar = (props: {
  chatMember: ChatMemberType;
  onClick: () => void;
}) => {
  const { chatMember, onClick } = props;
  if (!chatMember.agent) return null;

  return (
    <div
      className="flex items-center space-x-2 cursor-pointer"
      onClick={onClick}
    >
      <Avatar className="w-8 h-8 bg-background avatar">
        <AvatarImage src={chatMember.agent.avatarUrl}></AvatarImage>
        <AvatarFallback className="bg-background">
          {chatMember.name}
        </AvatarFallback>
      </Avatar>
      <div>
        <div className="text-sm">{chatMember.name}</div>
        <div className="italic text-xs text-muted-foreground/50">
          {chatMember.agent.type === "GPT" && chatMember.config.gpt?.model}
          {chatMember.agent.type === "TTS" &&
            chatMember.agent.config.tts?.voice}
        </div>
      </div>
    </div>
  );
};
