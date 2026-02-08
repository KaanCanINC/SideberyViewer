import axios from "axios";
import { SnapshotMeta, ParsedSnapshot } from "./types";

const API_BASE_URL = "http://localhost:4000";

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

export async function listSnapshots(): Promise<SnapshotMeta[]> {
  const response = await api.get<SnapshotMeta[]>("/api/snapshots");
  return Array.isArray(response.data) ? response.data : [];
}

export async function getParsedSnapshot(id: string): Promise<ParsedSnapshot> {
  const response = await api.get<ParsedSnapshot>(`/api/snapshots/${id}/parsed`);
  return response.data;
}

export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  const response = await api.get("/health");
  return response.data;
}