import {
  AfterUpdate,
  AfterDestroy,
  BeforeDestroy,
  BelongsTo,
  Table,
  Column,
  Default,
  IsUUID,
  Model,
  DataType,
  AfterCreate,
  AllowNull,
  Scopes,
} from "sequelize-typescript";
import log from "@main/logger";
import { Chat, ChatAgent, ChatMessage } from "@main/db/models";
import mainWindow from "@main/window";

const logger = log.scope("db/models/chat-member");
@Table({
  modelName: "ChatMember",
  tableName: "chat_members",
  underscored: true,
  timestamps: true,
})
@Scopes(() => ({
  defaultScope: {
    include: [
      {
        association: "agent",
        model: ChatAgent,
        required: false,
      },
    ],
  },
}))
export class ChatMember extends Model<ChatMember> {
  @IsUUID("all")
  @Default(DataType.UUIDV4)
  @Column({ primaryKey: true, type: DataType.UUID })
  id: string;

  @AllowNull(false)
  @Column(DataType.UUID)
  chatId: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  userId: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  userType: string;

  @Column(DataType.JSON)
  config: any;

  @BelongsTo(() => Chat, {
    foreignKey: "chatId",
  })
  chat: Chat;

  @BelongsTo(() => ChatAgent, {
    foreignKey: "userId",
  })
  agent: ChatAgent;

  @Column(DataType.VIRTUAL)
  get name(): string {
    return this.agent?.name;
  }

  @AfterCreate
  static async updateChats(member: ChatMember) {
    const agent = await ChatAgent.findByPk(member.userId);
    if (agent) {
      agent.changed("updatedAt", true);
      agent.update({ updatedAt: new Date() }, { hooks: false });
    }

    const chat = await Chat.findByPk(member.chatId);
    if (chat) {
      chat.changed("updatedAt", true);
      chat.update({ updatedAt: new Date() }, { hooks: false });
    }
  }

  @AfterCreate
  static async chatSystemAddedMessage(member: ChatMember) {
    const chatAgent = await ChatAgent.findByPk(member.userId);
    ChatMessage.create({
      chatId: member.chatId,
      content: `${chatAgent.name} has joined the chat.`,
      role: "SYSTEM",
    });
  }

  @AfterDestroy
  static async destroyMessages(member: ChatMember) {
    ChatMessage.destroy({ where: { memberId: member.id }, hooks: false });
  }

  @AfterCreate
  static notifyForCreate(member: ChatMember) {
    this.notify(member, "create");
  }

  @AfterUpdate
  static notifyForUpdate(member: ChatMember) {
    this.notify(member, "update");
  }

  @AfterDestroy
  static notifyForDestroy(member: ChatMember) {
    this.notify(member, "destroy");
  }

  static async notify(
    member: ChatMember,
    action: "create" | "update" | "destroy"
  ) {
    if (!mainWindow.win) return;

    if (action !== "destroy" && !member.agent) {
      await member.reload();
    }
    mainWindow.win.webContents.send("db-on-transaction", {
      model: "ChatMember",
      id: member.id,
      action,
      record: member.toJSON(),
    });
  }
}
