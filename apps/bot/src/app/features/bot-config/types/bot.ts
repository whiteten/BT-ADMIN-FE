export interface Bot {
  id: string;
  botName: string;
  version: string;
  nluModel: string;
  conversationCount: number;
  registrationDate: string;
  tags?: string[];
}
