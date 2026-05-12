import { db } from "./firebase.js";
import {
  collection,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const tableBody = document.getElementById("leaderboardBody");
const statusLine = document.getElementById("leaderboardStatus");

function getLastSolvedTime(team) {
  return team.lastSolved?.toMillis?.() || Number.MAX_SAFE_INTEGER;
}

function sortTeams(teams) {
  return teams.sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) {
      return (b.score || 0) - (a.score || 0);
    }

    return getLastSolvedTime(a) - getLastSolvedTime(b);
  });
}

function renderTeams(teams) {
  tableBody.innerHTML = "";

  if (!teams.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-row">NO TEAMS REGISTERED YET</td>
      </tr>
    `;
    return;
  }

  teams.forEach((team, index) => {
    const row = document.createElement("tr");
    const solvedNodes = Array.isArray(team.solvedNodes) ? team.solvedNodes : [];
    const lastSolved = team.lastSolved?.toDate
      ? team.lastSolved.toDate().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "--";

    row.innerHTML = `
      <td>#${index + 1}</td>
      <td>${team.teamName || "UNKNOWN TEAM"}</td>
      <td>${team.score || 0}</td>
      <td>${solvedNodes.length}/11</td>
      <td>${lastSolved}</td>
    `;
    tableBody.appendChild(row);
  });
}

onSnapshot(
  collection(db, "teams"),
  (snapshot) => {
    const teams = snapshot.docs.map((teamDoc) => ({
      id: teamDoc.id,
      ...teamDoc.data(),
    }));

    renderTeams(sortTeams(teams));
    statusLine.textContent = `LIVE SYNC :: ${teams.length} TEAMS`;
  },
  (error) => {
    statusLine.textContent = "LEADERBOARD SYNC FAILED";
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-row">CHECK FIREBASE RULES AND NETWORK ACCESS</td>
      </tr>
    `;
    console.error(error);
  },
);
