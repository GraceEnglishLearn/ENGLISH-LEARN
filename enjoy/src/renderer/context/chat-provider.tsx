import { createContext, useEffect, useState } from "react";
import { useChat, useChatAgent } from "@renderer/hooks";

type ChatProviderState = {
  chats: ChatType[];
  currentChat: ChatType;
  setCurrentChat: (chat: ChatType) => void;
  currentChatAgent: ChatAgentType;
  setCurrentChatAgent: (chatAgent: ChatAgentType) => void;
  fetchChats: (query?: string) => Promise<void>;
  createChat: (data: {
    name: string;
    topic: string;
    members: Array<{
      userId?: string;
      userType?: "User" | "Agent";
      config?: {
        prompt?: string;
        introduction?: string;
        gpt?: GptConfigType;
        tts?: TtsConfigType;
      };
    }>;
    config: {
      sttEngine: string;
    };
  }) => Promise<void>;
  updateChat: (
    id: string,
    data: {
      name: string;
      topic: string;
      members: Array<{
        userId?: string;
        userType?: "User" | "Agent";
        config?: {
          prompt?: string;
          introduction?: string;
          gpt?: GptConfigType;
          tts?: TtsConfigType;
        };
      }>;
      config: {
        sttEngine: string;
      };
    }
  ) => Promise<void>;
  destroyChat: (id: string) => Promise<void>;
  chatAgents: ChatAgentType[];
  fetchChatAgents: (query?: string) => Promise<void>;
  updateChatAgent: (
    id: string,
    data: Partial<ChatAgentType>
  ) => Promise<void | ChatAgentType>;
  createChatAgent: (
    data: Partial<ChatAgentType>
  ) => Promise<void | ChatAgentType>;
  destroyChatAgent: (id: string) => Promise<void>;
};

const initialState: ChatProviderState = {
  chats: [],
  currentChat: null,
  setCurrentChat: () => null,
  currentChatAgent: null,
  setCurrentChatAgent: () => null,
  fetchChats: () => null,
  createChat: () => null,
  updateChat: () => null,
  destroyChat: () => null,
  chatAgents: [],
  fetchChatAgents: () => null,
  updateChatAgent: () => null,
  createChatAgent: () => null,
  destroyChatAgent: () => null,
};

export const ChatProviderContext =
  createContext<ChatProviderState>(initialState);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentChat, setCurrentChat] = useState<ChatType>(null);
  const [currentChatAgent, setCurrentChatAgent] = useState<ChatAgentType>(null);
  const { chats, fetchChats, createChat, updateChat, destroyChat } = useChat(
    currentChatAgent?.id
  );
  const {
    chatAgents,
    fetchChatAgents,
    updateChatAgent,
    createChatAgent,
    destroyChatAgent,
  } = useChatAgent();

  useEffect(() => {
    setCurrentChat(chats[0]);
  }, [chats]);

  useEffect(() => {
    setCurrentChatAgent(chatAgents[0]);
  }, [chatAgents]);

  return (
    <ChatProviderContext.Provider
      value={{
        chats,
        fetchChats,
        currentChat,
        setCurrentChat,
        chatAgents,
        currentChatAgent,
        setCurrentChatAgent,
        createChat,
        updateChat,
        destroyChat,
        fetchChatAgents,
        updateChatAgent,
        createChatAgent,
        destroyChatAgent,
      }}
    >
      {children}
    </ChatProviderContext.Provider>
  );
};
