import { Page } from 'puppeteer';
import { ExposedFn } from './functions/exposed.enum';
import { Chat } from './model/chat';
import { Contact } from './model/contact';
import { Message } from './model/message';
import { Id } from './model/id';

declare module WAPI {
  const waitNewMessages: (rmCallback: boolean, callback: Function) => void;
  const sendMessage: (to: string, content: string) => void;
  const ReplyMessage: (messageId: string, content: string) => void;
  const sendSeen: (to: string) => void;
  const getAllContacts: () => Contact[];
  const getAllChats: () => Chat[];
  const getAllChatsWithNewMsg: () => Chat[];
  const getAllGroups: () => Chat[];
  const getMessageById: (messageId: string) => Message;
  const getGroupParticipantIDs: (groupId: string) => Id[];
  const getContact: (contactId: string) => Contact;
  const sendContact: (to: string, contact: string | string[]) => any;
  const loadAllEarlierMessages: (chatId: string, callback: Function) => void;
  const loadEarlierMessages: (chatId: string, callback: Function) => void;
  const areAllMessagesLoaded: (chatId: string) => boolean;
  const getAllMessagesInChat: (chatId: string) => Message[];
  const getGroupMetadata: (groupId: string) => object;
  const getProfilePicFromId: (id: string, callback: Function) => void;
}

export class Whatsapp {
  constructor(public page: Page) {
    this.page = page;
  }

  /**
   * Listens to messages received
   * @returns Observable stream of messages
   */
  public onMessage(fn: (message: Message) => void) {
    this.page.exposeFunction(ExposedFn.OnMessage, (message: Message) =>
      fn(message)
    );
  }

  /**
   * Sends a text message to given chat
   * @param to chat id: xxxxx@us.c
   * @param content text message
   */
  public async sendText(to: string, content: string) {
    return await this.page.evaluate(
      ({ to, content }) => {
        WAPI.sendSeen(to);
        WAPI.sendMessage(to, content);
      },
      { to, content }
    );
  }

  /**
   * Reply to a message by the given message Id
   * @param messageId message id
   * @param content text message
   */
  public async replyMessage(messageId: string, content: string) {
    return await this.page.evaluate(
      ({ messageId, content }) => {
        WAPI.ReplyMessage(messageId, content);
      },
      { messageId, content }
    );
  }

  /**
   * Sends contact card to given chat id
   * @param {string} to 'xxxx@c.us'
   * @param {string|array} contactId 'xxxx@c.us' | ['xxxx@c.us', 'yyyy@c.us', ...]
   */
  public async sendContact(to: string, contactId: string | string[]) {
    return await this.page.evaluate(
      ({ to, contactId }) => WAPI.sendContact(to, contactId),
      { to, contactId }
    );
  }

  /**
   * Retrieves all contacts
   * @returns array of [Contact]
   */
  public async getAllContacts() {
    return await this.page.evaluate(() => WAPI.getAllContacts());
  }

  /**
   * Retrieves all chats
   * @returns array of [Chat]
   */
  public async getAllChats(withNewMessageOnly = false) {
    if (withNewMessageOnly) {
      return await this.page.evaluate(() =>
        WAPI.getAllChatsWithNewMsg()
      );
    } else {
      return await this.page.evaluate(() => WAPI.getAllChats());
    }
  }

  /**
   * Retrieve all groups
   * @returns array of groups
   */
  public async getAllGroups(withNewMessagesOnly = false) {
    if (withNewMessagesOnly) {
      // prettier-ignore
      const chats = await this.page.evaluate(() => WAPI.getAllChatsWithNewMsg());
      return chats.filter(chat => chat.isGroup);
    } else {
      const chats = await this.page.evaluate(() => WAPI.getAllChats());
      return chats.filter(chat => chat.isGroup);
    }
  }

  /**
   * Retrieves group members as [Id] objects
   * @param groupId group id
   */
  public async getGroupMembersId(groupId: string) {
    return await this.page.evaluate(
      groupId => WAPI.getGroupParticipantIDs(groupId),
      groupId
    );
  }

  /**
   * Returns group members [Contact] objects
   * @param groupId
   */
  public async getGroupMembers(groupId: string) {
    const membersIds = await this.getGroupMembersId(groupId);
    const actions = membersIds.map(memberId => {
      return this.getContact(memberId._serialized);
    });
    return await Promise.all(actions);
  }

  /**
   * Retrieves contact detail object of given contact id
   * @param groupId
   */
  public async getGroupMetadata(groupId: string) {
    return await this.page.evaluate(
      groupId => WAPI.getGroupMetadata(groupId),
      groupId
    );
  }

  /**
   * Get earlier messages in a chat by a given chat id
   * @param id chat id
   */
  public async getProfilePicFromId(id: string) {
    return await this.page.evaluateHandle(id => {
      return new Promise(resolve => {
        WAPI.getProfilePicFromId(id, (img) => {
          resolve(img);
        });
      });
    }, id);
  }

  /**
   * Retrieves contact detail object of given contact id
   * @param contactId
   * @returns contact detial as promise
   */
  public async getContact(contactId: string) {
    return await this.page.evaluate(
      contactId => WAPI.getContact(contactId),
      contactId
    );
  }

  /**
   * Retrieves message of a given message id
   * @param messageId Message id
   */
  public async getMessageById(messageId: string) {
    return await this.page.evaluate(
      messageId => WAPI.getMessageById(messageId),
      messageId
    );
  }

  /**
   * Check if all messages in a chat have been loaded
   * @param chatId Chat id
   */
  public async areAllMessagesLoaded(chatId: string) {
    return await this.page.evaluate(
      chatId => WAPI.areAllMessagesLoaded(chatId),
      chatId
    );
  }

  /**
   * Get earlier messages in a chat by a given chat id
   * @param chatId chat id
   */
  public async loadEarlierMessagesInChat(chatId: string) {
    return await this.page.evaluateHandle(chatId => {
      return new Promise(resolve => {
        WAPI.loadEarlierMessages(chatId, () => {
          resolve();
        });
      });
    }, chatId);
  }

  /**
   * Get all earlier messages in a chat by a given chat id
   * @param chatId chat id
   */
  public async loadAllEarlierMessagesInChat(chatId: string) {
    return await this.page.evaluateHandle(chatId => {
      return new Promise(resolve => {
        WAPI.loadAllEarlierMessages(chatId, () => {
          resolve();
        });
      });
    }, chatId);

  }

  /**
   * Get all messages in a chat by a given chat id
   * @param chatId chat id
   */
  public async getAllMessagesInChat(chatId: string) {
    return await this.page.evaluate(
      chatId => WAPI.getAllMessagesInChat(chatId),
      chatId
    );
  }
}



