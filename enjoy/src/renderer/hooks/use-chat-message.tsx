import { useEffect, useContext, useReducer } from "react";
import {
  AISettingsProviderContext,
  AppSettingsProviderContext,
  DbProviderContext,
} from "@renderer/context";
import { toast } from "@renderer/components/ui";
import { chatMessagesReducer } from "@renderer/reducers";
import { ChatOpenAI } from "@langchain/openai";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { BufferMemory, ChatMessageHistory } from "langchain/memory";
import { ConversationChain } from "langchain/chains";
import { LLMResult } from "@langchain/core/outputs";
import { CHAT_GROUP_PROMPT_TEMPLATE } from "@/constants";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Mustache from "mustache";
import { t } from "i18next";

dayjs.extend(relativeTime);

export const useChatMessage = (chat: ChatType) => {
  const { EnjoyApp, user, apiUrl } = useContext(AppSettingsProviderContext);
  const { openai } = useContext(AISettingsProviderContext);
  const { addDblistener, removeDbListener } = useContext(DbProviderContext);
  const [chatMessages, dispatchChatMessages] = useReducer(
    chatMessagesReducer,
    []
  );

  const fetchChatMessages = async (query?: string) => {
    if (!chat?.id) return;

    return EnjoyApp.chatMessages
      .findAll({ where: { chatId: chat.id }, query })
      .then((data) => {
        dispatchChatMessages({ type: "set", records: data });
        return data;
      })
      .catch((error) => {
        toast.error(error.message);
      });
  };

  const onCreateUserMessage = (content: string, recordingUrl?: string) => {
    if (!content) return;

    return EnjoyApp.chatMessages
      .create({
        chatId: chat.id,
        memberId: chat.members.find((m) => m.userType === "User").id,
        content,
        state: "pending",
        recordingUrl,
      })
      .then((message) => {
        dispatchChatMessages({ type: "append", record: message });
        return message;
      })
      .catch((error) => {
        toast.error(error.message);
      });
  };

  const onUpdateMessage = (id: string, data: ChatMessageDtoType) => {
    return EnjoyApp.chatMessages.update(id, data);
  };

  const onDeleteMessage = async (chatMessageId: string) => {
    return EnjoyApp.chatMessages
      .destroy(chatMessageId)
      .then(() =>
        dispatchChatMessages({
          type: "remove",
          record: { id: chatMessageId } as ChatMessageType,
        })
      )
      .catch((error) => {
        toast.error(error.message);
      });
  };

  const onChatMessageRecordUpdate = (event: CustomEvent) => {
    const { model, action, record } = event.detail;
    if (model === "ChatMessage") {
      switch (action) {
        case "update":
          dispatchChatMessages({ type: "update", record });
          break;
        case "destroy":
          dispatchChatMessages({ type: "remove", record });
          break;
      }
    } else if (model === "Recording") {
      switch (action) {
        case "create":
          dispatchChatMessages({
            type: "update",
            record: {
              id: record.targetId,
              recording: record,
            } as ChatMessageType,
          });
          break;
      }
    }
  };

  const invokeAgent = async (member: ChatMemberType) => {
    if (chat.type === "conversation") {
      return askAgentInConversation(member);
    } else if (chat.type === "group") {
      return askAgentInGroup(member);
    }
  };

  const askAgentInConversation = async (member: ChatMemberType) => {
    const pendingMessage = chatMessages.find(
      (m) => m.member.user && m.state === "pending"
    );
    if (!pendingMessage) return;

    const llm = buildLlm(member);
    const historyBufferSize = member.config.gpt.historyBufferSize || 10;
    const messages = chatMessages
      .filter((m) => m.state === "completed")
      .slice(-historyBufferSize);
    const chatHistory = new ChatMessageHistory();
    messages.forEach((message) => {
      if (message.member.userType === "User") {
        chatHistory.addUserMessage(message.content);
      } else if (message.member.userType === "ChatAgent") {
        chatHistory.addAIMessage(message.content);
      }
    });

    const memory = new BufferMemory({
      chatHistory,
      memoryKey: "history",
      returnMessages: true,
    });
    const prompt = ChatPromptTemplate.fromMessages([
      ["system" as MessageRoleEnum, buildSystemPrompt(member)],
      new MessagesPlaceholder("history"),
      ["human", "{input}"],
    ]);
    const chain = new ConversationChain({
      llm: llm as any,
      memory,
      prompt: prompt as any,
      verbose: true,
    });
    let response: LLMResult["generations"][0] = [];
    await chain.call({ input: pendingMessage.content }, [
      {
        handleLLMEnd: async (output) => {
          response = output.generations[0];
        },
      },
    ]);
    for (const r of response) {
      const reply = await EnjoyApp.chatMessages.create({
        chatId: chat.id,
        memberId: member.id,
        content: r.text,
        state: "completed",
      });
      dispatchChatMessages({ type: "append", record: reply });
    }
    onUpdateMessage(pendingMessage.id, { state: "completed" });
  };

  const askAgentInGroup = async (member: ChatMemberType) => {
    const pendingMessage = chatMessages.find(
      (m) => m.member.user && m.state === "pending"
    );

    const llm = buildLlm(member);
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", buildSystemPrompt(member)],
      ["user", CHAT_GROUP_PROMPT_TEMPLATE],
    ]);
    const chain = prompt.pipe(llm);
    const historyBufferSize = member.config.gpt.historyBufferSize || 10;
    const history = chatMessages
      .slice(-historyBufferSize)
      .map(
        (message) =>
          `- ${message.member.name}: ${message.content}(${dayjs(
            message.createdAt
          ).fromNow()})`
      )
      .join("\n");

    const reply = await chain.invoke({
      name: member.agent.name,
      history,
    });

    // the reply may contain the member's name like "ChatAgent: xxx". We need to remove it.
    const content = reply.content
      .toString()
      .replace(new RegExp(`^(${member.agent.name}):`), "")
      .trim();

    const message = await EnjoyApp.chatMessages.create({
      chatId: chat.id,
      memberId: member.id,
      content,
      state: "completed",
    });
    dispatchChatMessages({ type: "append", record: message });
    if (pendingMessage) {
      onUpdateMessage(pendingMessage.id, { state: "completed" });
    }

    return message;
  };

  const buildLlm = (member: ChatMemberType) => {
    const {
      engine = "enjoyai",
      model = "gpt-4o",
      temperature,
      maxCompletionTokens,
      frequencyPenalty,
      presencePenalty,
      numberOfChoices,
    } = member.config.gpt;

    if (engine === "enjoyai") {
      if (!user.accessToken) {
        throw new Error(t("authorizationExpired"));
      }

      return new ChatOpenAI({
        openAIApiKey: user.accessToken,
        configuration: {
          baseURL: `${apiUrl}/api/ai`,
        },
        maxRetries: 0,
        modelName: model,
        temperature,
        maxTokens: maxCompletionTokens,
        frequencyPenalty,
        presencePenalty,
        n: numberOfChoices,
      });
    } else if (engine === "openai") {
      if (!openai.key) {
        throw new Error(t("openaiKeyRequired"));
      }

      return new ChatOpenAI({
        openAIApiKey: openai.key,
        configuration: {
          baseURL: openai.baseUrl,
        },
        maxRetries: 0,
        modelName: model,
        temperature,
        maxTokens: maxCompletionTokens,
        frequencyPenalty,
        presencePenalty,
        n: numberOfChoices,
      });
    } else {
      throw new Error(t("aiEngineNotSupported"));
    }
  };

  const buildSystemPrompt = (member: ChatMemberType) => {
    return Mustache.render(
      `{{{agent_prompt}}}
      {{{chat_prompt}}}
      {{{member_prompt}}}`,
      {
        agent_prompt: member.agent.prompt,
        chat_prompt: chat.config.prompt,
        member_prompt: member.config.prompt,
      }
    );
  };

  useEffect(() => {
    if (!chat) return;

    addDblistener(onChatMessageRecordUpdate);
    fetchChatMessages();
    return () => {
      removeDbListener(onChatMessageRecordUpdate);
    };
  }, [chat]);

  return {
    chatMessages,
    fetchChatMessages,
    dispatchChatMessages,
    onCreateUserMessage,
    onUpdateMessage,
    onDeleteMessage,
    invokeAgent,
  };
};
