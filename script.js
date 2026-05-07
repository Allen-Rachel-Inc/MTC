const baseURL = "https://script.google.com/macros/s/AKfycbwadGUoBBT_P60-YJH8GwZnEtx-oA6SD9UfKq2enHZc2wWctvYbz__24lDGOUPDqRw/exec";

let sheets = [];
let index = 0;
let isPaused = false;
let slideInterval = null;

//////////////////////////////////////////////////////
// 🔹 INTERNET CHECK
//////////////////////////////////////////////////////
function isOnline() {
  return navigator.onLine;
}

//////////////////////////////////////////////////////
// 🔹 SAFE FETCH
//////////////////////////////////////////////////////
async function safeFetch(url) {

  try {

    const res = await fetch(url);

    if (!res.ok) {
      throw new Error("HTTP Error");
    }

    const text = await res.text();

    return JSON.parse(text);

  } catch (err) {

    console.error("❌ Fetch failed:", err);

    return null;
  }
}

//////////////////////////////////////////////////////
// 🔹 INITIAL LOAD
//////////////////////////////////////////////////////
async function getSheets() {

  if (!isOnline()) {
    setTitle("❌ No Internet");
    return;
  }

  setTitle("⏳ Loading sheets...");

  const data =
    await safeFetch(baseURL + "?list=true&ts=" + Date.now());

  if (!data || !Array.isArray(data)) {
    setTitle("⚠ Error loading sheets");
    return;
  }

  if (data.length === 0) {
    setTitle("⚠ No Bus Data Found");
    return;
  }

  sheets = data;

  index = 0;

  await loadData(sheets[index]);

  startAutoSlide();
}

//////////////////////////////////////////////////////
// 🔹 AUTO REFRESH
//////////////////////////////////////////////////////
async function refreshSheets() {

  if (!isOnline()) return;

  if (sheets.length === 0) return;

  const updated =
    await safeFetch(baseURL + "?list=true&ts=" + Date.now());

  if (!updated || !Array.isArray(updated)) return;

  // 🔥 detect changes
  if (JSON.stringify(updated) !== JSON.stringify(sheets)) {

    sheets = updated;

    if (index >= sheets.length) {
      index = 0;
    }
  }

  // 🔥 always refresh current sheet
  await loadData(sheets[index]);
}

//////////////////////////////////////////////////////
// 🔹 LOAD DATA
//////////////////////////////////////////////////////
async function loadData(sheet) {

  if (!isOnline()) {

    setTitle("❌ No Internet");

    document.getElementById("tableBody").innerHTML = "";

    return;
  }

  const [data, info] = await Promise.all([

    safeFetch(baseURL + "?sheet=" + sheet + "&ts=" + Date.now()),

    safeFetch(baseURL + "?info=" + sheet + "&ts=" + Date.now())

  ]);

  if (!data || !Array.isArray(data)) {

    console.log("⚠ Sheet not ready:", sheet);

    return;
  }

  render(sheet, data, info || {});
}

//////////////////////////////////////////////////////
// 🔹 BUILD HEADER
//////////////////////////////////////////////////////
function buildHeader(headers) {

  if (!headers || headers.length < 8) return "";

  const stop1 =
    headers[1]?.split(" ")[0] || "Stop 1";

  const stop2 =
    headers[4]?.split(" ")[0] || "Stop 2";

  return `

    <tr>
      <th rowspan="2">Trip No</th>

      <th colspan="3">${stop1}</th>

      <th colspan="3">${stop2}</th>

      <th colspan="2">Running Time</th>
    </tr>

    <tr>
      <th>IN</th>
      <th>OUT</th>
      <th>HALT</th>

      <th>IN</th>
      <th>OUT</th>
      <th>HALT</th>

      <th>ONWARD</th>
      <th>RETURN</th>
    </tr>
  `;
}

//////////////////////////////////////////////////////
// 🔹 RENDER UI
//////////////////////////////////////////////////////
function render(sheet, data, info) {

  setTitle(`

    <span>Depot : ${info.depot || "N/A"}</span>

    <span style="margin-left:30px;">
      Fleet : ${sheet}
    </span>

    <span style="margin-left:30px;">
      Route No : ${info.routeNo || "N/A"}
    </span>

    <span style="margin-left:30px;">
      Route : ${info.routeName || "N/A"}
    </span>

  `);

  //////////////////////////////////////////////////////
  // 🔹 DATE
  //////////////////////////////////////////////////////
  document.getElementById("dateHeader").innerText =

    "Date: " +

    new Date().toLocaleDateString("en-IN", {

      day: "2-digit",
      month: "long",
      year: "numeric"

    });

  //////////////////////////////////////////////////////
  // 🔹 TABLE HEADER
  //////////////////////////////////////////////////////
  document.getElementById("tableHead").innerHTML =
    buildHeader(data[0]);

  //////////////////////////////////////////////////////
  // 🔹 TABLE BODY
  //////////////////////////////////////////////////////
  let rows = "";

  for (let i = 1; i < data.length; i++) {

    rows += "<tr>";

    for (let j = 0; j < data[i].length; j++) {

      let value = data[i][j] || "";

      //////////////////////////////////////////////////
      // 🔥 TIME FIX
      //////////////////////////////////////////////////
      if (j === 1 || j === 2 || j === 4 || j === 5) {

        if (
          value === "5/7/2026, 12:00:00 am" ||
          value === "12:00:00 AM" ||
          value === "Invalid Date"
        ) {

          value = "";
        }
      }

      rows += `<td>${value}</td>`;
    }

    rows += "</tr>";
  }

  document.getElementById("tableBody").innerHTML = rows;
}

//////////////////////////////////////////////////////
// 🔹 NEXT
//////////////////////////////////////////////////////
function nextSlide() {

  if (!sheets.length) return;

  index = (index + 1) % sheets.length;

  loadData(sheets[index]);
}

//////////////////////////////////////////////////////
// 🔹 PREVIOUS
//////////////////////////////////////////////////////
function prevSlide() {

  if (!sheets.length) return;

  index =
    (index - 1 + sheets.length) % sheets.length;

  loadData(sheets[index]);
}

//////////////////////////////////////////////////////
// 🔹 AUTO SLIDE
//////////////////////////////////////////////////////
function startAutoSlide() {

  clearInterval(slideInterval);

  slideInterval = setInterval(async () => {

    if (!isPaused) {
      await nextSlide();
    }

  }, 5000);
}

//////////////////////////////////////////////////////
// 🔹 PAUSE / RESUME
//////////////////////////////////////////////////////
function togglePause() {

  isPaused = !isPaused;

  if (isPaused) {

    // ✅ STOP immediately without moving next
    clearInterval(slideInterval);

  } else {

    // ✅ restart auto slide
    startAutoSlide();
  }

  document.getElementById("pauseBtn").innerText =
    isPaused ? "Resume" : "Pause";
}

//////////////////////////////////////////////////////
// 🔹 TITLE
//////////////////////////////////////////////////////
function setTitle(text) {

  document.getElementById("sheetTitle").innerHTML =
    text;
}

//////////////////////////////////////////////////////
// 🔹 START
//////////////////////////////////////////////////////
getSheets();

//////////////////////////////////////////////////////
// 🔹 AUTO REFRESH
//////////////////////////////////////////////////////
setInterval(refreshSheets, 5000);

//////////////////////////////////////////////////////
// 🔹 NETWORK EVENTS
//////////////////////////////////////////////////////
window.addEventListener("offline", () => {

  setTitle("❌ No Internet");
});

window.addEventListener("online", () => {

  getSheets();
});