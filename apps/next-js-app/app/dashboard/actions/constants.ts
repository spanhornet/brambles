// Types

export interface Message {
  Id: string;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt?: string | null;
  ChatId: string;
  Model: string;
  Role: string;
  Content: string;
}

export interface Chat {
  ID: string;
  UserId: string;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt?: string | null;
  Name: string;
  Messages: Message[];
}
