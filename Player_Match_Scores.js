const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')

const app = express()
app.use(express.json())

const databasePath = path.join(__dirname, 'cricketMatchDetails.db')
let database = null

// ------------------ INIT ------------------

const initializeDBAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })

    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}

initializeDBAndServer()

// ------------------ MAPPERS ------------------

const convertPlayerObject = dbObject => ({
  playerId: dbObject.player_id,
  playerName: dbObject.player_name,
})

const convertMatchObject = dbObject => ({
  matchId: dbObject.match_id,
  match: dbObject.match,
  year: dbObject.year,
})

// ------------------ API 1 ------------------

app.get('/players/', async (request, response) => {
  const query = `SELECT * FROM player_details;`
  const data = await database.all(query)
  response.send(data.map(convertPlayerObject))
})

// ------------------ API 2 ------------------

app.get('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params

  const query = `
    SELECT * FROM player_details 
    WHERE player_id = ${playerId};
  `

  const data = await database.get(query)
  response.send(convertPlayerObject(data))
})

// ------------------ API 3 ------------------

app.put('/players/:playerId/', async (request, response) => {
  const {playerId} = request.params
  const {playerName} = request.body

  const query = `
    UPDATE player_details
    SET player_name = '${playerName}'
    WHERE player_id = ${playerId};
  `

  await database.run(query)
  response.send('Player Details Updated')
})

// ------------------ API 4 ------------------

app.get('/matches/:matchId/', async (request, response) => {
  const {matchId} = request.params

  const query = `
    SELECT * FROM match_details 
    WHERE match_id = ${matchId};
  `

  const data = await database.get(query)
  response.send(convertMatchObject(data))
})

// ------------------ API 5 ------------------

app.get('/players/:playerId/matches', async (request, response) => {
  const {playerId} = request.params

  const query = `
    SELECT 
      match_details.match_id AS matchId,
      match_details.match,
      match_details.year
    FROM player_match_score
    JOIN match_details 
    ON player_match_score.match_id = match_details.match_id
    WHERE player_match_score.player_id = ${playerId};
  `

  const data = await database.all(query)
  response.send(data)
})

// ------------------ API 6 ------------------

app.get('/matches/:matchId/players', async (request, response) => {
  const {matchId} = request.params

  const query = `
    SELECT 
      player_details.player_id AS playerId,
      player_details.player_name AS playerName
    FROM player_match_score
    JOIN player_details 
    ON player_match_score.player_id = player_details.player_id
    WHERE player_match_score.match_id = ${matchId};
  `

  const data = await database.all(query)
  response.send(data)
})

// ------------------ API 7 ------------------

app.get('/players/:playerId/playerScores', async (request, response) => {
  const {playerId} = request.params

  const query = `
    SELECT 
      player_details.player_id AS playerId,
      player_details.player_name AS playerName,
      SUM(score) AS totalScore,
      SUM(fours) AS totalFours,
      SUM(sixes) AS totalSixes
    FROM player_match_score
    JOIN player_details 
    ON player_match_score.player_id = player_details.player_id
    WHERE player_match_score.player_id = ${playerId};
  `

  const data = await database.get(query)
  response.send(data)
})

// ------------------ EXPORT ------------------

module.exports = app
