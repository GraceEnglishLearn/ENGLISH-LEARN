import { createContext, useEffect, useState, useContext } from "react";
import {
  AISettingsProviderContext,
  AppSettingsProviderContext,
} from "@renderer/context";
import { t } from "i18next";
import { DEFAULT_GPT_CONFIG } from "@/constants";

type CopilotProviderState = {
  active: boolean;
  setActive: (active: boolean) => void;
  currentChat: ChatType;
  setCurrentChat: (chat: ChatType) => void;
  occupiedChat: ChatType | null;
  setOccupiedChat: (chat: ChatType | null) => void;
  buildAgentMember: (agent: ChatAgentType) => ChatMemberDtoType;
};

const initialState: CopilotProviderState = {
  active: false,
  setActive: () => null,
  currentChat: null,
  setCurrentChat: () => null,
  occupiedChat: null,
  setOccupiedChat: () => null,
  buildAgentMember: () => null,
};

export const CopilotProviderContext =
  createContext<CopilotProviderState>(initialState);

const CACHE_KEY = "copilot-cached-chat";

export const CopilotProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [active, setActive] = useState(false);
  const [currentChat, setCurrentChat] = useState<ChatType>(null);
  const [occupiedChat, setOccupiedChat] = useState<ChatType | null>(null);
  const { EnjoyApp } = useContext(AppSettingsProviderContext);
  const { learningLanguage } = useContext(AppSettingsProviderContext);
  const { sttEngine, currentGptEngine, currentTtsEngine } = useContext(
    AISettingsProviderContext
  );

  const findOrCreateChat = async () => {
    const cachedChatId = await EnjoyApp.cacheObjects.get(CACHE_KEY);
    let chat: ChatType;
    if (cachedChatId && cachedChatId !== occupiedChat?.id) {
      chat = await EnjoyApp.chats.findOne({
        where: { id: cachedChatId },
      });
    } else if (occupiedChat) {
      chat = await EnjoyApp.chats.findOne({
        not: {
          id: occupiedChat.id,
        },
      });
    } else {
      chat = await EnjoyApp.chats.findOne({});
    }

    if (chat && chat.id !== occupiedChat?.id) {
      setCurrentChat(chat);
    } else {
      const agent = await findOrCreateChatAgent();
      const chat = await EnjoyApp.chats.create({
        name: t("newChat"),
        config: {
          sttEngine,
        },
        members: [buildAgentMember(agent)],
      });
      setCurrentChat(chat);
    }
  };

  const findOrCreateChatAgent = async () => {
    let agent = await EnjoyApp.chatAgents.findOne({});
    if (agent) {
      return agent;
    }

    return await EnjoyApp.chatAgents.create({
      name: t("models.chatAgent.namePlaceholder"),
      description: t("models.chatAgent.descriptionPlaceholder"),
      prompt: t("models.chatAgent.promptPlaceholder"),
    });
  };

  const buildAgentMember = (agent: ChatAgentType): ChatMemberDtoType => {
    return {
      userId: agent.id,
      userType: "ChatAgent",
      config: {
        gpt: {
          ...DEFAULT_GPT_CONFIG,
          engine: currentGptEngine.name,
          model: currentGptEngine.models.default,
        },
        tts: {
          engine: currentTtsEngine.name,
          model: currentTtsEngine.model,
          voice: currentTtsEngine.voice,
          language: learningLanguage,
        },
      },
    };
  };

  useEffect(() => {
    if (active) {
      findOrCreateChat();
    } else {
      setCurrentChat(null);
    }
  }, [active]);

  useEffect(() => {
    if (currentChat) {
      EnjoyApp.cacheObjects.set(CACHE_KEY, currentChat.id);
    }
  }, [currentChat]);

  return (
    <CopilotProviderContext.Provider
      value={{
        active,
        setActive,
        currentChat,
        setCurrentChat,
        occupiedChat,
        setOccupiedChat,
        buildAgentMember,
      }}
    >
      {children}
    </CopilotProviderContext.Provider>
  );
};
