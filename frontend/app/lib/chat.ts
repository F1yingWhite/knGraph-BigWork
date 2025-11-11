import { del, get, post, put } from "./axios";
export type Message = {
  role: "user" | "assistant";
  content: string;
  isDeepThinking?: boolean; // 是否为深度思考
};

export function postChat(params: Message[]) {
  return post("/chat", { messages: params });
}

export function getHistoryLength() {
  return get("/chat/history/length");
}

export function getHistory() {
  return get("/chat/history");
}

export function getChatDetail(id: string) {
  return get("/chat/history/" + id);
}

export function deleteChat(id: string) {
  return del("/chat/history/" + id, {});
}

export function changeTitle(id: string, title: string) {
  return put("/chat/history/" + id, { title: title });
}
