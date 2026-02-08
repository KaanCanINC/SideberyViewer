"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.insertSnapshot = insertSnapshot;
exports.listSnapshots = listSnapshots;
exports.getSnapshotById = getSnapshotById;
exports.deleteSnapshotById = deleteSnapshotById;
exports.closeDatabase = closeDatabase;
const sqlite3_1 = __importDefault(require("sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dataDir = path_1.default.resolve("data");
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
const sqlite = sqlite3_1.default.verbose();
const db = new sqlite.Database(path_1.default.join(dataDir, "snapshots.db"));
const runAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err)
            reject(err);
        else
            resolve();
    });
});
const getAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err)
            reject(err);
        else
            resolve(row);
    });
});
const allAsync = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err)
            reject(err);
        else
            resolve(rows);
    });
});
async function initDatabase() {
    await runAsync(`CREATE TABLE IF NOT EXISTS snapshots (
      id TEXT PRIMARY KEY,
      time INTEGER,
      rawJson TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`);
}
async function insertSnapshot(id, time, rawJson, created_at) {
    await runAsync("INSERT OR REPLACE INTO snapshots (id, time, rawJson, created_at) VALUES (?, ?, ?, ?)", [id, time, rawJson, created_at]);
}
async function listSnapshots() {
    const rows = await allAsync("SELECT id, time, created_at FROM snapshots ORDER BY created_at DESC", []);
    return rows;
}
async function getSnapshotById(id) {
    const row = await getAsync("SELECT id, time, rawJson, created_at FROM snapshots WHERE id = ?", [id]);
    return row || null;
}
async function deleteSnapshotById(id) {
    await runAsync("DELETE FROM snapshots WHERE id = ?", [id]);
}
function closeDatabase() {
    db.close();
}
//# sourceMappingURL=database.js.map