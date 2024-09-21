import { ipcMain, IpcMainEvent } from "electron";
import { Chat, ChatAgent, ChatMember, UserSetting } from "@main/db/models";
import { FindOptions, WhereOptions, Attributes, Op } from "sequelize";
import log from "@main/logger";
import { t } from "i18next";
import db from "@main/db";
import { UserSettingKeyEnum } from "@/types/enums";

const logger = log.scope("db/handlers/chats-handler");

class ChatsHandler {
  private async findAll(
    _event: IpcMainEvent,
    options: FindOptions<Attributes<Chat>> & {
      query?: string;
      chatAgentId?: string;
    }
  ) {
    const { query, where = {}, chatAgentId } = options || {};
    delete options.query;
    delete options.where;
    delete options.chatAgentId;

    if (query) {
      (where as any).name = {
        [Op.like]: `%${query}%`,
      };
    }

    let chatIds;
    if (chatAgentId) {
      const chatMembers = await ChatMember.findAll({
        where: {
          userId: chatAgentId,
          userType: "Agent",
        },
      });
      chatIds = chatMembers.map((member) => member.chatId);

      (where as any)["id"] = {
        [Op.in]: chatIds,
      };
    }

    const chats = await Chat.findAll({
      order: [["updatedAt", "DESC"]],
      where,
      ...options,
    });

    if (!chats) {
      return [];
    }
    return chats.map((chat) => chat.toJSON());
  }

  private async findOne(
    _event: IpcMainEvent,
    options: FindOptions<Attributes<Chat>> & {
      where: WhereOptions<Attributes<Chat>>;
    }
  ) {
    const chat = await Chat.findOne(options);
    if (!chat) {
      return null;
    }
    return chat.toJSON();
  }

  private async create(_event: IpcMainEvent, data: ChatDtoType) {
    const { members, ...chatData } = data;
    if (!members || members.length === 0) {
      throw new Error(t("models.chats.membersRequired"));
    }

    const transaction = await db.connection.transaction();
    if (!chatData.config?.sttEngine) {
      chatData.config.sttEngine = (await UserSetting.get(
        UserSettingKeyEnum.STT_ENGINE
      )) as string;
    }
    const chat = await Chat.create(chatData, {
      transaction,
    });
    if (members.findIndex((m) => m.userType === "User") < 0) {
      members.push({
        userId: (
          await UserSetting.get(UserSettingKeyEnum.PROFILE)
        ).id.toString(),
        userType: "User",
        config: {
          language: (
            await UserSetting.get(UserSettingKeyEnum.NATIVE_LANGUAGE)
          ).toString(),
        },
      });
    }
    for (const member of members) {
      await ChatMember.create(
        {
          chatId: chat.id,
          ...member,
        },
        {
          include: [Chat],
          transaction,
        }
      );
    }
    await transaction.commit();
    await chat.reload();

    return chat.toJSON();
  }

  private async update(_event: IpcMainEvent, id: string, data: ChatDtoType) {
    const { members, ...chatData } = data;
    if (!members || members.length === 0) {
      throw new Error(t("models.chats.membersRequired"));
    }
    const chat = await Chat.findOne({
      where: { id },
    });
    if (!chat) {
      throw new Error(t("models.chats.notFound"));
    }

    const transaction = await db.connection.transaction();
    await chat.update(chatData, { transaction });

    // Remove members
    for (const member of chat.members) {
      if (member.userType === "User") continue;
      if (members.findIndex((m) => m.userId === member.userId) < 0) {
        await member.destroy({ transaction });
      }
    }

    // Add or update members
    for (const member of members) {
      const chatMember = chat.members.find((m) => m.userId === member.userId);

      if (chatMember) {
        await chatMember.update(member, { transaction });
      } else {
        await ChatMember.create(
          {
            chatId: chat.id,
            ...member,
          },
          {
            include: [Chat],
            transaction,
          }
        );
      }
    }

    await transaction.commit();
    await chat.reload({
      include: [
        {
          association: Chat.associations.members,
          include: [
            {
              association: ChatMember.associations.agent,
            },
          ],
        },
      ],
    });

    return chat.toJSON();
  }

  private async destroy(_event: IpcMainEvent, id: string) {
    const chat = await Chat.findOne({
      where: { id },
    });
    if (!chat) {
      throw new Error(t("models.chats.notFound"));
    }

    await chat.destroy();

    return chat.toJSON();
  }

  register() {
    ipcMain.handle("chats-find-all", this.findAll);
    ipcMain.handle("chats-find-one", this.findOne);
    ipcMain.handle("chats-create", this.create);
    ipcMain.handle("chats-update", this.update);
    ipcMain.handle("chats-destroy", this.destroy);
  }

  unregister() {
    ipcMain.removeHandler("chats-find-all");
    ipcMain.removeHandler("chats-find-one");
    ipcMain.removeHandler("chats-create");
    ipcMain.removeHandler("chats-update");
    ipcMain.removeHandler("chats-destroy");
  }
}

export const chatsHandler = new ChatsHandler();
