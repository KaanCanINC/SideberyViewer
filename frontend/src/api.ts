import axios from "axios";
import { SnapshotMeta, ParsedSnapshot } from "./types";

// Use a relative API path so nginx can proxy `/api` to the backend
const API_BASE_URL = "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function uploadSnapshot(file: File): Promise<{ id: string; time: number; created_at: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/api/snapshots", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function deleteSnapshot(id: string): Promise<void> {
  await api.delete(`/api/snapshots/${id}`);
}

export async function updateSnapshot(id: string, raw: any, time?: number): Promise<any> {
  const body = { raw, time };
  const response = await api.put(`/api/snapshots/${id}`, body);
  return response.data;
}

export async function listSnapshots(): Promise<SnapshotMeta[]> {
  const response = await api.get<SnapshotMeta[]>("/api/snapshots");
  return Array.isArray(response.data) ? response.data : [];
}

export async function getParsedSnapshot(id: string): Promise<ParsedSnapshot> {
  const response = await api.get<ParsedSnapshot>(`/api/snapshots/${id}/parsed`);
  return response.data;
}

export async function getRawSnapshot(id: string): Promise<any> {
  const response = await api.get(`/api/snapshots/${id}`);
  return response.data?.raw;
}

export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  const response = await api.get("/health");
  return response.data;
}
