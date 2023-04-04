const express = require("./node_modules/express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbpath = path.join(__dirname, "/cricketMatchDetails.db");
let db = null;

async function initialSetUP() {
  try {
    db = await open({
      filename: dbpath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server started at port 3000");
    });
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
}

initialSetUP();

function snakeToCamelForPlayer_Details(object) {
  return {
    playerId: object.player_id,
    playerName: object.player_name,
  };
}

function snakeToCamelForMatch_Details(object) {
  return {
    matchId: object.match_id,
    match: object.match,
    year: object.year,
  };
}

//first api

app.get("/players/", async (req, res) => {
  const query = `SELECT * FROM player_details;`;
  const list = await db.all(query);
  const newList = [];
  for (let each of list) {
    let temp = snakeToCamelForPlayer_Details(each);
    newList.push(temp);
  }
  res.send(newList);
});

//second api
app.get("/players/:playerId/", async (req, res) => {
  const { playerId } = req.params;
  const query = `SELECT * FROM player_details WHERE player_id = ${playerId};`;
  let player = await db.get(query);
  player = snakeToCamelForPlayer_Details(player);
  res.send(player);
});

//third api
app.put("/players/:playerId/", async (req, res) => {
  const { playerId } = req.params;
  const { playerName } = req.body;
  const query = `
    UPDATE player_details
SET player_name = '${playerName}'
WHERE
    player_id = ${playerId} ;`;
  await db.run(query);
  res.send("Player Details Updated");
});

//fourth api
app.get("/matches/:matchId/", async (req, res) => {
  const { matchId } = req.params;
  const query = `SELECT * FROM match_details WHERE match_id = ${matchId};`;
  let temp = await db.get(query);
  temp = snakeToCamelForMatch_Details(temp);
  res.send(temp);
});

//fifth api
app.get("/players/:playerId/matches", async (req, res) => {
  const { playerId } = req.params;
  const query = `SELECT match_details.match_id, match_details.match, match_details.year FROM 
    (match_details INNER JOIN player_match_score on
         match_details.match_id = player_match_score.match_id) WHERE 
         player_id = ${playerId};`;
  let list = await db.all(query);
  let newList = [];
  for (let each of list) {
    let temp = snakeToCamelForMatch_Details(each);
    newList.push(temp);
  }
  res.send(newList);
});

//sixth api
app.get("/matches/:matchId/players", async (req, res) => {
  const { matchId } = req.params;
  const query = `SELECT player_details.player_id, player_details.player_name FROM 
    (player_details INNER JOIN player_match_score on
         player_details.player_id = player_match_score.player_id) WHERE 
         match_id = ${matchId};`;
  let list = await db.all(query);
  let newList = [];
  for (let each of list) {
    let temp = snakeToCamelForPlayer_Details(each);
    newList.push(temp);
  }
  res.send(newList);
});

//seventh api
app.get("/players/:playerId/playerScores", async (req, res) => {
  const { playerId } = req.params;
  const query = `SELECT player_match_score.player_id, 
  player_details.player_name, SUM(score) as totalScore, 
    SUM(fours) as totalFours, SUM(sixes) as totalSixes 
    FROM (match_details INNER JOIN player_match_score
        on match_details.match_id = player_match_score.match_id) AS T
        INNER JOIN player_details on T.player_id = player_details.player_id WHERE 
        player_match_score.player_id = ${playerId} GROUP BY player_match_score.player_id;`;
  let list = await db.get(query);

  function properFormat(object) {
    return {
      playerId: object.player_id,
      playerName: object.player_name,
      totalScore: object.totalScore,
      totalFours: object.totalFours,
      totalSixes: object.totalSixes,
    };
  }
  let temp = properFormat(list);
  res.send(temp);
});

module.exports = app;
