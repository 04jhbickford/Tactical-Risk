// Browser-only wiring. Do not import from Node tests (CDN Firebase).
import {
  addDoc,
  collection,
  getCountFromServer,
  getDocs,
  query,
  orderBy,
  limit,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getFirebaseDb } from '../multiplayer/firebase.js';
import { attachCloudEventSink, bindEventLogContext } from './eventLog.js';
import { createCloudEventSink } from './cloudEventSink.js';

export function bindBrowserGameLog({
  gameId,
  joinCode = null,
  lobbyName = null,
  gameState = null,
} = {}) {
  bindEventLogContext({
    gameId,
    joinCode,
    lobbyName,
    turn: () => gameState?.round ?? null,
    turnPhase: () => gameState?.turnPhase ?? null,
    playerId: () => gameState?.currentPlayer?.id ?? null,
  });
  const db = getFirebaseDb();
  attachCloudEventSink(createCloudEventSink({
    db,
    gameId,
    addDoc,
    collection,
    getCountFromServer,
    getDocs,
    query,
    orderBy,
    limit,
    writeBatch,
  }));
}
