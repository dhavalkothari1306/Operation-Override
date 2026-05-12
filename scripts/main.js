import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const flags = {
  node01: "127.0.0.1",
  node02: "ENCRYPTION",
  node03: "VORTEX_FALLS",
  node04: "HACKED",
  node05: "PROTOCOL",
  node06: "HASH",
  node07: "01",
  node08: "you_read_the_source",
  node09: "crawlers_cant_hide_secrets",
  node10: "BRUTEFORCE",
  node11: "VORTEX",
};

const NODE_IDS = Object.keys(flags);
const POINTS_PER_NODE = 100;
const TEAM_NAME_KEY = "operationOverrideTeamName";
const TEAM_ID_KEY = "operationOverrideTeamId";
const SOLVED_KEY = "operationOverrideSolvedNodes";

function getTeamName() {
  return localStorage.getItem(TEAM_NAME_KEY);
}

function getTeamId() {
  return localStorage.getItem(TEAM_ID_KEY);
}

function makeTeamId(teamName) {
  return encodeURIComponent(teamName.trim().toLowerCase());
}

function getSolvedNodes() {
  try {
    return JSON.parse(localStorage.getItem(SOLVED_KEY)) || [];
  } catch {
    return [];
  }
}

function saveSolvedNode(nodeId) {
  const solved = new Set(getSolvedNodes());
  solved.add(nodeId);
  localStorage.setItem(SOLVED_KEY, JSON.stringify([...solved]));
}

function injectTeamStyles() {
  if (document.getElementById("team-system-styles")) return;

  const style = document.createElement("style");
  style.id = "team-system-styles";
  style.textContent = `
    .team-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: grid;
      place-items: center;
      padding: 24px;
      background: rgba(2, 4, 12, 0.9);
      backdrop-filter: blur(8px);
      font-family: "Share Tech Mono", "Rajdhani", monospace;
    }

    .team-modal {
      width: min(420px, 100%);
      border: 1px solid #00f5ff;
      box-shadow: 0 0 28px rgba(0, 245, 255, 0.35);
      background: #050712;
      color: #e8fbff;
      padding: 24px;
    }

    .team-modal h2 {
      margin: 0 0 10px;
      color: #00f5ff;
      letter-spacing: 0;
    }

    .team-modal p {
      margin: 0 0 18px;
      color: #a8b7c7;
      line-height: 1.45;
    }

    .team-modal input,
    .flag-section input {
      box-sizing: border-box;
      width: 100%;
      border: 1px solid #00f5ff;
      background: #070b18;
      color: #e8fbff;
      padding: 12px;
      font: inherit;
    }

    .team-modal button,
    .flag-section button,
    .final-override-btn {
      border: 1px solid #ff2bd6;
      background: #ff2bd6;
      color: #050712;
      cursor: pointer;
      font: inherit;
      font-weight: 700;
      padding: 12px 16px;
      margin-top: 12px;
    }

    .team-modal button:hover,
    .flag-section button:hover,
    .final-override-btn:hover {
      box-shadow: 0 0 18px rgba(255, 43, 214, 0.45);
    }

    .flag-section button:disabled,
    .final-override-btn[aria-disabled="true"] {
      cursor: not-allowed;
      opacity: 0.55;
      box-shadow: none;
    }

    .flag-message {
      margin-top: 12px;
      color: #00f5ff;
      min-height: 1.4em;
      font-family: "Share Tech Mono", monospace;
    }

    .flag-message.error {
      color: #ff4d6d;
    }

    .team-badge {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 20;
      border: 1px solid rgba(0, 245, 255, 0.55);
      background: rgba(5, 7, 18, 0.88);
      color: #00f5ff;
      padding: 8px 10px;
      font-family: "Share Tech Mono", monospace;
      font-size: 13px;
    }
  `;
  document.head.appendChild(style);
}

function askForTeamName() {
  return new Promise((resolve) => {
    const backdrop = document.createElement("div");
    backdrop.className = "team-modal-backdrop";
    backdrop.innerHTML = `
      <form class="team-modal">
        <h2>REGISTER STRIKE UNIT</h2>
        <p>Enter your team name once. It will follow you across all nodes on this browser.</p>
        <input id="teamNameInput" type="text" maxlength="40" placeholder="TEAM NAME" required autocomplete="off">
        <button type="submit">SYNC TEAM</button>
      </form>
    `;

    document.body.appendChild(backdrop);
    const input = backdrop.querySelector("#teamNameInput");
    input.focus();

    backdrop.querySelector("form").addEventListener("submit", (event) => {
      event.preventDefault();
      const teamName = input.value.trim();
      if (!teamName) return;

      localStorage.setItem(TEAM_NAME_KEY, teamName);
      localStorage.setItem(TEAM_ID_KEY, makeTeamId(teamName));
      backdrop.remove();
      resolve(teamName);
    });
  });
}

async function ensureTeamRegistration() {
  injectTeamStyles();

  let teamName = getTeamName();
  if (!teamName) {
    teamName = await askForTeamName();
  }

  const teamId = getTeamId() || makeTeamId(teamName);
  localStorage.setItem(TEAM_ID_KEY, teamId);

  const teamRef = doc(db, "teams", teamId);
  const existingTeam = await getDoc(teamRef);

  if (!existingTeam.exists()) {
    await setDoc(teamRef, {
      teamName,
      score: 0,
      solvedNodes: [],
      lastSolved: null,
    });
  } else if (existingTeam.data().teamName !== teamName) {
    await setDoc(teamRef, { teamName }, { merge: true });
  }

  showTeamBadge(teamName);
  return { teamName, teamId };
}

function showTeamBadge(teamName) {
  if (document.querySelector(".team-badge")) return;

  const badge = document.createElement("div");
  badge.className = "team-badge";
  badge.textContent = `TEAM :: ${teamName}`;
  document.body.appendChild(badge);
}

function getFlagMessage() {
  let message = document.getElementById("flagMessage");
  if (!message) {
    message = document.createElement("div");
    message.id = "flagMessage";
    message.className = "flag-message";
    document.querySelector(".flag-section")?.appendChild(message);
  }
  return message;
}

function setFlagMessage(text, isError = false) {
  const message = getFlagMessage();
  if (!message) return;

  message.textContent = text;
  message.classList.toggle("error", isError);
}

function updateNodePageState() {
  const input = document.getElementById("flagInput");
  const button = document.querySelector(".flag-section button");
  const nodeId = button?.getAttribute("onclick")?.match(/'(node\d+)'/)?.[1];

  if (!input || !button || !nodeId) return;

  if (getSolvedNodes().includes(nodeId)) {
    input.disabled = true;
    button.disabled = true;
    setFlagMessage("FRAGMENT ALREADY RECOVERED");
  }
}

async function updateTeamProgress(nodeId) {
  const teamName = getTeamName();
  const teamId = getTeamId();
  const teamRef = doc(db, "teams", teamId);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(teamRef);
    const current = snapshot.exists() ? snapshot.data() : {};
    const solvedNodes = Array.isArray(current.solvedNodes)
      ? current.solvedNodes
      : [];

    if (solvedNodes.includes(nodeId)) {
      return false;
    }

    const nextSolvedNodes = [...solvedNodes, nodeId].sort();

    transaction.set(
      teamRef,
      {
        teamName,
        score: nextSolvedNodes.length * POINTS_PER_NODE,
        solvedNodes: nextSolvedNodes,
        lastSolved: serverTimestamp(),
      },
      { merge: true },
    );

    return true;
  });
}

function updateFinalOverrideUnlock() {
  const overridePanel = document.querySelector("#win .override-key");
  if (!overridePanel || document.getElementById("finalOverrideButton")) return;

  const solvedCount = getSolvedNodes().length;
  const unlocked = solvedCount >= NODE_IDS.length;
  const button = document.createElement("a");
  button.id = "finalOverrideButton";
  button.className = "final-override-btn";
  button.href = unlocked ? "nodes/node11.html" : "#nodes";
  button.setAttribute("aria-disabled", String(!unlocked));
  button.textContent = unlocked
    ? "EXECUTE FINAL OVERRIDE"
    : `FINAL OVERRIDE LOCKED :: ${solvedCount}/${NODE_IDS.length}`;

  if (!unlocked) {
    button.addEventListener("click", (event) => event.preventDefault());
  }

  overridePanel.appendChild(button);
}

function markSolvedNodeLinks() {
  const solved = new Set(getSolvedNodes());

  document.querySelectorAll(".solve-btn").forEach((link) => {
    const match = link.getAttribute("href")?.match(/node(\d+)\.html/);
    if (!match) return;

    const nodeId = `node${match[1].padStart(2, "0")}`;
    if (solved.has(nodeId)) {
      link.textContent = "✓ FRAGMENT RECOVERED";
      link.classList.add("node-solved");
    }
  });
}

async function validateFlag(nodeId) {
  await ensureTeamRegistration();

  const input = document.getElementById("flagInput");
  const button = document.querySelector(".flag-section button");
  const expectedFlag = flags[nodeId];
  const submittedFlag = input?.value.trim();

  if (!input || !button || !expectedFlag) {
    setFlagMessage("NODE CONFIGURATION ERROR", true);
    return;
  }

  if (getSolvedNodes().includes(nodeId)) {
    input.disabled = true;
    button.disabled = true;
    setFlagMessage("FRAGMENT ALREADY RECOVERED");
    return;
  }

  if (submittedFlag !== expectedFlag) {
    setFlagMessage("ACCESS DENIED :: INVALID FRAGMENT", true);
    return;
  }

  button.disabled = true;
  setFlagMessage("VALIDATING FRAGMENT...");

  try {
    const added = await updateTeamProgress(nodeId);
    saveSolvedNode(nodeId);
    input.disabled = true;
    setFlagMessage(
      added
        ? "FRAGMENT RECOVERED :: SCORE SYNCED"
        : "FRAGMENT ALREADY RECOVERED",
    );
  } catch (error) {
    button.disabled = false;
    setFlagMessage("FIRESTORE SYNC FAILED :: TRY AGAIN", true);
    console.error(error);
  }
}

window.validateFlag = validateFlag;
window.operationOverrideFlags = flags;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await ensureTeamRegistration();
    updateNodePageState();
    updateFinalOverrideUnlock();
    markSolvedNodeLinks();
  } catch (error) {
    console.error(error);
  }
});
