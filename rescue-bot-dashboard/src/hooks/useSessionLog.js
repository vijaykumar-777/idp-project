import { openDB } from 'idb';
import { useState, useEffect, useCallback } from 'react';

const DB_NAME = 'RescueBotDB';
const STORE_NAME = 'AlertSessions';

export function useSessionLog() {
  const [logs, setLogs] = useState([]);

  // Initialize DB and load logs
  useEffect(() => {
    async function initDB() {
      const db = await openDB(DB_NAME, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, {
              keyPath: 'id',
              autoIncrement: true,
            });
            store.createIndex('timestamp', 'timestamp');
          }
        },
      });

      const allLogs = await db.getAllFromIndex(STORE_NAME, 'timestamp');
      setLogs(allLogs.reverse()); // latest first
    }
    initDB();
  }, []);

  const addLog = useCallback(async (logEntry) => {
    const db = await openDB(DB_NAME, 1);
    const id = await db.add(STORE_NAME, {
      ...logEntry,
      timestamp: Date.now(),
    });
    setLogs((prev) => [{ id, ...logEntry, timestamp: Date.now() }, ...prev]);
  }, []);

  const clearLogs = useCallback(async () => {
    const db = await openDB(DB_NAME, 1);
    await db.clear(STORE_NAME);
    setLogs([]);
  }, []);

  return { logs, addLog, clearLogs };
}
